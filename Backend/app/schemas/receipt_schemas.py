from typing import Literal, Optional
from pydantic import BaseModel, Field


class ReceiptLineItem(BaseModel):
    name: str
    amount: str
    confidence: float | None = None


class ReceiptUploadResponse(BaseModel):
    image_url: Optional[str] = None
    receipt_text: Optional[str] = None
    detected_amount: Optional[str] = None
    detected_items: list[ReceiptLineItem] = Field(default_factory=list)
    parsed_total: Optional[str] = None
    parsed_date: Optional[str] = None
    parsed_vendor: Optional[str] = None
    parsed_items: list[ReceiptLineItem] = Field(default_factory=list)
    ocr_status: Literal["done", "unavailable", "failed"]
    ocr_engine: Literal["paddle", "tesseract"] | None = None
