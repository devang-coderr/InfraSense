"""
Official InfraSense 8-Class Infrastructure Taxonomy.

Source of Truth for all infrastructure defect categories recognized by the platform.
"""

OFFICIAL_CATEGORIES: tuple[str, ...] = (
    "Pothole",
    "Road Crack",
    "Streetlight",
    "Traffic Signal",
    "Garbage",
    "Water Leakage",
    "Drainage",
    "Open Manhole",
)

# AI Checkpoint Class Index Mapping (matches EfficientNet-B0 trained weights)
CLASS_INDEX_MAP: dict[int, str] = {
    0: "Drainage",
    1: "Garbage",
    2: "Open Manhole",
    3: "Pothole",
    4: "Road Crack",
    5: "Streetlight",
    6: "Traffic Signal",
    7: "Water Leakage",
}

# Normalization mapping for variations, snake_case, legacy keys, or common synonyms
CATEGORY_SYNONYMS: dict[str, str] = {
    "pothole": "Pothole",
    "potholes": "Pothole",
    "road crack": "Road Crack",
    "road_crack": "Road Crack",
    "crack": "Road Crack",
    "cracks": "Road Crack",
    "road damage": "Road Crack",
    "streetlight": "Streetlight",
    "street light": "Streetlight",
    "street_light": "Streetlight",
    "lamp": "Streetlight",
    "lighting": "Streetlight",
    "traffic signal": "Traffic Signal",
    "traffic_signal": "Traffic Signal",
    "traffic light": "Traffic Signal",
    "traffic": "Traffic Signal",
    "signal": "Traffic Signal",
    "garbage": "Garbage",
    "waste": "Garbage",
    "trash": "Garbage",
    "rubbish": "Garbage",
    "dump": "Garbage",
    "litter": "Garbage",
    "refuse": "Garbage",
    "water leakage": "Water Leakage",
    "water_leakage": "Water Leakage",
    "water leak": "Water Leakage",
    "leak": "Water Leakage",
    "leakage": "Water Leakage",
    "pipe burst": "Water Leakage",
    "pipe": "Water Leakage",
    "waterlogging": "Water Leakage",
    "drainage": "Drainage",
    "drain": "Drainage",
    "blocked drain": "Drainage",
    "open manhole": "Open Manhole",
    "open_manhole": "Open Manhole",
    "manhole": "Open Manhole",
}
