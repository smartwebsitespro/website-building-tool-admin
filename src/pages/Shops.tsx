// v1.0 | 10/10/2026 — Shops list: reads from ecommerce-niche-worker /admin/locations

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Globe, Plus, RefreshCw, Loader2, Pencil, ShoppingBag, ShoppingCart } from 'lucide-react'
import { WORKER_BASE, WORKER_KEY, portalBase, siteBase } from '../constants'

interface Shop {
  id:            string
  slug:          string
  shop_type:     'ghl' | 'woocommerce'
  name:          string
  status:        'active' | 'suspended' | 'pending'
  custom_domain: string | null
  atmosphere:    string | null
  created_at:    number
}

export default function Shops() {
  const navigate = useNavigate()
  const [shops,   setShops]   = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${WORKER_BASE}/admin/locations`, {
        headers: { 'X-Context-Key': WORKER_KEY },
      })
      if (!r.ok) throw new Error(`Worker error ${r.status}`)
      const d = await r.json()
      setShops(d.locations || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load shops')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const statusColor = (s: Shop['status']) =>
    s === 'active'    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
    s === 'suspended' ? 'bg-red-50 text-red-600 border-red-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'

  const typeLabel = (t: Shop['shop_type']) =>
    t === 'ghl' ? 'GHL' : 'WooCommerce'

  const typeColor = (t: Shop['shop_type']) =>
    t === 'ghl'
      ? 'bg-blue-50 text-blue-700 border-blue-100'
      : 'bg-purple-50 text-purple-700 border-purple-100'

  const TypeIcon = ({ type }: { type: Shop['shop_type'] }) =>
    type === 'ghl'
      ? <ShoppingBag size={14} className="text-blue-500" />
      : <ShoppingCart size={14} className="text-purple-500" />

  const publicUrl = (shop: Shop) =>
    shop.custom_domain
      ? `https://${shop.custom_domain}`
      : siteBase(shop.slug)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          All Shops {!loading && `(${shops.length})`}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
          <button
            onClick={() => navigate('/wizard')}
            className="flex items-center gap-1.5 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={13} /> Add Shop
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !shops.length && (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading shops…
        </div>
      )}

      {/* Empty */}
      {!loading && !error && shops.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <ShoppingBag size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400 mb-3">No shops configured yet.</p>
          <button
            onClick={() => navigate('/wizard')}
            className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add your first shop
          </button>
        </div>
      )}

      {/* Shop list */}
      {shops.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
          {shops.map(shop => (
            <div key={shop.id} className="p-4 flex items-center justify-between gap-4">

              {/* Left: icon + info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                  {shop.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">{shop.name}</span>
                    {/* Shop type badge */}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${typeColor(shop.shop_type)}`}>
                      <TypeIcon type={shop.shop_type} />
                      {typeLabel(shop.shop_type)}
                    </span>
                    {/* Status badge */}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusColor(shop.status)}`}>
                      {shop.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400 font-mono">{shop.slug}</span>
                    {shop.atmosphere && (
                      <span className="text-xs text-gray-400">{shop.atmosphere}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: links + edit */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Public site link (GHL mode only) */}
                {shop.shop_type === 'ghl' && (
                  <a
                    href={publicUrl(shop)}
                    target="_blank"
                    rel="noreferrer"
                    title="Public site"
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Globe size={15} />
                  </a>
                )}
                {/* Customer portal link */}
                <a
                  href={portalBase(shop.slug)}
                  target="_blank"
                  rel="noreferrer"
                  title="Customer portal"
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <ExternalLink size={15} />
                </a>
                {/* Edit */}
                <button
                  onClick={() => navigate(`/wizard/${shop.slug}`)}
                  title="Edit shop"
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Pencil size={15} />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  )
}
