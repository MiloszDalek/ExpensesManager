from typing import Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.models import User
from app.schemas import ReceiptUploadResponse
from app.services import ReceiptService
from app.utils.auth_dependencies import get_current_active_user

receipt_router = APIRouter(
    prefix="/receipts",
    tags=["Receipts"],
)

def get_receipt_service() -> ReceiptService:
    return ReceiptService()


@receipt_router.post("/upload", response_model=ReceiptUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_receipt_image(
    file: UploadFile = File(...),
    ocr_engine: Literal["auto", "paddle", "tesseract"] | None = Query(default=None),
    service: ReceiptService = Depends(get_receipt_service),
    _current_user: User = Depends(get_current_active_user),
):
    return await service.scan_uploaded_receipt(file, ocr_engine)
