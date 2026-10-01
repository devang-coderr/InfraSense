"""
Evidence service — Location and Capture-Time Evidence Verification.

Extracts EXIF metadata from raw image bytes and compares device-reported
capture data against original EXIF data to determine location and time
consistency.

Design principles:
- Evidence consistency states only: "match", "mismatch", "unavailable".
- No subjective "fake" or "fraud" judgments.
- Graceful recovery: normal images without EXIF remain fully valid.
"""
from datetime import datetime, timezone, timedelta
import io
import logging
from typing import Any, Optional, Tuple

from PIL import Image, ExifTags

from app.core.config import settings
from app.services.gis_service import haversine_meters

logger = logging.getLogger("infrasense.services.evidence")


def _dms_to_decimal(dms_values: Any, ref: Optional[str]) -> Optional[float]:
    """
    Converts EXIF DMS (Degrees, Minutes, Seconds) tuples or IFDRational numbers to decimal degrees.
    """
    if not dms_values:
        return None

    try:
        # Extract components (handles tuples, lists, IFDRationals)
        deg = float(dms_values[0])
        minute = float(dms_values[1])
        sec = float(dms_values[2])
        decimal = deg + (minute / 60.0) + (sec / 3600.0)

        if ref and str(ref).upper() in ["S", "W"]:
            decimal = -decimal
        return round(decimal, 6)
    except Exception as exc:
        logger.debug(f"Failed to convert DMS to decimal: {exc}")
        return None


