import httpx
import os
import logging
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AUSPOST_API_KEY = os.getenv("AUSPOST_API_KEY")
AUSPOST_API_PASSWORD = os.getenv("AUSPOST_API_PASSWORD")
AUSPOST_API_URL = os.getenv("AUSPOST_API_URL")

STARTRACK_API_KEY = os.getenv("STARTRACK_API_KEY")
STARTRACK_API_PASSWORD = os.getenv("STARTRACK_API_PASSWORD")
STARTRACK_API_URL = os.getenv("STARTRACK_API_URL")

ORIGIN_POSTCODE = os.getenv("ORIGIN_POSTCODE", "2111")


def get_auth_header(api_key: str, api_password: str) -> dict:
    """Generate Basic Auth header for API requests"""
    import base64
    credentials = f"{api_key}:{api_password}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded}"}


def get_logistics_company(tracking_number: str) -> str:
    """Determine logistics company based on tracking number format"""
    # StarTrack typically starts with "ST" or "7T"
    if tracking_number.startswith("ST") or tracking_number.startswith("7T"):
        return "StarTrack"
    # TNT typically starts with "TNT"
    elif tracking_number.startswith("TNT"):
        return "TNT"
    # Default to Australia Post
    else:
        return "AustraliaPost"


async def get_auspost_shipping_fee(
    destination_postcode: str,
    weight: float,
    length: float = 10,
    width: float = 10,
    height: float = 10,
) -> float:
    """Get shipping fee from Australia Post API
    
    Note: The actual Australia Post API requires complex rate calculation.
    This is a simplified implementation based on weight and dimensions.
    """
    # Simplified shipping calculation
    # Actual API call would require account details and more parameters
    # Using a placeholder calculation based on common shipping rates
    
    logger.info(f"Calculating shipping fee for postcode: {destination_postcode}, weight: {weight}kg")
    
    # Volumetric weight calculation
    volumetric_weight = (length * width * height) / 5000
    chargeable_weight = max(weight, volumetric_weight)
    
    # Base rate + per kg rate (simplified)
    base_rate = 10.0
    per_kg_rate = 5.0
    
    # Distance factor (simplified - based on postcode difference)
    try:
        origin = int(ORIGIN_POSTCODE)
        dest = int(destination_postcode)
        distance_factor = 1 + abs(dest - origin) / 10000
    except:
        distance_factor = 1.0
    
    estimated_fee = (base_rate + (chargeable_weight * per_kg_rate)) * distance_factor
    logger.info(f"Calculated fee: {estimated_fee}")
    
    return round(estimated_fee, 2)


async def get_startrack_tracking(tracking_number: str) -> dict:
    """Get tracking info from StarTrack API"""
    logger.info(f"Fetching StarTrack tracking for: {tracking_number}")
    headers = get_auth_header(STARTRACK_API_KEY, STARTRACK_API_PASSWORD)
    headers["Content-Type"] = "application/json"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{STARTRACK_API_URL}/v1/tracking/{tracking_number}",
                headers=headers,
                timeout=10.0,
            )
            logger.info(f"StarTrack API response status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": data.get("status", "Unknown"),
                    "last_update": data.get("lastUpdated", None),
                }
        except Exception as e:
            logger.error(f"StarTrack API error: {e}")
            return {"status": f"Error: {str(e)}", "last_update": None}
    
    return {"status": "Not Found", "last_update": None}


async def get_auspost_tracking(tracking_number: str) -> dict:
    """Get tracking info from Australia Post API"""
    logger.info(f"Fetching Australia Post tracking for: {tracking_number}")
    headers = get_auth_header(AUSPOST_API_KEY, AUSPOST_API_PASSWORD)
    headers["Content-Type"] = "application/json"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{AUSPOST_API_URL}/shipping/v1/track",
                params={"trackingId": tracking_number},
                headers=headers,
                timeout=10.0,
            )
            logger.info(f"Australia Post API response status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": data.get("status", "Unknown"),
                    "last_update": data.get("lastUpdated", None),
                }
        except Exception as e:
            logger.error(f"Australia Post API error: {e}")
            return {"status": f"Error: {str(e)}", "last_update": None}
    
    return {"status": "Not Found", "last_update": None}


async def get_tracking_info(tracking_number: str, logistics_company: str = None) -> dict:
    """Get tracking info based on logistics company"""
    if logistics_company is None:
        logistics_company = get_logistics_company(tracking_number)
    
    logger.info(f"Getting tracking info for {tracking_number} via {logistics_company}")
    
    if logistics_company == "StarTrack":
        return await get_startrack_tracking(tracking_number)
    elif logistics_company == "TNT":
        # TNT uses similar API to StarTrack
        return await get_startrack_tracking(tracking_number)
    else:
        return await get_auspost_tracking(tracking_number)


async def calculate_shipment_fee(
    items: list,
    destination_postcode: str,
) -> float:
    """Calculate total shipment fee for all items"""
    logger.info(f"Calculating shipment fee for {len(items)} items to postcode {destination_postcode}")
    total_fee = 0.0
    
    for item in items:
        weight = float(item.get("weight", "0.2g").replace("g", "")) if item.get("weight") else 0.2
        length = float(item.get("length", "10.0mm").replace("mm", "")) if item.get("length") else 10.0
        width = float(item.get("width", "10.0mm").replace("mm", "")) if item.get("width") else 10.0
        height = float(item.get("height", "10.0mm").replace("mm", "")) if item.get("height") else 10.0
        
        fee = await get_auspost_shipping_fee(
            destination_postcode=destination_postcode,
            weight=weight,
            length=length,
            width=width,
            height=height,
        )
        total_fee += fee
    
    logger.info(f"Total shipment fee: {total_fee}")
    return round(total_fee, 2)