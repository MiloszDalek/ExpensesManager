from __future__ import annotations

from datetime import datetime
from io import BytesIO
from decimal import Decimal, InvalidOperation
from pathlib import Path
from threading import Lock
from typing import Any
import re
import shutil
import os
import importlib

import pytesseract
from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError
from pytesseract import TesseractNotFoundError

from app.core.config import get_settings

AMOUNT_REGEX = re.compile(r"(?<!\d)(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2}))(?!\d)")
ITEM_LINE_REGEX = re.compile(
    r"^(?P<name>[^\d]{2,}?)\s+(?P<amount>\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2}))\s*$"
)
KEYWORDS = (
    "suma",
    "razem",
    "total",
    "do zaplaty",
    "naleznosc",
    "kwota",
)
DATE_REGEXES = (
    re.compile(r"(?<!\d)(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?!\d)"),
    re.compile(r"(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?!\d)"),
)
NON_ITEM_KEYWORDS = (
    "suma",
    "razem",
    "total",
    "do zaplaty",
    "naleznosc",
    "kwota",
    "vat",
    "podatek",
    "rabat",
    "reszta",
    "cash",
    "card",
    "platnosc",
)

OCR_ENGINE_AUTO = "auto"
OCR_ENGINE_TESSERACT = "tesseract"
OCR_ENGINE_PADDLE = "paddle"
_VALID_ENGINES = {OCR_ENGINE_AUTO, OCR_ENGINE_TESSERACT, OCR_ENGINE_PADDLE}

_PADDLE_LOCK = Lock()
_PADDLE_INSTANCE: Any = None
_PADDLE_CLASS: Any = None
_NUMPY_MODULE: Any = None
_PADDLE_INIT_FAILED = False