def _parse_exif_datetime(dt_str: Any, offset_str: Optional[str] = None) -> Optional[datetime]:
    """
    Parses EXIF timestamp strings (e.g. 'YYYY:MM:DD HH:MM:SS' or ISO 8601) and optional
    timezone offset (e.g. '+05:30') into a datetime object.
    
    If the string contains timezone information (e.g. ISO 8601 with offset/Z or EXIF with offset),
    the returned datetime is timezone-aware.
    If no timezone info is provided, returns a naive datetime representing local wall-clock time.
    """
    if not dt_str or not isinstance(dt_str, str):
        return None

    cleaned = dt_str.strip().rstrip("\x00")
    if not cleaned:
        return None

    # If offset_str is provided (e.g. "+05:30"), attach it if not already in cleaned
    if offset_str and isinstance(offset_str, str):
        clean_offset = offset_str.strip().rstrip("\x00")
        if clean_offset and not (cleaned.endswith("Z") or "+" in cleaned[10:] or "-" in cleaned[10:]):
            cleaned = f"{cleaned}{clean_offset}"

    # Try standard Python fromisoformat first (handles ISO 8601 with Z, +05:30, fractions, etc.)
    try:
        # Handle colons in EXIF date portion: '2026:09:28 13:25:00' -> '2026-09-28 13:25:00'
        iso_candidate = cleaned
        if len(iso_candidate) >= 10 and iso_candidate[4] == ":" and iso_candidate[7] == ":":
            iso_candidate = iso_candidate[:4] + "-" + iso_candidate[5:7] + "-" + iso_candidate[8:]
        return datetime.fromisoformat(iso_candidate)
    except ValueError:
        pass

    formats = [
        "%Y:%m:%d %H:%M:%S%z",
        "%Y:%m:%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue

    logger.debug(f"Could not parse datetime string: {dt_str}")
    return None


def _calculate_time_delta_seconds(
    d_time: datetime,
    e_time: datetime,
    ref_lat: Optional[float] = None,
    ref_lng: Optional[float] = None,
) -> Optional[int]:
    """
    Computes the absolute difference in seconds between device capture time
    and EXIF capture time, properly reconciling timezone differences and
    naive local wall-clock times.
    """
    if d_time is None or e_time is None:
        return None

    # Case 1: Both timezone-aware -> compare exact UTC instants
    if d_time.tzinfo is not None and e_time.tzinfo is not None:
        d_utc = d_time.astimezone(timezone.utc)
        e_utc = e_time.astimezone(timezone.utc)
        return abs(int((d_utc - e_utc).total_seconds()))

    # Case 2: Both naive -> compare local wall-clock time directly
    if d_time.tzinfo is None and e_time.tzinfo is None:
        return abs(int((d_time - e_time).total_seconds()))

    # Case 3: One is aware and one is naive
    aware_dt = d_time if d_time.tzinfo is not None else e_time
    naive_dt = d_time if d_time.tzinfo is None else e_time

    # If aware_dt has a specific non-UTC timezone offset (e.g. +05:30):
    # Its wall-clock representation in that local timezone is aware_dt.astimezone(aware_dt.tzinfo).replace(tzinfo=None).
    # EXIF naive timestamp is the camera's local wall clock.
    aware_offset = aware_dt.utcoffset()
    if aware_offset is not None and aware_offset != timedelta(0):
        aware_local = aware_dt.astimezone(aware_dt.tzinfo).replace(tzinfo=None)
        return abs(int((aware_local - naive_dt).total_seconds()))

    # If aware_dt is in UTC (+00:00 / Z):
    # Check naive direct difference (if both were intended in UTC or same timezone):
    direct_diff = abs(int((aware_dt.replace(tzinfo=None) - naive_dt).total_seconds()))

    # Reconcile with IST (UTC+05:30) which is standard for India / InfraSense:
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    aware_ist = aware_dt.astimezone(ist_tz).replace(tzinfo=None)
    ist_diff = abs(int((aware_ist - naive_dt).total_seconds()))

    # If IST conversion brings delta within threshold (<= 300s):
    if ist_diff <= settings.EVIDENCE_TIME_MATCH_THRESHOLD_SECONDS:
        return ist_diff
    # If direct diff was already within threshold (<= 300s):
    if direct_diff <= settings.EVIDENCE_TIME_MATCH_THRESHOLD_SECONDS:
        return direct_diff

    return min(direct_diff, ist_diff)


def extract_exif_metadata(image_bytes: bytes) -> dict[str, Any]:
    """
    Safely extracts EXIF GPS, timestamp, and camera metadata from raw image bytes.
    Never raises exceptions on corrupt, unsupported, or missing EXIF.
    """
    result: dict[str, Any] = {
        "exif_latitude": None,
        "exif_longitude": None,
        "exif_captured_at": None,
        "camera_make": None,
        "camera_model": None,
        "has_exif": False,
        "has_gps": False,
        "has_timestamp": False,
    }

    if not image_bytes:
        return result

    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            raw_exif = img.getexif()
            if not raw_exif:
                return result

            result["has_exif"] = True

            # Camera Make and Model
            make = raw_exif.get(ExifTags.Base.Make) or raw_exif.get(271)
            model = raw_exif.get(ExifTags.Base.Model) or raw_exif.get(272)
            if make:
                result["camera_make"] = str(make).strip()[:100]
            if model:
                result["camera_model"] = str(model).strip()[:100]

            # DateTime from 0th IFD or Exif IFD
            dt_raw = raw_exif.get(ExifTags.Base.DateTime) or raw_exif.get(306)
            offset_str = None
            
            # Check Exif IFD (sub-IFD 0x8769) for DateTimeOriginal (0x9003) & OffsetTimeOriginal (0x9011)
            try:
                exif_ifd = raw_exif.get_ifd(ExifTags.IFD.Exif)
                if exif_ifd:
                    dt_orig = exif_ifd.get(ExifTags.Base.DateTimeOriginal) or exif_ifd.get(0x9003)
                    if dt_orig:
                        dt_raw = dt_orig
                    offset_val = (
                        exif_ifd.get(ExifTags.Base.OffsetTimeOriginal)
                        or exif_ifd.get(0x9011)
                        or exif_ifd.get(ExifTags.Base.OffsetTime)
                        or exif_ifd.get(0x9010)
                        or exif_ifd.get(ExifTags.Base.OffsetTimeDigitized)
                        or exif_ifd.get(0x9012)
                    )
                    if offset_val:
                        offset_str = str(offset_val).strip()
            except Exception:
                pass

            if not offset_str:
                try:
                    offset_val = raw_exif.get(ExifTags.Base.OffsetTime) or raw_exif.get(0x9010)
                    if offset_val:
                        offset_str = str(offset_val).strip()
                except Exception:
                    pass

            if dt_raw:
                parsed_dt = _parse_exif_datetime(str(dt_raw), offset_str)
                if parsed_dt:
                    result["exif_captured_at"] = parsed_dt
                    result["has_timestamp"] = True

            # GPS IFD (sub-IFD 0x8825)
            try:
                gps_ifd = raw_exif.get_ifd(ExifTags.IFD.GPSInfo)
                if gps_ifd:
                    gps_lat = gps_ifd.get(ExifTags.GPS.GPSLatitude) or gps_ifd.get(2)
                    gps_lat_ref = gps_ifd.get(ExifTags.GPS.GPSLatitudeRef) or gps_ifd.get(1)
                    gps_lng = gps_ifd.get(ExifTags.GPS.GPSLongitude) or gps_ifd.get(4)
                    gps_lng_ref = gps_ifd.get(ExifTags.GPS.GPSLongitudeRef) or gps_ifd.get(3)

                    lat_dec = _dms_to_decimal(gps_lat, gps_lat_ref)
                    lng_dec = _dms_to_decimal(gps_lng, gps_lng_ref)

                    if lat_dec is not None and lng_dec is not None:
                        result["exif_latitude"] = lat_dec
                        result["exif_longitude"] = lng_dec
                        result["has_gps"] = True
            except Exception as gps_exc:
                logger.debug(f"Could not parse GPS IFD: {gps_exc}")

    except Exception as exc:
        logger.debug(f"EXIF extraction error (handled gracefully): {exc}")

    return result


def verify_evidence_consistency(
    device_latitude: Optional[float] = None,
    device_longitude: Optional[float] = None,
    device_captured_at: Optional[datetime] = None,
    exif_latitude: Optional[float] = None,
    exif_longitude: Optional[float] = None,
    exif_captured_at: Optional[datetime] = None,
) -> dict[str, Any]:
    """
    Compares device-reported location/time against EXIF metadata and produces
    a structured verification result with distance, delta, and consistency status.
    """
    # 1. GPS Verification
    device_gps_avail = (device_latitude is not None and device_longitude is not None)
    exif_gps_avail = (exif_latitude is not None and exif_longitude is not None)

    gps_dist_m: Optional[float] = None
    gps_status = "unavailable"

    if device_gps_avail and exif_gps_avail:
        try:
            gps_dist_m = round(
                haversine_meters(device_latitude, device_longitude, exif_latitude, exif_longitude),
                1,
            )
            if gps_dist_m <= settings.EVIDENCE_GPS_MATCH_THRESHOLD_METERS:
                gps_status = "match"
            else:
                gps_status = "mismatch"
        except Exception as exc:
            logger.warning(f"Error computing GPS haversine distance: {exc}")
            gps_status = "unavailable"

    # 2. Time Verification
    device_time_avail = (device_captured_at is not None)
    exif_time_avail = (exif_captured_at is not None)

    time_diff_sec: Optional[int] = None
    time_status = "unavailable"

    if device_time_avail and exif_time_avail:
        try:
            time_diff_sec = _calculate_time_delta_seconds(
                d_time=device_captured_at,
                e_time=exif_captured_at,
                ref_lat=device_latitude or exif_latitude,
                ref_lng=device_longitude or exif_longitude,
            )
            if time_diff_sec is not None and time_diff_sec <= settings.EVIDENCE_TIME_MATCH_THRESHOLD_SECONDS:
                time_status = "match"
            elif time_diff_sec is not None:
                time_status = "mismatch"
            else:
                time_status = "unavailable"
        except Exception as exc:
            logger.warning(f"Error computing time difference: {exc}")
            time_status = "unavailable"

    return {
        "gps": {
            "device_available": device_gps_avail,
            "exif_available": exif_gps_avail,
            "distance_meters": gps_dist_m,
            "status": gps_status,
        },
        "capture_time": {
            "device_available": device_time_avail,
            "exif_available": exif_time_avail,
            "difference_seconds": time_diff_sec,
            "status": time_status,
        },
        "gps_distance_meters": gps_dist_m,
        "gps_consistency": gps_status,
        "time_difference_seconds": time_diff_sec,
        "time_consistency": time_status,
    }
