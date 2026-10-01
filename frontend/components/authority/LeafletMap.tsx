"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Dynamically require or import leaflet.heat if in browser
if (typeof window !== "undefined") {
  require("leaflet.heat");
}

import { Issue } from "@/lib/types";

interface LeafletMapProps {
  issues: Issue[];
  visible: Issue[];
  heatmap: boolean;
  showClusters: boolean;
  selected: Issue | null;
  onSelect: (issue: Issue | null) => void;
  height: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#B23A2C",
  high: "#C88A2A",
  medium: "#F4B52C",
  low: "#4C7A5E",
};

export default function LeafletMap({
  visible,
  heatmap,
  showClusters,
  selected,
  onSelect,
  height,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const clustersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any>(null);

  // Initialize Map instance once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center (e.g., Bhopal / India center)
    const map = L.map(containerRef.current, {
      center: [23.2599, 77.4126],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const clustersLayer = L.layerGroup().addTo(map);

    markersLayerRef.current = markersLayer;
    clustersLayerRef.current = clustersLayer;
    mapRef.current = map;

    map.on("click", (e: any) => {
      // If clicking directly on the map background, deselect
      if (e.originalEvent?.target === containerRef.current || e.originalEvent?.target?.classList?.contains("leaflet-container")) {
        onSelect(null);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      clustersLayerRef.current = null;
      heatLayerRef.current = null;
    };
  }, [onSelect]);

  // Update Markers, Clusters, and Heatmap when visible issues or options change
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const clustersLayer = clustersLayerRef.current;
    if (!map || !markersLayer || !clustersLayer) return;

    // Clear previous layers
    markersLayer.clearLayers();
    clustersLayer.clearLayers();

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Filter valid GPS coordinates
    const validIssues = visible.filter(
      (i) =>
        typeof i.lat === "number" &&
        typeof i.lng === "number" &&
        !isNaN(i.lat) &&
        !isNaN(i.lng) &&
        (i.lat !== 0 || i.lng !== 0)
    );

    // 1. Plot Issue Markers
    validIssues.forEach((issue) => {
      const color = SEVERITY_COLORS[issue.severity] || "#F4B52C";
      const isCritical = issue.severity === "critical";
      const isSelected = selected?.id === issue.id;

      const markerHtml = `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            isCritical
              ? `<span style="position: absolute; inset: 0px; border-radius: 9999px; background-color: ${color}; opacity: 0.45; animation: pulseDot 1.8s ease-in-out infinite;"></span>`
              : ""
          }
          <div style="
            width: ${isSelected ? "18px" : "14px"};
            height: ${isSelected ? "18px" : "14px"};
            border-radius: 9999px;
            background-color: ${color};
            border: 2px solid #0D0F10;
            box-shadow: 0 2px 8px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.15s ease;
            ${isSelected ? "box-shadow: 0 0 0 3px rgba(244, 181, 44, 0.7);" : ""}
          ">
            <span style="width: 4px; height: 4px; border-radius: 9999px; background: #FFFFFF;"></span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: "infra-map-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      });

      const marker = L.marker([issue.lat, issue.lng], { icon });

      const popupContent = `
        <div style="font-family: inherit; color: #F3F0E8; min-width: 200px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #F4B52C;">#${issue.id}</span>
            <span style="font-family: monospace; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: rgba(244,181,44,0.15); color: ${color};">${issue.severity}</span>
          </div>
          <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px; color: #F3F0E8; line-height: 1.3;">
            ${issue.category || issue.title}
          </div>
          <div style="font-size: 11.5px; color: #8D918F; margin-bottom: 8px;">
            ${issue.ward ? `<span>${issue.ward}</span> • ` : ""}
            <span style="color: #F4B52C; font-weight: 600;">Priority: P-${issue.priorityScore}</span>
          </div>
          <div style="padding-top: 6px; border-top: 1px solid #2C2A25; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-family: monospace; text-transform: uppercase; color: #8D918F;">${issue.status.replace("_", " ")}</span>
            <a href="/authority/issues/${issue.id}" style="font-size: 11px; font-family: monospace; color: #F4B52C; text-decoration: underline; font-weight: 600;">
              View Issue &rarr;
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        className: "infra-map-popup",
      });

      marker.on("click", () => {
        onSelect(issue);
      });

      markersLayer.addLayer(marker);
    });

    // 2. Spatial Clustering Layer (if enabled)
    if (showClusters && validIssues.length >= 2) {
      const CLUSTER_DISTANCE_DEG = 0.006; // Approx ~600m
      const visited = new Set<string>();
      const clusters: { lat: number; lng: number; count: number }[] = [];

      for (let i = 0; i < validIssues.length; i++) {
        const issueA = validIssues[i];
        if (visited.has(String(issueA.id))) continue;

        const group = [issueA];
        visited.add(String(issueA.id));

        for (let j = i + 1; j < validIssues.length; j++) {
          const issueB = validIssues[j];
          if (visited.has(String(issueB.id))) continue;

          const dLat = issueA.lat - issueB.lat;
          const dLng = issueA.lng - issueB.lng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);

          if (dist <= CLUSTER_DISTANCE_DEG) {
            group.push(issueB);
            visited.add(String(issueB.id));
          }
        }

        if (group.length >= 2) {
          const avgLat = group.reduce((s, x) => s + x.lat, 0) / group.length;
          const avgLng = group.reduce((s, x) => s + x.lng, 0) / group.length;
          clusters.push({ lat: avgLat, lng: avgLng, count: group.length });
        }
      }

      clusters.forEach((cl) => {
        const clusterHtml = `
          <div style="
            width: 34px;
            height: 34px;
            border-radius: 9999px;
            border: 2px dashed rgba(244, 181, 44, 0.8);
            background: rgba(244, 181, 44, 0.18);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 12px rgba(244, 181, 44, 0.25);
          ">
            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #F4B52C;">
              ${cl.count}
            </span>
          </div>
        `;
        const clusterIcon = L.divIcon({
          html: clusterHtml,
          className: "infra-cluster-icon",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const clusterMarker = L.marker([cl.lat, cl.lng], {
          icon: clusterIcon,
          interactive: false,
        });
        clustersLayer.addLayer(clusterMarker);
      });
    }

    // 3. Heatmap Layer
    if (heatmap && validIssues.length > 0 && typeof (L as any).heatLayer === "function") {
      const heatPoints = validIssues.map((i) => [
        i.lat,
        i.lng,
        i.severity === "critical" ? 1.0 : i.severity === "high" ? 0.75 : i.severity === "medium" ? 0.5 : 0.3,
      ]);

      const heat = (L as any).heatLayer(heatPoints, {
        radius: 30,
        blur: 20,
        maxZoom: 16,
        max: 1.0,
        gradient: {
          0.2: "#4C7A5E",
          0.5: "#F4B52C",
          0.8: "#C88A2A",
          1.0: "#B23A2C",
        },
      });
      heat.addTo(map);
      heatLayerRef.current = heat;
    }

    // 4. Dynamic Bounds Fitting
    if (validIssues.length > 1) {
      const bounds = L.latLngBounds(validIssues.map((i) => [i.lat, i.lng]));
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    } else if (validIssues.length === 1) {
      map.setView([validIssues[0].lat, validIssues[0].lng], 15);
    }
  }, [visible, heatmap, showClusters, selected, onSelect]);

  return (
    <div
      ref={containerRef}
      className="w-full relative z-0"
      style={{ height: `${height}px` }}
    />
  );
}
