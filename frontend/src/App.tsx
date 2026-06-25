import { useState, useEffect } from 'react'
import { Package, Truck, MapPin, Clock, CheckCircle } from 'lucide-react'
import { config } from './config'

interface Product {
  SKU: string
  ProductName: string
  RRP: string
  weight: string
  length: string
  width: string
  height: string
  volume: string
}

interface LineItem {
  sku_code: string
  name: string
  quantity: number
  price_per_unit: number
  line_total: number
  image: string | null
}

interface Summary {
  subtotal: number
  gst: number
  shipment_fee: number
  total: number
}

interface TrackingInfo {
  tracking_number: string
  logistics_company: string
  status: string | null
  last_update: string | null
}

interface OrderResponse {
  line_items: LineItem[]
  summary: Summary
  tracking_info: TrackingInfo[]
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map())
  const [destinationPostcode, setDestinationPostcode] = useState('')
  const [trackingNumbers, setTrackingNumbers] = useState('')
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/products`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.rows || [])
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }

  const handleQuantityChange = (sku: string, quantity: number) => {
    const newSelected = new Map(selectedProducts)
    if (quantity <= 0) {
      newSelected.delete(sku)
    } else {
      newSelected.set(sku, quantity)
    }
    setSelectedProducts(newSelected)
    setOrderResult(null)
  }

  const calculateOrder = async () => {
    if (selectedProducts.size === 0) {
      setError('Please select at least one product')
      return
    }

    if (!destinationPostcode) {
      setError('Please enter destination postcode')
      return
    }

    setLoading(true)
    setError(null)

    const items = Array.from(selectedProducts.entries()).map(([sku, quantity]) => {
      const product = products.find(p => p.SKU === sku)
      return {
        sku,
        name: product?.ProductName || sku,
        quantity,
        price: parseFloat(product?.RRP || '0'),
        weight: product?.weight,
        length: product?.length,
        width: product?.width,
        height: product?.height,
        volume: product?.volume,
      }
    })

    const trackingList = trackingNumbers
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(tracking_number => ({ tracking_number, logistics_company: '' }))

    try {
      const response = await fetch(`${config.apiBaseUrl}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          destination_postcode: destinationPostcode,
          tracking_numbers: trackingList,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setOrderResult(data)
      } else {
        const err = await response.json()
        setError(err.detail || 'Failed to calculate order')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-600 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <Package size={32} />
            <h1 className="text-2xl font-bold">Shipping Calculator</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Selection */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="text-blue-600" size={24} />
              Select Products
            </h2>

            {products.length === 0 ? (
              <p className="text-gray-500">Loading products...</p>
            ) : (
              <div className="space-y-4">
                {products.map(product => (
                  <div
                    key={product.SKU}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.ProductName}</h3>
                        <p className="text-sm text-gray-500">SKU: {product.SKU}</p>
                        <p className="text-lg font-semibold text-blue-600 mt-1">
                          {formatPrice(parseFloat(product.RRP))}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Weight: {product.weight} | Size: {product.length} x {product.width} x {product.height}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(product.SKU, (selectedProducts.get(product.SKU) || 0) - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">
                          {selectedProducts.get(product.SKU) || 0}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product.SKU, (selectedProducts.get(product.SKU) || 0) + 1)}
                          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Destination Input */}
            <div className="mt-6 pt-6 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin size={16} className="inline mr-1" />
                Destination Postcode
              </label>
              <input
                type="text"
                value={destinationPostcode}
                onChange={e => setDestinationPostcode(e.target.value)}
                placeholder="Enter postcode (e.g., 2000)"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Tracking Numbers Input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Truck size={16} className="inline mr-1" />
                Tracking Numbers (one per line, optional)
              </label>
              <textarea
                value={trackingNumbers}
                onChange={e => setTrackingNumbers(e.target.value)}
                placeholder="Enter tracking numbers..."
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculateOrder}
              disabled={loading || selectedProducts.size === 0}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Calculating...' : 'Calculate Order'}
            </button>

            {error && (
              <p className="mt-4 text-red-600 text-center">{error}</p>
            )}
          </section>

          {/* Results */}
          <section className="space-y-6">
            {orderResult ? (
              <>
                {/* Line Items */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Package className="text-blue-600" size={24} />
                    Order Items
                  </h2>
                  <div className="space-y-4">
                    {orderResult.line_items.map(item => (
                      <div key={item.sku_code} className="flex items-center gap-4 pb-4 border-b last:border-b-0">
                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-gray-500">SKU: {item.sku_code}</p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} x {formatPrice(item.price_per_unit)} = {formatPrice(item.line_total)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Summary</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal (incl. GST)</span>
                      <span className="font-medium">{formatPrice(orderResult.summary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">GST (10%)</span>
                      <span className="font-medium">{formatPrice(orderResult.summary.gst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Truck size={16} />
                        Shipment Fee
                      </span>
                      <span className="font-medium">{formatPrice(orderResult.summary.shipment_fee)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-lg font-bold text-blue-600">{formatPrice(orderResult.summary.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Tracking Info */}
                {orderResult.tracking_info.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <Clock className="text-blue-600" size={24} />
                      Tracking Information
                    </h2>
                    <div className="space-y-4">
                      {orderResult.tracking_info.map((tracking, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{tracking.tracking_number}</p>
                              <p className="text-sm text-gray-500">{tracking.logistics_company}</p>
                            </div>
                            {tracking.status && (
                              <span className={`px-2 py-1 rounded text-sm ${
                                tracking.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                tracking.status.startsWith('Error') ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {tracking.status}
                              </span>
                            )}
                          </div>
                          {tracking.last_update && (
                            <p className="text-sm text-gray-500 mt-2">
                              Last Update: {tracking.last_update}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Package className="mx-auto text-gray-300" size={64} />
                <p className="mt-4 text-gray-500">Select products and enter details to see the order summary</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default App