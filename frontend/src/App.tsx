import { useState, useEffect } from 'react'
import { Package, Truck, MapPin, Clock, ShoppingCart, Plus, Minus, Trash2, User, Phone, Mail, ChevronRight, ArrowLeft } from 'lucide-react'
import { config } from './config'

interface Product {
  SKU: string
  ProductName: string
  RRP: string
  Description: string
  PlantSpecies: string
  Spectrum: string
  StrainLineage: string
  weight: string
  length: string
  width: string
  height: string
  volume: string
  DosageType: string
  Barcode: string
  Size: string
}

interface CartItem {
  product: Product
  quantity: number
  tracking_number?: string
  logistics_company?: string
}

interface LineItem {
  sku_code: string
  name: string
  quantity: number
  price_per_unit: number
  line_total: number
  image: string | null
  assigned_tracking?: string | null
  tracking_no?: string | null
  logistics_company?: string | null
  tracking_status?: string | null
  tracking_last_update?: string | null
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

interface CustomerInfo {
  name: string
  phone: string
  email: string
  address: string
  suburb: string
  state: string
  postcode: string
}

type Page = 'ordering' | 'order'

function generateMockId() {
  return 'ORD-' + Date.now().toString(36).toUpperCase()
}

function App() {
  const [page, setPage] = useState<Page>('ordering')
  const [orderId, setOrderId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: '',
    address: '',
    suburb: '',
    state: '',
    postcode: '',
  })
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

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.SKU === product.SKU)
      if (existing) {
        return prev.map(item =>
          item.product.SKU === product.SKU
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (sku: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.SKU === sku) {
          const newQty = item.quantity + delta
          return newQty <= 0 ? null : { ...item, quantity: newQty }
        }
        return item
      }).filter(Boolean) as CartItem[]
    })
  }

  const removeFromCart = (sku: string) => {
    setCart(prev => prev.filter(item => item.product.SKU !== sku))
  }

  const updateTracking = (sku: string, tracking_number: string) => {
    setCart(prev => prev.map(item =>
      item.product.SKU === sku ? { ...item, tracking_number } : item
    ))
  }

  const submitOrder = async () => {
    if (cart.length === 0) {
      setError('Please add at least one product to cart')
      return
    }
    if (!customerInfo.postcode) {
      setError('Please enter destination postcode')
      return
    }

    setLoading(true)
    setError(null)

    const parseDim = (val: string | undefined): number | null => {
      if (!val) return null
      const num = parseFloat(val.replace(/[^0-9.]/g, ''))
      return isNaN(num) ? null : num
    }

    const items = cart.map(item => ({
      sku: item.product.SKU,
      name: item.product.ProductName,
      quantity: item.quantity,
      price: parseFloat(item.product.RRP || '0'),
      weight: parseDim(item.product.weight),
      length: parseDim(item.product.length),
      width: parseDim(item.product.width),
      height: parseDim(item.product.height),
      volume: parseDim(item.product.volume),
      tracking_number: item.tracking_number || undefined,
      logistics_company: item.logistics_company || undefined,
    }))

    try {
      const response = await fetch(`${config.apiBaseUrl}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          destination_postcode: customerInfo.postcode,
        }),
      })

      if (response.ok) {
        const data: OrderResponse = await response.json()
        setOrderResult(data)
        setOrderId(generateMockId())
        setPage('order')
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

  const backToOrdering = () => {
    setPage('ordering')
    setOrderResult(null)
    setOrderId('')
  }

  const formatPrice = (price: number) => `$${price.toFixed(2)}`

  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.product.RRP) * item.quantity, 0)

  const getCategoryColor = (species: string) => {
    const colors: Record<string, string> = {
      'Indica': 'bg-purple-100 text-purple-800',
      'Sativa': 'bg-orange-100 text-orange-800',
      'Indica Dominant': 'bg-indigo-100 text-indigo-800',
      'Sativa Dominant': 'bg-amber-100 text-amber-800',
    }
    return colors[species] || 'bg-gray-100 text-gray-800'
  }

  // ==================== Order Summary Page ====================
  if (page === 'order' && orderResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-blue-600 text-white py-3 shadow-lg sticky top-0 z-50">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package size={28} />
              <h1 className="text-xl font-bold">Order #{orderId}</h1>
            </div>
            <button
              onClick={backToOrdering}
              className="flex items-center gap-1 text-sm bg-blue-500 hover:bg-blue-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-6">
              {/* Order Items with Tracking */}
              <section className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <ShoppingCart size={20} className="text-blue-600" />
                  Order Items
                </h2>
                <div className="space-y-3">
                  {orderResult.line_items.map(item => (
                    <div key={item.sku_code} className="pb-3 border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 border border-dashed rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package size={18} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">SKU: {item.sku_code}</p>
                          <p className="text-xs text-gray-600">{item.quantity} x {formatPrice(item.price_per_unit)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-blue-600">{formatPrice(item.line_total)}</p>
                        </div>
                      </div>
                      {/* Tracking per SKU */}
                      <div className="mt-2 border-t pt-2 text-xs space-y-1">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Truck size={12} />
                          <span className="font-medium">Tracking:</span>
                          <span>{item.tracking_no || 'Not assigned'}</span>
                        </div>
                        {item.tracking_no && (
                          <>
                            <div className="text-gray-500">
                              <span className="font-medium text-gray-600">Assigned:</span> {item.assigned_tracking || '-'}
                            </div>
                            <div className="text-gray-500">
                              <span className="font-medium text-gray-600">Logistics:</span> {item.logistics_company || '-'}
                            </div>
                            {item.tracking_status && (
                              <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                                item.tracking_status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                item.tracking_status.startsWith('Error') ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {item.tracking_status}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini Cost Summary */}
                <div className="mt-3 pt-3 border-t space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatPrice(orderResult.summary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">GST (10%)</span>
                    <span>{formatPrice(orderResult.summary.gst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Truck size={14} /> Shipping
                    </span>
                    <span>{formatPrice(orderResult.summary.shipment_fee)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t font-semibold">
                    <span>Total</span>
                    <span className="text-blue-600">{formatPrice(orderResult.summary.total)}</span>
                  </div>
                </div>
              </section>

              {/* Customer Contact Info */}
              <section className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  Contact Info
                </h2>
                <div className="space-y-2 text-sm">
                  {customerInfo.name && (
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span>{customerInfo.name}</span>
                    </div>
                  )}
                  {customerInfo.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400" />
                      <span>{customerInfo.phone}</span>
                    </div>
                  )}
                  {customerInfo.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-gray-400" />
                      <span className="text-blue-600">{customerInfo.email}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-gray-400 mt-0.5" />
                    <div>
                      <p>{customerInfo.address}</p>
                      <p className="text-gray-500">
                        {[customerInfo.suburb, customerInfo.state, customerInfo.postcode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column - Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Full Order Summary */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-600">Subtotal (incl. GST)</span>
                    <span className="font-semibold">{formatPrice(orderResult.summary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST (10%)</span>
                    <span className="font-medium">{formatPrice(orderResult.summary.gst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Truck size={18} />
                      Shipment Fee
                    </span>
                    <span className="font-medium">{formatPrice(orderResult.summary.shipment_fee)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-xl font-bold">Total</span>
                    <span className="text-2xl font-bold text-blue-600">{formatPrice(orderResult.summary.total)}</span>
                  </div>
                </div>
              </div>

              {/* All Items w/ Tracking Detail */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Package className="text-blue-600" size={24} />
                  All Items
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2">Product</th>
                      <th className="pb-2">SKU</th>
                      <th className="pb-2 text-center">Qty</th>
                      <th className="pb-2 text-right">Price</th>
                      <th className="pb-2 text-right">Total</th>
                      <th className="pb-2">Tracking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderResult.line_items.map(item => (
                      <tr key={item.sku_code} className="border-b last:border-b-0">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 border border-dashed rounded-lg flex-shrink-0" />
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-gray-500">{item.sku_code}</td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right">{formatPrice(item.price_per_unit)}</td>
                        <td className="py-3 text-right font-medium">{formatPrice(item.line_total)}</td>
                        <td className="py-3">
                          {item.tracking_no ? (
                            <div className="text-xs space-y-0.5">
                              <p><span className="text-gray-500">#</span> {item.tracking_no}</p>
                              <p className="text-gray-500">{item.logistics_company}</p>
                              {item.tracking_status && (
                                <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                                  item.tracking_status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                  item.tracking_status.startsWith('Error') ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {item.tracking_status}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ==================== Ordering Page ====================
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white py-3 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package size={28} />
              <h1 className="text-xl font-bold">Product Order</h1>
            </div>
            <div className="flex items-center gap-2 bg-blue-500 px-3 py-1.5 rounded-lg">
              <ShoppingCart size={20} />
              <span className="font-semibold">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Side - Product Catalog */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package size={20} className="text-blue-600" />
              Product Catalog
            </h2>

            {products.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Loading products...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {products.map(product => (
                  <div key={product.SKU} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 h-36 flex items-center justify-center rounded-t-lg border-b">
                      <div className="w-20 h-20 bg-white border-2 border-dashed border-blue-300 rounded-xl flex items-center justify-center">
                        <Package size={36} className="text-blue-400" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-2">
                        {product.ProductName}
                      </h3>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {product.PlantSpecies && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(product.PlantSpecies)}`}>
                            {product.PlantSpecies}
                          </span>
                        )}
                        {product.Spectrum && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            {product.Spectrum}
                          </span>
                        )}
                      </div>
                      {product.Description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                          {product.Description.replace(/\n/g, ' ')}
                        </p>
                      )}
                      <div className="text-xs text-gray-400 mb-3 space-y-0.5">
                        <span>SKU: {product.SKU}</span>
                        {product.weight && <span> | Weight: {product.weight}</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(parseFloat(product.RRP))}
                        </span>
                        <button
                          onClick={() => addToCart(product)}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          <ShoppingCart size={16} />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Cart & Shipping */}
          <div className="lg:col-span-1 space-y-6">
            {/* Shopping Cart w/ Per-Item Tracking */}
            <section className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart size={20} className="text-blue-600" />
                  Cart
                  {cart.length > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full ml-auto">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </h2>
              </div>

              <div className="p-4">
                {cart.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Cart is empty</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.product.SKU} className="pb-3 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 border border-dashed border-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package size={18} className="text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product.ProductName}</p>
                            <p className="text-xs text-gray-500">{formatPrice(parseFloat(item.product.RRP))} ea</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQuantity(item.product.SKU, -1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                              <Minus size={12} />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.SKU, 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                              <Plus size={12} />
                            </button>
                          </div>
                          <button onClick={() => removeFromCart(item.product.SKU)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {/* Tracking number input per item */}
                        <div className="mt-2 ml-13 pl-11">
                          <input
                            type="text"
                            value={item.tracking_number || ''}
                            onChange={e => updateTracking(item.product.SKU, e.target.value)}
                            placeholder="Tracking number (optional)"
                            className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {cart.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="text-lg font-bold text-blue-600">{formatPrice(cartTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Shipping Info */}
            <section className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck size={20} className="text-blue-600" />
                Shipping Info
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <User size={12} className="inline mr-1" /> Name
                  </label>
                  <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                    placeholder="Name" className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      <Phone size={12} className="inline mr-1" /> Phone
                    </label>
                    <input type="text" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      placeholder="Phone" className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      <Mail size={12} className="inline mr-1" /> Email
                    </label>
                    <input type="email" value={customerInfo.email} onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})}
                      placeholder="Email" className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <MapPin size={12} className="inline mr-1" /> Address
                  </label>
                  <input type="text" value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                    placeholder="Street address" className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Suburb</label>
                    <input type="text" value={customerInfo.suburb} onChange={e => setCustomerInfo({...customerInfo, suburb: e.target.value})}
                      placeholder="Suburb" className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                    <input type="text" value={customerInfo.state} onChange={e => setCustomerInfo({...customerInfo, state: e.target.value})}
                      placeholder="State" className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Postcode *</label>
                    <input type="text" value={customerInfo.postcode} onChange={e => setCustomerInfo({...customerInfo, postcode: e.target.value})}
                      placeholder="Required" className="w-full px-3 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <button onClick={submitOrder} disabled={loading || cart.length === 0}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                {loading ? 'Processing...' : 'Submit Order'}
                <ChevronRight size={18} />
              </button>

              {error && <p className="mt-3 text-red-600 text-sm text-center">{error}</p>}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App