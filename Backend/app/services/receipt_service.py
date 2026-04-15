from typing import Literal

from fastapi import HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.schemas import ReceiptUploadResponse
from app.utils.receipt_ocr import (
    detect_receipt_date,
    detect_receipt_items,
    detect_receipt_total,
    detect_receipt_vendor,
    extract_text_from_receipt,
)


class ReceiptService:
    ALLOWED_CONTENT_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

    async def scan_uploaded_receipt(
        self,
        file: UploadFile,
        ocr_engine: Literal["auto", "paddle", "tesseract"] | None,
    ) -> ReceiptUploadResponse:
        self._validate_content_type(file.content_type)
        file_bytes = await self._read_file_bytes(file)

        scan_payload = await run_in_threadpool(self._scan_receipt_payload, file_bytes, ocr_engine)

        return ReceiptUploadResponse(
            image_url=None,
            receipt_text=scan_payload["ocr_text"],
            detected_amount=scan_payload["detected_amount"],
            detected_items=scan_payload["detected_items"],
            parsed_total=scan_payload["detected_amount"],
            parsed_date=scan_payload["parsed_date"],
            parsed_vendor=scan_payload["parsed_vendor"],
            parsed_items=scan_payload["detected_items"],
            ocr_status=scan_payload["ocr_status"],
            ocr_engine=scan_payload["used_ocr_engine"],
        )

    def _validate_content_type(self, content_type: str | None):
        if content_type not in self.ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Only JPG, PNG, and WEBP images are supported")

    async def _read_file_bytes(self, file: UploadFile) -> bytes:
        file_bytes = await file.read(self.MAX_FILE_SIZE_BYTES + 1)
        if len(file_bytes) > self.MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Receipt image is too large (max 10MB)")
        return file_bytes

    @staticmethod
    def _scan_receipt_payload(
        file_bytes: bytes,
        ocr_engine: Literal["auto", "paddle", "tesseract"] | None,
    ) -> dict[str, object]:
        ocr_text, ocr_status, used_ocr_engine = extract_text_from_receipt(file_bytes, preferred_engine=ocr_engine)
        detected_amount = detect_receipt_total(ocr_text)
        detected_items = detect_receipt_items(ocr_text)
        parsed_date = detect_receipt_date(ocr_text)
        parsed_vendor = detect_receipt_vendor(ocr_text)

        return {
            "ocr_text": ocr_text,
            "ocr_status": ocr_status,
            "used_ocr_engine": used_ocr_engine,
            "detected_amount": detected_amount,
            "detected_items": detected_items,
            "parsed_date": parsed_date,
            "parsed_vendor": parsed_vendor,
        }
