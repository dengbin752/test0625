from pydantic import BaseModel
from typing import Optional


class SKUItem(BaseModel):
    sku: str
    name: str
    quantity: int
    price: float
    image: Optional[str] = None
    # Dimensions for shipping calculation
    weight: Optional[float] = None
    width: Optional[float] = None
    length: Optional[float] = None
    height: Optional[float] = None
    volume: Optional[float] = None
    # Tracking info per SKU
    tracking_number: Optional[str] = None
    logistics_company: Optional[str] = None


class LineItem(BaseModel):
    sku_code: str
    name: str
    quantity: int
    price_per_unit: float
    line_total: float
    image: Optional[str] = None
    # Tracking info per SKU
    assigned_tracking: Optional[str] = None
    tracking_no: Optional[str] = None
    logistics_company: Optional[str] = None
    tracking_status: Optional[str] = None
    tracking_last_update: Optional[str] = None


class Summary(BaseModel):
    subtotal: float
    gst: float
    shipment_fee: float
    total: float


class TrackingInfo(BaseModel):
    tracking_number: str
    logistics_company: str
    status: Optional[str] = None
    last_update: Optional[str] = None
    sku: Optional[str] = None


class OrderData(BaseModel):
    items: list[SKUItem]
    destination_postcode: str
    tracking_numbers: list[TrackingInfo] = []


class OrderResponse(BaseModel):
    line_items: list[LineItem]
    summary: Summary
    tracking_info: list[TrackingInfo]