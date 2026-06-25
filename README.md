# Shipping Calculator

A full-stack application for calculating shipping costs with product listing, GST, and tracking information.

## Project Structure

```
.
├── backend/              # FastAPI Backend
│   ├── src/
│   │   ├── main.py       # API endpoints
│   │   ├── models.py     # Pydantic models
│   │   └── shipping.py   # Shipping fee calculation
│   ├── pyproject.toml    # Python dependencies
│   └── .env              # Environment variables
│
├── frontend/             # React + Vite + Tailwindcss Frontend
│   ├── src/
│   │   ├── App.tsx       # Main application component
│   │   ├── main.tsx      # Entry point
│   │   └── index.css     # Tailwind styles
│   ├── package.json
│   └── ...
│
└── plans/                # Project requirements and data examples
```

## Setup & Running

### Backend

```bash
cd backend
uv sync
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will start at `http://localhost:8000`

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

The frontend will start at `http://localhost:5173`

## Features

1. **Product List**: Fetches products from Google Apps Script API
2. **Order Calculation**:
   - Subtotal (SKU price × quantity)
   - GST (10% of subtotal)
   - Shipment Fee (calculated based on weight, dimensions, and destination)
   - Total (Subtotal + GST + Shipment Fee)
3. **Tracking Information**: Retrieves tracking status from Australia Post, StarTrack, or TNT APIs

## API Endpoints

- `GET /api/products` - Fetch product list
- `POST /api/calculate` - Calculate order totals
- `GET /api/tracking/{tracking_number}` - Get tracking info

## Environment Variables

See `backend/.env` for required API keys and configuration.