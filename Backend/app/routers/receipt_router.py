from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.models import User
from app.schemas import ReceiptUploadResponse
from app.utils.auth_dependencies import get_current_active_user
from app.utils.receipt_ocr import (
    detect_receipt_date,
    detect_receipt_items,
    detect_receipt_total,
    detect_receipt_vendor,
    extract_text_with_tesseract,
)

receipt_router = APIRouter(
    prefix="/receipts",
    tags=["Receipts"],
)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


@receipt_router.post("/upload", response_model=ReceiptUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_receipt_image(
    file: UploadFile = File(...),
    _current_user: User = Depends(get_current_active_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WEBP images are supported")

    file_bytes = await file.read(MAX_FILE_SIZE_BYTES + 1)
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Receipt image is too large (max 10MB)")

    ocr_text, ocr_status = extract_text_with_tesseract(file_bytes)
    detected_amount = detect_receipt_total(ocr_text)
    detected_items = detect_receipt_items(ocr_text)
    parsed_date = detect_receipt_date(ocr_text)
    parsed_vendor = detect_receipt_vendor(ocr_text)

    return ReceiptUploadResponse(
        image_url=None,
        receipt_text=ocr_text,
        detected_amount=detected_amount,
        detected_items=detected_items,
        parsed_total=detected_amount,
        parsed_date=parsed_date,
        parsed_vendor=parsed_vendor,
        parsed_items=detected_items,
        ocr_status=ocr_status,
    )
