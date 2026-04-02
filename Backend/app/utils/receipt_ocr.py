from __future__ import annotations

from datetime import datetime
from io import BytesIO
from decimal import Decimal, InvalidOperation
from pathlib import Path
import re
import shutil

import pytesseract
from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError
from pytesseract import TesseractNotFoundError

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


def extract_text_with_tesseract(image_bytes: bytes) -> tuple[str | None, str]:
    tesseract_path = _resolve_tesseract_binary()
    if not tesseract_path:
        return None, "unavailable"

    pytesseract.pytesseract.tesseract_cmd = tesseract_path

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            normalized_image = _preprocess_image(image)
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


def _preprocess_image(image: Image.Image) -> Image.Image:
    # Keep preprocessing lightweight to avoid latency spikes on API requests.
    grayscale = image.convert("L")
    denoised = grayscale.filter(ImageFilter.MedianFilter(size=3))
    enhanced = ImageOps.autocontrast(denoised)
    thresholded = enhanced.point(lambda value: 255 if value > 150 else 0)
    return thresholded


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

        match = ITEM_LINE_REGEX.match(line)
        if not match:
            continue

        name = match.group("name").strip(" .:-")
        if len(name) < 2:
            continue

        parsed_amount = _parse_decimal_amount(match.group("amount"))
        if parsed_amount is None:
            continue

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