def _resolve_tesseract_binary() -> str | None:
    tesseract_path = shutil.which("tesseract")
    if tesseract_path:
        return tesseract_path

    windows_candidates = (
        Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe"),
        Path(r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"),
        Path(r"C:\ProgramData\chocolatey\bin\tesseract.exe"),
        Path(r"C:\ProgramData\chocolatey\lib\tesseract\tools\tesseract.exe"),
    )
    for candidate in windows_candidates:
        if candidate.exists():
            return str(candidate)

    return None


def _get_ocr_engine_preference() -> str:
    return _normalize_ocr_engine(get_settings().RECEIPT_OCR_ENGINE)


def _normalize_ocr_engine(raw_value: str | None) -> str:
    preferred = (raw_value or "").strip().lower()
    if preferred in _VALID_ENGINES:
        return preferred
    return OCR_ENGINE_AUTO


def _get_paddle_lang() -> str:
    # PaddleOCR v3 does not support the old "latin" alias.
    configured_lang = get_settings().RECEIPT_OCR_PADDLE_LANG
    return configured_lang.strip().lower() or "en"


def _load_paddle_runtime() -> bool:
    global _PADDLE_CLASS, _NUMPY_MODULE, _PADDLE_INIT_FAILED

    if _PADDLE_INIT_FAILED:
        return False
    if _PADDLE_CLASS is not None and _NUMPY_MODULE is not None:
        return True

    settings = get_settings()
    os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = (
        "True" if settings.PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK else "False"
    )

    try:
        paddle_module = importlib.import_module("paddleocr")
        _PADDLE_CLASS = getattr(paddle_module, "PaddleOCR", None)
        _NUMPY_MODULE = importlib.import_module("numpy")
    except Exception:
        _PADDLE_INIT_FAILED = True
        return False

    if _PADDLE_CLASS is None or _NUMPY_MODULE is None:
        _PADDLE_INIT_FAILED = True
        return False

    return True


def _get_paddle_instance() -> Any | None:
    global _PADDLE_INSTANCE, _PADDLE_INIT_FAILED

    if _PADDLE_INSTANCE is not None:
        return _PADDLE_INSTANCE
    if _PADDLE_INIT_FAILED:
        return None
    if not _load_paddle_runtime():
        return None

    with _PADDLE_LOCK:
        if _PADDLE_INSTANCE is not None:
            return _PADDLE_INSTANCE
        if _PADDLE_INIT_FAILED:
            return None

        try:
            preferred_lang = _get_paddle_lang()
            # Use constructor args compatible with PaddleOCR v3.
            try:
                _PADDLE_INSTANCE = _PADDLE_CLASS(lang=preferred_lang)
            except Exception:
                if preferred_lang != "en":
                    _PADDLE_INSTANCE = _PADDLE_CLASS(lang="en")
                else:
                    raise
        except Exception:
            _PADDLE_INIT_FAILED = True
            return None

    return _PADDLE_INSTANCE


def extract_text_with_paddle(image_bytes: bytes) -> tuple[str | None, str]:
    paddle_instance = _get_paddle_instance()
    if paddle_instance is None or _NUMPY_MODULE is None:
        return None, "unavailable"

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            normalized_image = _preprocess_image_for_paddle(image)
            image_array = _NUMPY_MODULE.array(normalized_image)

            # PaddleOCR v3 uses predict(); some installs still expose ocr().
            if hasattr(paddle_instance, "predict"):
                ocr_result = paddle_instance.predict(image_array)
            elif hasattr(paddle_instance, "ocr"):
                ocr_result = paddle_instance.ocr(image_array)
            else:
                return None, "failed"
    except UnidentifiedImageError:
        return None, "failed"
    except Exception:
        return None, "failed"

    extracted_lines: list[str] = []

    # PaddleOCR v3 output is list of mapping-like result objects.
    if isinstance(ocr_result, list) and ocr_result and _is_mapping_like(ocr_result[0]):
        for result_item in ocr_result:
            extracted_lines.extend(_extract_lines_from_paddle_result_item(result_item))
    else:
        # Backward-compatible fallback for older tuple-based structure.
        for line_result in ocr_result[0] if isinstance(ocr_result, list) and ocr_result else []:
            if not isinstance(line_result, (list, tuple)) or len(line_result) < 2:
                continue

            text_payload = line_result[1]
            if not isinstance(text_payload, (list, tuple)) or len(text_payload) == 0:
                continue

            candidate_text = str(text_payload[0]).strip()
            if candidate_text:
                extracted_lines.append(candidate_text)

    text = "\n".join(extracted_lines).strip()
    if not text:
        return None, "done"

    return text, "done"


def _extract_lines_from_paddle_result_item(result_item: Any) -> list[str]:
    rec_texts = _mapping_get(result_item, "rec_texts")
    rec_polys = _mapping_get(result_item, "rec_polys")
    rec_texts_sequence = _as_sequence(rec_texts)
    rec_polys_sequence = _as_sequence(rec_polys)

    if not rec_texts_sequence:
        return []

    # Fallback when polygons are unavailable: keep plain line list.
    if not rec_polys_sequence or len(rec_polys_sequence) != len(rec_texts_sequence):
        lines: list[str] = []
        for value in rec_texts_sequence:
            candidate_text = str(value).strip()
            if candidate_text:
                lines.append(candidate_text)
        return lines

    tokens: list[dict[str, Any]] = []
    heights: list[float] = []

    for raw_text, poly in zip(rec_texts_sequence, rec_polys_sequence):
        text = str(raw_text).strip()
        poly_points = _as_sequence(poly)
        if not text or not poly_points:
            continue

        points: list[tuple[float, float]] = []
        for point in poly_points:
            point_values = _as_sequence(point)
            if len(point_values) < 2:
                continue
            try:
                px = float(point_values[0])
                py = float(point_values[1])
            except (TypeError, ValueError):
                continue
            points.append((px, py))

        if not points:
            continue

        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        min_y = min(ys)
        max_y = max(ys)
        height = max(1.0, max_y - min_y)
        heights.append(height)

        tokens.append(
            {
                "text": text,
                "x": min(xs),
                "y": (min_y + max_y) / 2,
                "h": height,
            }
        )

    if not tokens:
        return []

    sorted_heights = sorted(heights)
    median_height = sorted_heights[len(sorted_heights) // 2]
    same_line_tolerance = max(6.0, median_height * 0.65)

    tokens.sort(key=lambda token: (token["y"], token["x"]))

    grouped_lines: list[list[dict[str, Any]]] = []
    current_line: list[dict[str, Any]] = []
    current_y: float | None = None

    for token in tokens:
        if current_y is None:
            current_line = [token]
            current_y = float(token["y"])
            continue

        if abs(float(token["y"]) - current_y) <= same_line_tolerance:
            current_line.append(token)
            current_y = (current_y * (len(current_line) - 1) + float(token["y"])) / len(current_line)
            continue

        grouped_lines.append(current_line)
        current_line = [token]
        current_y = float(token["y"])

    if current_line:
        grouped_lines.append(current_line)

    lines: list[str] = []
    for grouped_line in grouped_lines:
        grouped_line.sort(key=lambda token: token["x"])
        line_text = " ".join(str(token["text"]).strip() for token in grouped_line if str(token["text"]).strip())
        normalized_line = re.sub(r"\s+", " ", line_text).strip()
        if normalized_line:
            lines.append(normalized_line)

    return lines


def _as_sequence(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)

    to_list = getattr(value, "tolist", None)
    if callable(to_list):
        try:
            normalized = to_list()
            if isinstance(normalized, list):
                return normalized
            if isinstance(normalized, tuple):
                return list(normalized)
        except Exception:
            pass

    try:
        return list(value)
    except TypeError:
        return []


def _is_mapping_like(value: Any) -> bool:
    if isinstance(value, dict):
        return True

    getter = getattr(value, "get", None)
    return callable(getter)


def _mapping_get(value: Any, key: str) -> Any:
    if isinstance(value, dict):
        return value.get(key)

    getter = getattr(value, "get", None)
    if callable(getter):
        try:
            return getter(key)
        except Exception:
            return None

    return None


def extract_text_with_tesseract(image_bytes: bytes) -> tuple[str | None, str]:
    tesseract_path = _resolve_tesseract_binary()
    if not tesseract_path:
        return None, "unavailable"

    pytesseract.pytesseract.tesseract_cmd = tesseract_path

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            normalized_image = _preprocess_image_for_tesseract(image)
            text = pytesseract.image_to_string(normalized_image, lang="eng+pol", config="--psm 6")
    except TesseractNotFoundError:
        return None, "unavailable"
    except UnidentifiedImageError:
        return None, "failed"
    except Exception:
        return None, "failed"

    text = text.strip()
    if not text:
        return None, "done"

    return text, "done"


def extract_text_from_receipt(image_bytes: bytes, preferred_engine: str | None = None) -> tuple[str | None, str, str]:
    normalized_preferred_engine = (
        _normalize_ocr_engine(preferred_engine)
        if preferred_engine is not None
        else _get_ocr_engine_preference()
    )

    if normalized_preferred_engine == OCR_ENGINE_TESSERACT:
        engine_order = (OCR_ENGINE_TESSERACT,)
    elif normalized_preferred_engine == OCR_ENGINE_PADDLE:
        engine_order = (OCR_ENGINE_PADDLE, OCR_ENGINE_TESSERACT)
    else:
        engine_order = (OCR_ENGINE_PADDLE, OCR_ENGINE_TESSERACT)

    last_status = "unavailable"
    last_engine = engine_order[-1]

    for engine in engine_order:
        extractor = extract_text_with_paddle if engine == OCR_ENGINE_PADDLE else extract_text_with_tesseract
        text, status = extractor(image_bytes)
        last_status = status
        last_engine = engine

        if text:
            return text, "done", engine

    return None, last_status, last_engine


def _preprocess_image_for_tesseract(image: Image.Image) -> Image.Image:
    # Tesseract benefits from binarized, high-contrast input.
    grayscale = image.convert("L")
    denoised = grayscale.filter(ImageFilter.MedianFilter(size=3))
    enhanced = ImageOps.autocontrast(denoised)
    thresholded = enhanced.point(lambda value: 255 if value > 150 else 0)
    return thresholded


def _preprocess_image_for_paddle(image: Image.Image) -> Image.Image:
    # PaddleOCR is generally more robust on non-binarized input.
    rgb_image = image.convert("RGB")
    width, height = rgb_image.size

    if width > 0 and width < 1200:
        scale_ratio = 1200 / width
        resized_width = max(width, int(width * scale_ratio))
        resized_height = max(height, int(height * scale_ratio))
        rgb_image = rgb_image.resize((resized_width, resized_height), Image.Resampling.BICUBIC)

    return ImageOps.autocontrast(rgb_image)


def _parse_decimal_amount(raw: str) -> Decimal | None:
    normalized = raw.replace(" ", "")

    if "," in normalized and "." in normalized:
        decimal_sep = "," if normalized.rfind(",") > normalized.rfind(".") else "."
        thousands_sep = "." if decimal_sep == "," else ","
        normalized = normalized.replace(thousands_sep, "")
        normalized = normalized.replace(decimal_sep, ".")
    else:
        normalized = normalized.replace(",", ".")

    try:
        value = Decimal(normalized)
    except InvalidOperation:
        return None

    if value <= 0:
        return None

    if value > Decimal("1000000"):
        return None

    return value.quantize(Decimal("0.01"))


def _extract_amounts(text: str) -> list[Decimal]:
    amounts: list[Decimal] = []
    for match in AMOUNT_REGEX.findall(text):
        parsed = _parse_decimal_amount(match)
        if parsed is not None:
            amounts.append(parsed)
    return amounts


def _detect_item_line(line: str) -> tuple[str, Decimal] | None:
    strict_match = ITEM_LINE_REGEX.match(line)
    if strict_match:
        parsed_amount = _parse_decimal_amount(strict_match.group("amount"))
        if parsed_amount is None:
            return None

        name = strict_match.group("name").strip(" .:-")
        if len(name) < 2:
            return None

        return name, parsed_amount

    amount_matches = list(AMOUNT_REGEX.finditer(line))
    if not amount_matches:
        return None

    amount_match = amount_matches[-1]
    parsed_amount = _parse_decimal_amount(amount_match.group(0))
    if parsed_amount is None:
        return None

    trailing = line[amount_match.end():].strip()
    if trailing and not re.fullmatch(r"[-+*=xX\s]*", trailing):
        return None

    name = line[:amount_match.start()].strip(" .:-")
    if len(name) < 2:
        return None

    # Require at least one letter to avoid treating pure numeric codes as item names.
    if sum(1 for char in name if char.isalpha()) < 1:
        return None

    return name, parsed_amount


def detect_receipt_items(text: str | None, max_items: int = 15) -> list[dict[str, str]]:
    if not text:
        return []

    items: list[dict[str, str]] = []
    for raw_line in text.splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip(" -:\t")
        if len(line) < 4:
            continue

        lowered = line.lower()
        if any(keyword in lowered for keyword in NON_ITEM_KEYWORDS):
            continue

        parsed_item = _detect_item_line(line)
        if parsed_item is None:
            continue

        name, parsed_amount = parsed_item

        items.append(
            {
                "name": name[:120],
                "amount": f"{parsed_amount:.2f}",
                "confidence": None,
            }
        )
        if len(items) >= max_items:
            break

    return items


def detect_receipt_total(text: str | None) -> str | None:
    if not text:
        return None

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    prioritized_amounts: list[Decimal] = []

    for line in lines:
        lowered = line.lower()
        if any(keyword in lowered for keyword in KEYWORDS):
            prioritized_amounts.extend(_extract_amounts(line))

    if prioritized_amounts:
        return f"{max(prioritized_amounts):.2f}"

    all_amounts = _extract_amounts(text)
    if not all_amounts:
        return None

    return f"{max(all_amounts):.2f}"


def detect_receipt_date(text: str | None) -> str | None:
    if not text:
        return None

    for line in text.splitlines():
        normalized = line.strip()
        if not normalized:
            continue

        for regex in DATE_REGEXES:
            match = regex.search(normalized)
            if not match:
                continue

            groups = match.groups()
            parsed_date: datetime | None = None

            if len(groups[0]) == 4:
                year, month, day = groups
                parsed_date = _safe_date(int(year), int(month), int(day))
            else:
                day, month, year = groups
                normalized_year = int(year)
                if normalized_year < 100:
                    normalized_year += 2000
                parsed_date = _safe_date(normalized_year, int(month), int(day))

            if parsed_date is not None:
                return parsed_date.strftime("%Y-%m-%d")

    return None


def _safe_date(year: int, month: int, day: int) -> datetime | None:
    try:
        candidate = datetime(year, month, day)
    except ValueError:
        return None

    if candidate.year < 2000 or candidate.year > 2100:
        return None

    return candidate


def detect_receipt_vendor(text: str | None) -> str | None:
    if not text:
        return None

    lines = [re.sub(r"\s+", " ", line).strip(" -:\t") for line in text.splitlines() if line.strip()]
    for line in lines[:6]:
        lowered = line.lower()
        if any(keyword in lowered for keyword in NON_ITEM_KEYWORDS):
            continue
        if any(char.isdigit() for char in line):
            continue
        if len(line) < 3:
            continue

        cleaned = re.sub(r"[^A-Za-z0-9ąćęłńóśżźĄĆĘŁŃÓŚŻŹ& .'-]", "", line).strip()
        if len(cleaned) >= 3:
            return cleaned[:120]

    return None
