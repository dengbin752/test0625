import logging
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ORIGIN_POSTCODE = "2111"


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


def generate_tracking_number(logistics: str = None) -> tuple[str, str]:
    """Generate a random tracking number and determine logistics company
    
    Returns:
        tuple of (tracking_number, logistics_company)
    """
    import random
    import uuid
    
    if logistics is None:
        logistics = random.choice(["StarTrack", "TNT", "AustraliaPost"])
    
    if logistics == "StarTrack":
        # StarTrack format: ST + 8 digits, or 7T + 8 digits
        prefix = random.choice(["ST", "7T"])
        num = ''.join(random.choices("0123456789", k=8))
        tracking = f"{prefix}{num}"
    elif logistics == "TNT":
        # TNT format: TNT + 9 digits
        num = ''.join(random.choices("0123456789", k=9))
        tracking = f"TNT{num}"
    else:
        # Australia Post: 12-14 alphanumeric (e.g., AE123456789AU)
        prefix = ''.join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2))
        num = ''.join(random.choices("0123456789", k=9))
        suffix = ''.join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2))
        tracking = f"{prefix}{num}{suffix}"
    
    return tracking, logistics


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


def _mock_tracking_data(tracking_number: str, logistics_company: str) -> dict:
    """Generate mock tracking data for demonstration"""
    import random
    from datetime import datetime, timedelta
    
    statuses = [
        "In Transit",
        "Processed at Facility",
        "Out for Delivery",
        "On Board for Delivery",
        "Collected",
    ]
    
    status = random.choice(statuses)
    
    # Random last update within the last 5 days
    hours_ago = random.randint(1, 120)
    last_update = (datetime.now() - timedelta(hours=hours_ago)).strftime("%Y-%m-%d %H:%M:%S")
    
    return {
        "status": status,
        "last_update": last_update,
    }


async def get_tracking_info(tracking_number: str, logistics_company: str = None) -> dict:
    """Get mock tracking info based on logistics company"""
    if logistics_company is None:
        logistics_company = get_logistics_company(tracking_number)
    
    logger.info(f"Getting mock tracking info for {tracking_number} via {logistics_company}")
    
    return _mock_tracking_data(tracking_number, logistics_company)


def _to_float(val) -> float:
    """Convert a value to float, handling both string suffixes and raw numbers"""
    if val is None:
        return 0.0
    if isinstance(val, (int, float)):
        return float(val)
    # String with possible unit suffix like "0.2g", "10.0mm"
    num_str = str(val).replace("g", "").replace("mm", "").replace("mm³", "").strip()
    try:
        return float(num_str)
    except (ValueError, TypeError):
        return 0.0


async def calculate_shipment_fee(
    items: list,
    destination_postcode: str,
) -> float:
    """Calculate total shipment fee for all items"""
    logger.info(f"Calculating shipment fee for {len(items)} items to postcode {destination_postcode}")
    total_fee = 0.0
    
    for item in items:
        weight = _to_float(item.get("weight"))
        length = _to_float(item.get("length"))
        width = _to_float(item.get("width"))
        height = _to_float(item.get("height"))
        
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