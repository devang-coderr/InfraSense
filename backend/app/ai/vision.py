"""
AI Vision Provider — EfficientNet-B0 Transfer Learning Model.

Replaces the rule-based baseline with a trained 8-class EfficientNet-B0 model
trained on public road/civic infrastructure defect datasets.

Classes:
0 = Drainage
1 = Garbage
2 = Open Manhole
3 = Pothole
4 = Road Crack
5 = Streetlight
6 = Traffic Signal
7 = Water Leakage
"""
import io
import logging
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image
import torch
import torch.nn as nn
from torchvision import transforms
from torchvision.models import efficientnet_b0

from app.core.config import settings
from app.core.exceptions import AppError

logger = logging.getLogger("infrasense.ai.vision")

# Canonical class ordering matching training checkpoints
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

NUM_CLASSES = len(CLASS_INDEX_MAP)

# Keyword fallback map for text-only analysis (when no image bytes are provided)
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
    "drainage": "Drainage",
    "drain": "Drainage",
    "waterlogging": "Water Leakage",
    "crack": "Road Crack",
    "road crack": "Road Crack",
}

DEFAULT_CATEGORY = "Pothole"
DEFAULT_CONFIDENCE = 85


def _build_model(num_classes: int = NUM_CLASSES) -> nn.Module:
    """Builds EfficientNet-B0 architecture matching the training configuration."""
    model = efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    dropout_rate = model.classifier[0].p
    model.classifier = nn.Sequential(
        nn.Dropout(p=dropout_rate, inplace=True),
        nn.Linear(in_features=in_features, out_features=num_classes),
    )
    return model


class VisionClassifier:
    """Singleton model wrapper for EfficientNet-B0 inference."""

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[nn.Module] = None
        self.is_loaded = False
        self.checkpoint_path: Optional[Path] = None

        # Preprocessing pipeline identical to training/infer.py
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        self._load_model()

    def _resolve_checkpoint_path(self) -> Optional[Path]:
        """Resolves the model checkpoint from configuration or standard directories."""
        candidates = [
            Path(settings.AI_MODEL_PATH) if settings.AI_MODEL_PATH else None,
            Path(r"C:\Users\devan\OneDrive\Desktop\InfraSense_ModelTraining\checkpoints\best_model.pth"),
            Path(__file__).resolve().parent / "weights" / "best_model.pth",
        ]
        for p in candidates:
            if p and p.exists() and p.is_file():
                return p
        return None

    def _load_model(self):
        """Loads model weights once into memory on the selected hardware device."""
        self.checkpoint_path = self._resolve_checkpoint_path()
        if not self.checkpoint_path:
            logger.warning(
                "No EfficientNet-B0 checkpoint found. Falling back to rule-based classification."
            )
            return

        try:
            model = _build_model(num_classes=NUM_CLASSES)
            checkpoint = torch.load(self.checkpoint_path, map_location=self.device)
            state_dict = checkpoint.get("model_state_dict", checkpoint)
            model.load_state_dict(state_dict)
            model.to(self.device)
            model.eval()
            self.model = model
            self.is_loaded = True
            logger.info(
                f"Loaded EfficientNet-B0 model from {self.checkpoint_path} on device: {self.device}"
            )
        except Exception as exc:
            logger.error(f"Failed to load model checkpoint at {self.checkpoint_path}: {exc}")
            self.model = None
            self.is_loaded = False

    def classify_image_bytes(self, image_bytes: bytes) -> Tuple[str, int, float]:
        """
        Runs EfficientNet-B0 inference on raw image bytes.
        Returns: (predicted_category, confidence_percent_int, raw_confidence_float)
        """
        if not image_bytes or len(image_bytes) == 0:
            raise AppError("EMPTY_FILE", "Uploaded image file is empty.", 422)

        try:
            image = Image.open(io.BytesIO(image_bytes))
            image = image.convert("RGB")
        except Exception as exc:
            logger.warning(f"Could not decode image bytes: {exc}")
            raise AppError("INVALID_IMAGE", "Could not decode the uploaded image file.", 422)

        if not self.is_loaded or self.model is None:
            logger.warning("Model not loaded; using fallback category.")
            return DEFAULT_CATEGORY, DEFAULT_CONFIDENCE, float(DEFAULT_CONFIDENCE) / 100.0

        try:
            tensor = self.transform(image).unsqueeze(0).to(self.device)
            with torch.inference_mode():
                logits = self.model(tensor)
                probs = torch.softmax(logits, dim=1).squeeze(0)
                pred_idx = int(torch.argmax(probs).item())
                confidence_float = float(probs[pred_idx].item())
                confidence_int = int(round(confidence_float * 100.0))

            category = CLASS_INDEX_MAP.get(pred_idx, DEFAULT_CATEGORY)
            return category, confidence_int, confidence_float
        except AppError:
            raise
        except Exception as exc:
            logger.error(f"Inference execution failed: {exc}", exc_info=True)
            raise AppError("INFERENCE_FAILED", "Failed to process image through AI model.", 500)


# Initialize singleton classifier on module load
_classifier = VisionClassifier()


def get_classifier() -> VisionClassifier:
    """Returns the singleton VisionClassifier instance."""
    return _classifier


def analyze_image(
    description_hint: str = "",
    filename_hint: str = "",
    image_bytes: Optional[bytes] = None,
) -> Tuple[str, int]:
    """
    Main image analysis entrypoint.
    - If image_bytes is provided and model is loaded, performs EfficientNet-B0 inference.
    - Otherwise, falls back gracefully to keyword/description analysis.
    """
    if image_bytes and _classifier.is_loaded:
        category, confidence_int, _ = _classifier.classify_image_bytes(image_bytes)
        return category, confidence_int

    # Fallback to keyword matching if no image bytes are supplied
    haystack = f"{description_hint} {filename_hint}".lower()
    for keyword, category in KEYWORD_CATEGORY_MAP.items():
        if keyword in haystack:
            return category, DEFAULT_CONFIDENCE
    return DEFAULT_CATEGORY, DEFAULT_CONFIDENCE
