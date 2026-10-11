// v1.0 | 10/10/2026 — WBT Superadmin Dashboard

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingBag, ShoppingCart, Globe, Wand2,
  ArrowUpRight, Loader2, RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react'
import { WORKER_BASE, WORKER_KEY, siteBase, portalBase } from '../constants'

interface Shop {
  id:         string
  slug:       string
  shop_type:  'ghl' | 'woocommerce'
  name:       string
  status:     'active' | 'suspended' | 'pending'
  created_at: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [shops,   setShops]   = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${WORKER_BASE}/admin/locations`, {
        headers: { 'X-Context-Key': WORKER_KEY }
      })
      if (!r.ok) throw new Error(`Worker error ${r.status}`)
      const d = await r.json()
      setShops(d.locations || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const total   = shops.length
  const ghlCnt  = shops.filter(s => s.shop_type === 'ghl').length
  const wooCnt  = shops.filter(s => s.shop_type === 'woocommerce').length
  const active  = shops.filter(s => s.status === 'active').length
  const recent  = [...shops].sort((a, b) => b.created_at - a.created_at).slice(0, 5)

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">WebsiteBuildingTool.com — Superadmin</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Shops"
          value={loading ? '—' : String(total)}
          icon={<ShoppingBag size={16} className="text-indigo-500" />}
          color="indigo"
        />
        <StatCard
          label="GHL"
          value={loading ? '—' : String(ghlCnt)}
          icon={<ShoppingBag size={16} className="text-blue-500" />}
          color="blue"
        />
        <StatCard
          label="WooCommerce"
          value={loading ? '—' : String(wooCnt)}
          icon={<ShoppingCart size={16} className="text-purple-500" />}
          color="purple"
        />
        <StatCard
          label="Active"
          value={loading ? '—' : String(active)}
          icon={<CheckCircle2 size={16} className="text-emerald-500" />}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Recent shops */}
        <div className="sm:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <span className="text-xs font-semibold text-gray-700">Recent Shops</span>
            <button
              onClick={() => navigate('/shops')}
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight size={11} />
            </button>
          </div>
          {loading && (
            <div className="flex items-center justify-center h-24 text-gray-300">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
          {!loading && recent.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-400">
              No shops yet.
              <button onClick={() => navigate('/wizard')} className="ml-1 text-indigo-600 hover:underline">Add one</button>
            </div>
          )}
          {!loading && recent.map(shop => (
            <div key={shop.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {shop.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{shop.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-mono">{shop.slug}</span>
                    <span className={`text-[9px] font-semibold px-1 py-0.5 rounded ${
                      shop.shop_type === 'ghl' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {shop.shop_type === 'ghl' ? 'GHL' : 'WOO'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {shop.shop_type === 'ghl' && (
                  <a href={siteBase(shop.slug)} target="_blank" rel="noreferrer"
                    className="p-1.5 text-gray-300 hover:text-indigo-500 rounded transition-colors" title="Public site">
                    <Globe size={13} />
                  </a>
                )}
                <a href={portalBase(shop.slug)} target="_blank" rel="noreferrer"
                  className="p-1.5 text-gray-300 hover:text-indigo-500 rounded transition-colors" title="Customer portal">
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-700 px-1">Quick Actions</div>
          <QuickAction
            icon={<Wand2 size={15} className="text-indigo-600" />}
            label="Add New Shop"
            desc="Run the onboarding wizard"
            color="indigo"
            onClick={() => navigate('/wizard')}
          />
          <QuickAction
            icon={<Globe size={15} className="text-blue-600" />}
            label="Domain Manager"
            desc="Add or verify custom domains"
            color="blue"
            onClick={() => navigate('/domains')}
          />
          <QuickAction
            icon={<ShoppingBag size={15} className="text-emerald-600" />}
            label="All Shops"
            desc={`Manage ${total} shop${total !== 1 ? 's' : ''}`}
            color="emerald"
            onClick={() => navigate('/shops')}
          />

          {/* System info */}
          <div className="bg-gray-50 rounded-xl p-3 mt-2">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">System</div>
            <div className="space-y-1">
              <SysRow label="Worker" value="ecommerce-niche-worker v0.3.0" />
              <SysRow label="Domain" value="websitebuildingtool.com" />
              <SysRow label="DB" value="ecom-db (D1)" />
              <SysRow label="Storage" value="ecom-media (R2)" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode; color: string
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50', blue: 'bg-blue-50', purple: 'bg-purple-50', emerald: 'bg-emerald-50'
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`w-7 h-7 rounded-lg ${bg[color] || 'bg-gray-50'} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function QuickAction({ icon, label, desc, color, onClick }: {
  icon: React.ReactNode; label: string; desc: string; color: string; onClick: () => void
}) {
  const border: Record<string, string> = {
    indigo: 'hover:border-indigo-200 hover:bg-indigo-50/50',
    blue:   'hover:border-blue-200 hover:bg-blue-50/50',
    emerald:'hover:border-emerald-200 hover:bg-emerald-50/50',
  }
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 text-left transition-all ${border[color] || ''}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-gray-400">{desc}</div>
      </div>
    </button>
  )
}

function SysRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className="text-[10px] font-medium text-gray-600 truncate max-w-[130px]">{value}</span>
    </div>
  )
}
