"""
AI vision provider — BASELINE / PLACEHOLDER (spec sections 11, 34, 52).

THIS IS A RULE-BASED BASELINE. There is no heavy PyTorch/YOLO dependency required.
It provides a deterministic category and confidence score based on description/filename clues,
returning standard InfraSense civic infrastructure categories.
"""

KEYWORD_CATEGORY_MAP: dict[str, str] = {
    "pothole": "Pothole",
    "manhole": "Open Manhole",
    "open manhole": "Open Manhole",
    "garbage": "Garbage",
    "waste": "Garbage",
    "trash": "Garbage",
    "rubbish": "Garbage",
    "dump": "Garbage",
    "heap": "Garbage",
    "litter": "Garbage",
    "refuse": "Garbage",
    "streetlight": "Streetlight",
    "street light": "Streetlight",
    "lamp": "Streetlight",
    "lighting": "Streetlight",
    "signal": "Traffic Signal",
    "traffic light": "Traffic Signal",
    "traffic signal": "Traffic Signal",
    "water": "Water Leakage",
    "leak": "Water Leakage",
    "leakage": "Water Leakage",
    "pipe": "Water Leakage",
    "drainage": "Water Leakage",
    "waterlogging": "Water Leakage",
    "crack": "Road Crack",
    "road crack": "Road Crack",
    "traffic": "Traffic",
}

DEFAULT_CATEGORY = "Pothole"
BASELINE_CONFIDENCE = 85


def analyze_image(description_hint: str = "", filename_hint: str = "") -> tuple[str, int]:
    """
    Returns (category, confidence). Deterministic keyword-assisted heuristic.
    """
    haystack = f"{description_hint} {filename_hint}".lower()
    for keyword, category in KEYWORD_CATEGORY_MAP.items():
        if keyword in haystack:
            return category, BASELINE_CONFIDENCE
    return DEFAULT_CATEGORY, BASELINE_CONFIDENCE
