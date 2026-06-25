from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from json import JSONDecodeError
import os
import json
import logging
from pathlib import Path
from dotenv import load_dotenv

from .models import OrderData, OrderResponse, LineItem, Summary, TrackingInfo
from .shipping import (
    calculate_shipment_fee,
    get_tracking_info,
    get_logistics_company,
)

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Shipping Calculator API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Product data file path
PRODUCT_DATA_FILE = Path(__file__).parent.parent.parent / "plans" / "data_examples" / "product_list.json"


@app.get("/")
async def root():
    return {"message": "Shipping Calculator API", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions with JSON response"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )


@app.get("/products")
async def get_products():
    """Fetch product list from local JSON file"""
    logger.info(f"Reading products from: {PRODUCT_DATA_FILE}")
    
    try:
        if not PRODUCT_DATA_FILE.exists():
            logger.error(f"Product file not found: {PRODUCT_DATA_FILE}")
            return JSONResponse(
                status_code=500,
                content={"error": "Product data file not found", "detail": str(PRODUCT_DATA_FILE)}
            )
        
        with open(PRODUCT_DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logger.info(f"Successfully loaded {len(data.get('rows', []))} products")
        return data
    except JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Invalid JSON in product file", "detail": str(e)}
        )
    except Exception as e:
        logger.error(f"Failed to read products: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to read products", "detail": str(e)}
        )


@app.post("/calculate")
async def calculate_order(order_data: OrderData) -> OrderResponse:
    """Calculate order totals including shipping and GST"""
    
    # Calculate line items
    line_items = []
    subtotal = 0.0
    
    for item in order_data.items:
        line_total = item.price * item.quantity
        subtotal += line_total
        
        line_item = LineItem(
            sku_code=item.sku,
            name=item.name,
            quantity=item.quantity,
            price_per_unit=item.price,
            line_total=round(line_total, 2),
            image=item.image,
        )
        line_items.append(line_item)
    
    # Calculate GST (10% of subtotal)
    gst = round(subtotal * 0.10, 2)
    
    # Calculate shipment fee
    items_for_shipping = [
        {
            "weight": item.weight,
            "length": item.length,
            "width": item.width,
            "height": item.height,
            "volume": item.volume,
        }
        for item in order_data.items
    ]
    shipment_fee = await calculate_shipment_fee(
        items=items_for_shipping,
        destination_postcode=order_data.destination_postcode,
    )
    
    # Calculate total
    total = round(subtotal + gst + shipment_fee, 2)
    
    summary = Summary(
        subtotal=round(subtotal, 2),
        gst=gst,
        shipment_fee=shipment_fee,
        total=total,
    )
    
    # Get tracking info if provided
    tracking_info = []
    for tracking in order_data.tracking_numbers:
        logistics = tracking.logistics_company or get_logistics_company(tracking.tracking_number)
        tracking_data = await get_tracking_info(tracking.tracking_number, logistics)
        
        tracking_info.append(TrackingInfo(
            tracking_number=tracking.tracking_number,
            logistics_company=logistics,
            status=tracking_data.get("status"),
            last_update=tracking_data.get("last_update"),
        ))
    
    return OrderResponse(
        line_items=line_items,
        summary=summary,
        tracking_info=tracking_info,
    )


@app.get("/tracking/{tracking_number}")
async def get_tracking(tracking_number: str, logistics_company: str = None):
    """Get tracking information for a single tracking number"""
    if logistics_company is None:
        logistics_company = get_logistics_company(tracking_number)
    
    tracking_data = await get_tracking_info(tracking_number, logistics_company)
    
    return {
        "tracking_number": tracking_number,
        "logistics_company": logistics_company,
        **tracking_data,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)