// DomainManager.tsx -- PackedHouse Domain Manager
// v1.2 | 10/01/2026 6:55 PM PDT -- Feat: load from GET /admin/restaurants (worker KV) instead of GHL Objects — all restaurants now visible including new clients
// v1.1 | 09/30/2026 -- Add Edit Record modal: slug + status editable via GHL Objects PUT
// v1.0.1 | 09/06/2026 -- Fix: load uses POST /records/search (GET /records returns 404)
// v1.0.0 | 09/06/2026 -- Initial build for packed-house-admin
// Reads Restaurant Objects from GHL, manages domain Ã¢ÂÂ locationId KV mappings
//
// Env vars required:
//   VITE_PH_HQ_PIT        PackedHouse HQ PIT (read/write GHL Objects)
//   VITE_NICHE_WORKER_URL  niche-engine-worker base URL
//   VITE_NICHE_KEY         niche-engine-worker X-Context-Key
//
// Worker dep: niche-engine-worker must expose POST/DELETE /admin/domain (added in v0.3.20)
//
// KV domain entry format:  domain:{hostname} Ã¢ÂÂ locationId (plain string)
// KV config entry format:  {locationId}/config Ã¢ÂÂ JSON config object
//
// NOTE: After syncing all domains to KV, the hardcoded SUBDOMAIN_LOCATIONS
// in the worker can be removed in a future cleanup (worker will use KV for all routing).

import { useState, useEffect, useCallback } from 'react'
import {
  Globe, RefreshCw, Pencil, CheckCircle2, AlertCircle,
  Loader2, X, Search, Copy, Check, ChevronLeft, ChevronRight,
  ArrowUpDown, Link2Off,
} from 'lucide-react'

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Constants Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const GHL_BASE       = 'https://services.leadconnectorhq.com'
const PH_HQ_PIT      = import.meta.env.VITE_PH_HQ_PIT       || ''
const PH_HQ_LOCATION = 'IItnQQlfspb8rCoaDSuB'
const NICHE_WORKER   = import.meta.env.VITE_NICHE_WORKER_URL || ''
const NICHE_KEY      = import.meta.env.VITE_NICHE_KEY        || ''
const PAGE_SIZE      = 12

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Types Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
interface Restaurant {
  recordId:       string
  restaurantName: string
  slug:           string
  publicDomain:   string
  customDomain:   string
  status:         string
  ghlLocationId:  string
  synced:         boolean   // optimistic Ã¢ÂÂ true after a successful sync this session
}

type Modal = null | 'edit-custom' | 'edit-record'

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Helpers Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function ghlHeaders(): Record<string, string> {
  return {
    Authorization:  `Bearer ${PH_HQ_PIT}`,
    'Content-Type': 'application/json',
    Version:        '2021-07-28',
  }
}

function nicheHeaders(): Record<string, string> {
  return { 'X-Context-Key': NICHE_KEY, 'Content-Type': 'application/json' }
}

function statusColor(status: string) {
  if (status === 'live')      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (status === 'setup')     return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'suspended') return 'bg-red-50 text-red-600 border-red-200'
  return 'bg-gray-50 text-gray-500 border-gray-200'
}

// Parse object record Ã¢ÂÂ Restaurant shape
function parseRecord(rec: any): Restaurant {
  const p = rec.properties || {}
  return {
    recordId:       rec.id || '',
    restaurantName: p.restaurant_name || '(unnamed)',
    slug:           p.slug            || '',
    publicDomain:   p.public_domain   || '',
    customDomain:   p.custom_domain   || '',
    status:         p.status          || 'setup',
    ghlLocationId:  p.ghl_location_id || '',
    synced:         false,
  }
}

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Component Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
export default function DomainManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadErr,     setLoadErr]     = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(1)
  const [modal,       setModal]       = useState<Modal>(null)
  const [selected,    setSelected]    = useState<Restaurant | null>(null)
  const [customInput, setCustomInput] = useState('')
  const [busy,        setBusy]        = useState(false)
  const [opErr,       setOpErr]       = useState<string | null>(null)
  const [syncingId,   setSyncingId]   = useState<string | null>(null)
  const [syncingAll,  setSyncingAll]  = useState(false)
  const [copiedKey,   setCopiedKey]   = useState<string | null>(null)
  const [editSlug,    setEditSlug]    = useState('')
  const [editStatus,  setEditStatus]  = useState('setup')

  // Ã¢ÂÂÃ¢ÂÂ Load restaurants from GHL Objects Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const load = useCallback(async () => {
    setLoading(true)
    setLoadErr(null)

    try {
      const res = await fetch(`${NICHE_WORKER}/admin/restaurants`, {
        headers: nicheHeaders(),
      })
      if (!res.ok) throw new Error(`Worker error ${res.status}`)
      const data = await res.json()
      const recs: Restaurant[] = (data.restaurants || []).map((r: any) => ({
        recordId:       r.locationId,
        restaurantName: r.restaurantName || '(unnamed)',
        slug:           r.slug || '',
        publicDomain:   r.publicDomain || '',
        customDomain:   r.customDomain || '',
        status:         r.status || 'setup',
        ghlLocationId:  r.locationId,
        synced:         true,
      }))
      setRestaurants(recs)
    } catch (e: any) {
      setLoadErr(e.message || 'Failed to load restaurants.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search])

  // Ã¢ÂÂÃ¢ÂÂ Sync one restaurant's domain KV entries Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  async function syncDomains(r: Restaurant): Promise<void> {
    const writes: Promise<void>[] = []

    // Public subdomain
    if (r.publicDomain && r.ghlLocationId) {
      writes.push(
        fetch(`${NICHE_WORKER}/admin/domain`, {
          method:  'POST',
          headers: nicheHeaders(),
          body:    JSON.stringify({ hostname: r.publicDomain, locationId: r.ghlLocationId }),
        }).then(res => { if (!res.ok) throw new Error(`Domain KV write failed for ${r.publicDomain}`) }),
      )
    }

    // Custom domain
    if (r.customDomain && r.ghlLocationId) {
      writes.push(
        fetch(`${NICHE_WORKER}/admin/domain`, {
          method:  'POST',
          headers: nicheHeaders(),
          body:    JSON.stringify({ hostname: r.customDomain, locationId: r.ghlLocationId }),
        }).then(res => { if (!res.ok) throw new Error(`Domain KV write failed for ${r.customDomain}`) }),
      )
    }

    await Promise.all(writes)
  }

  // -- Edit record (slug + status) ------------------------------------------
  function openEditRecord(r: Restaurant) {
    setSelected(r)
    setEditSlug(r.slug || '')
    setEditStatus(r.status || 'setup')
    setOpErr(null)
    setModal('edit-record')
  }

  async function handleSaveRecord() {
    if (!selected) return
    setBusy(true)
    setOpErr(null)
    try {
      const res = await fetch(
        `${GHL_BASE}/objects/custom_objects.restaurant/records/${selected.recordId}?locationId=${PH_HQ_LOCATION}`,
        {
          method:  'PUT',
          headers: ghlHeaders(),
          body:    JSON.stringify({ properties: { slug: editSlug.trim(), status: editStatus } }),
        },
      )
      if (!res.ok) throw new Error(`GHL update failed (${res.status})`)
      setRestaurants(prev => prev.map(x =>
        x.recordId === selected.recordId
          ? { ...x, slug: editSlug.trim(), status: editStatus }
          : x,
      ))
      closeModal()
    } catch (e: any) {
      setOpErr(e.message || 'Save failed.')
    }
    setBusy(false)
  }

  async function handleSyncOne(r: Restaurant) {
    setSyncingId(r.recordId)
    setOpErr(null)
    try {
      await syncDomains(r)
      setRestaurants(prev => prev.map(x => x.recordId === r.recordId ? { ...x, synced: true } : x))
    } catch (e: any) {
      setOpErr(e.message || 'Sync failed.')
    }
    setSyncingId(null)
  }

  async function handleSyncAll() {
    setSyncingAll(true)
    setOpErr(null)
    try {
      await Promise.all(restaurants.map(syncDomains))
      setRestaurants(prev => prev.map(x => ({ ...x, synced: true })))
    } catch (e: any) {
      setOpErr(e.message || 'Sync all failed.')
    }
    setSyncingAll(false)
  }

  // Ã¢ÂÂÃ¢ÂÂ Edit custom domain Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function openEditCustom(r: Restaurant) {
    setSelected(r)
    setCustomInput(r.customDomain || '')
    setOpErr(null)
    setModal('edit-custom')
  }

  function closeModal() {
    setModal(null)
    setSelected(null)
    setCustomInput('')
    setOpErr(null)
  }

  async function handleSaveCustomDomain() {
    if (!selected) return
    setBusy(true)
    setOpErr(null)
    const newCustom = customInput.trim().toLowerCase().replace(/^https?:\/\//, '')
    try {
      // 1. Update GHL Object record
      const res = await fetch(
        `${GHL_BASE}/objects/custom_objects.restaurant/records/${selected.recordId}?locationId=${PH_HQ_LOCATION}`,
        {
          method:  'PUT',
          headers: ghlHeaders(),
          body:    JSON.stringify({ properties: { custom_domain: newCustom } }),
        },
      )
      if (!res.ok) throw new Error(`GHL update failed (${res.status})`)

      // 2. Remove old custom domain KV entry if it changed
      if (selected.customDomain && selected.customDomain !== newCustom) {
        await fetch(`${NICHE_WORKER}/admin/domain`, {
          method:  'DELETE',
          headers: nicheHeaders(),
          body:    JSON.stringify({ hostname: selected.customDomain }),
        })
      }

      // 3. Write new custom domain KV entry
      if (newCustom && selected.ghlLocationId) {
        await fetch(`${NICHE_WORKER}/admin/domain`, {
          method:  'POST',
          headers: nicheHeaders(),
          body:    JSON.stringify({ hostname: newCustom, locationId: selected.ghlLocationId }),
        })
      }

      // 4. Update local state
      setRestaurants(prev => prev.map(x =>
        x.recordId === selected.recordId
          ? { ...x, customDomain: newCustom, synced: true }
          : x,
      ))
      closeModal()
    } catch (e: any) {
      setOpErr(e.message || 'Save failed.')
    }
    setBusy(false)
  }

  async function handleRemoveCustomDomain() {
    if (!selected) return
    setBusy(true)
    setOpErr(null)
    try {
      // Remove from GHL Object
      const res = await fetch(
        `${GHL_BASE}/objects/custom_objects.restaurant/records/${selected.recordId}?locationId=${PH_HQ_LOCATION}`,
        {
          method:  'PUT',
          headers: ghlHeaders(),
          body:    JSON.stringify({ properties: { custom_domain: '' } }),
        },
      )
      if (!res.ok) throw new Error(`GHL update failed (${res.status})`)

      // Remove KV entry
      if (selected.customDomain) {
        await fetch(`${NICHE_WORKER}/admin/domain`, {
          method:  'DELETE',
          headers: nicheHeaders(),
          body:    JSON.stringify({ hostname: selected.customDomain }),
        })
      }

      setRestaurants(prev => prev.map(x =>
        x.recordId === selected.recordId ? { ...x, customDomain: '' } : x,
      ))
      closeModal()
    } catch (e: any) {
      setOpErr(e.message || 'Remove failed.')
    }
    setBusy(false)
  }

  // Ã¢ÂÂÃ¢ÂÂ Copy helper Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  function handleCopy(value: string, key: string) {
    navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  // Ã¢ÂÂÃ¢ÂÂ Pagination Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const filtered    = restaurants.filter(r =>
    r.restaurantName.toLowerCase().includes(search.toLowerCase()) ||
    r.publicDomain.toLowerCase().includes(search.toLowerCase())   ||
    r.ghlLocationId.toLowerCase().includes(search.toLowerCase()),
  )
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Ã¢ÂÂÃ¢ÂÂ Shared styles Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
  const isBusySync = (id: string) => syncingId === id

  // Ã¢ÂÂÃ¢ÂÂ Loading / error Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
  if (loading) return (
    <div className='flex items-center justify-center h-64 text-gray-400 gap-2'>
      <Loader2 className='w-5 h-5 animate-spin' /> Loading restaurantsÃ¢ÂÂ¦
    </div>
  )

  if (loadErr) return (
    <div className='flex items-center justify-center h-64'>
      <div className='flex items-center gap-2 text-red-600 text-sm'>
        <AlertCircle className='w-4 h-4' /> {loadErr}
        <button onClick={load} className='ml-2 text-blue-600 hover:underline text-xs'>Retry</button>
      </div>
    </div>
  )

  return (
    <div className='p-6 max-w-[1200px]'>
      {/* Ã¢ÂÂÃ¢ÂÂ Header Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
      <div className='flex items-center justify-between mb-6'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-blue-50 rounded-lg'><Globe className='w-5 h-5 text-blue-600' /></div>
          <div>
            <h1 className='text-lg font-semibold text-gray-800'>Domain Manager</h1>
            <p className='text-xs text-gray-400'>Manage public and custom domain Ã¢ÂÂ KV routing for all restaurants.</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button onClick={load} disabled={loading}
            className='flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'>
            <RefreshCw className='w-4 h-4' /> Refresh
          </button>
          <button onClick={handleSyncAll} disabled={syncingAll || restaurants.length === 0}
            className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'>
            {syncingAll ? <Loader2 className='w-4 h-4 animate-spin' /> : <ArrowUpDown className='w-4 h-4' />}
            {syncingAll ? 'SyncingÃ¢ÂÂ¦' : 'Sync All to KV'}
          </button>
        </div>
      </div>

      {/* Ã¢ÂÂÃ¢ÂÂ Op error banner Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
      {opErr && (
        <div className='flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600'>
          <AlertCircle className='w-4 h-4 flex-shrink-0' /> {opErr}
          <button onClick={() => setOpErr(null)} className='ml-auto'><X className='w-4 h-4' /></button>
        </div>
      )}

      {/* Ã¢ÂÂÃ¢ÂÂ KV info banner Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
      <div className='mb-5 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700'>
        <strong>How KV routing works:</strong> The worker resolves each request hostname via{' '}
        <code className='bg-amber-100 px-1 rounded'>domain:{'{hostname}'}</code> Ã¢ÂÂ locationId in KV.
        Sync All writes these entries for every restaurant. Once done, the hardcoded SUBDOMAIN_LOCATIONS
        in the worker can be removed.
      </div>

      {/* Ã¢ÂÂÃ¢ÂÂ Search Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
      <div className='relative mb-4'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300' />
        <input className='w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500'
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder='Search by name, domain or location IDÃ¢ÂÂ¦' />
      </div>

      {/* Ã¢ÂÂÃ¢ÂÂ Table Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
      <div className='bg-white border border-gray-200 rounded-xl overflow-hidden'>
        <div className='overflow-x-auto min-w-[900px]'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-100 bg-gray-50'>
                <th className='text-left text-xs font-semibold text-gray-500 px-4 py-3 w-44'>Restaurant</th>
                <th className='text-left text-xs font-semibold text-gray-500 px-4 py-3 w-28'>Status</th>
                <th className='text-left text-xs font-semibold text-gray-500 px-4 py-3 w-64'>Public Domain</th>
                <th className='text-left text-xs font-semibold text-gray-500 px-4 py-3 w-56'>Custom Domain</th>
                <th className='text-left text-xs font-semibold text-gray-500 px-4 py-3 w-48'>GHL Location ID</th>
                <th className='text-right text-xs font-semibold text-gray-500 px-4 py-3'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-50'>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className='text-center py-12 text-sm text-gray-400'>
                    {search ? 'No restaurants match your search.' : 'No restaurants found.'}
                  </td>
                </tr>
              )}
              {paginated.map(r => (
                <tr key={r.recordId} className='hover:bg-gray-50/50 transition-colors'>
                  {/* Name */}
                  <td className='px-4 py-3.5'>
                    <div className='flex items-center gap-2'>
                      {r.synced && <CheckCircle2 className='w-3.5 h-3.5 text-emerald-500 flex-shrink-0' />}
                      <span className='font-medium text-gray-800 text-sm'>{r.restaurantName}</span>
                    </div>
                    <span className='text-xs text-gray-400 font-mono'>{r.slug}</span>
                  </td>
                  {/* Status */}
                  <td className='px-4 py-3.5'>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  {/* Public domain */}
                  <td className='px-4 py-3.5'>
                    {r.publicDomain ? (
                      <div className='flex items-center gap-1.5'>
                        <span className='text-xs font-mono text-gray-700 truncate max-w-[200px]'>{r.publicDomain}</span>
                        <button onClick={() => handleCopy(r.publicDomain, `pub-${r.recordId}`)}
                          className='text-gray-300 hover:text-gray-500 flex-shrink-0'>
                          {copiedKey === `pub-${r.recordId}` ? <Check className='w-3.5 h-3.5 text-emerald-500' /> : <Copy className='w-3.5 h-3.5' />}
                        </button>
                      </div>
                    ) : <span className='text-xs text-gray-300'>Ã¢ÂÂ</span>}
                  </td>
                  {/* Custom domain */}
                  <td className='px-4 py-3.5'>
                    {r.customDomain ? (
                      <div className='flex items-center gap-1.5'>
                        <span className='text-xs font-mono text-gray-700 truncate max-w-[160px]'>{r.customDomain}</span>
                        <button onClick={() => handleCopy(r.customDomain, `cust-${r.recordId}`)}
                          className='text-gray-300 hover:text-gray-500 flex-shrink-0'>
                          {copiedKey === `cust-${r.recordId}` ? <Check className='w-3.5 h-3.5 text-emerald-500' /> : <Copy className='w-3.5 h-3.5' />}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => openEditCustom(r)}
                        className='text-xs text-blue-500 hover:underline'>+ Add custom domain</button>
                    )}
                  </td>
                  {/* GHL Location ID */}
                  <td className='px-4 py-3.5'>
                    <div className='flex items-center gap-1.5'>
                      <span className='text-xs font-mono text-gray-500 truncate max-w-[140px]'>{r.ghlLocationId || 'Ã¢ÂÂ'}</span>
                      {r.ghlLocationId && (
                        <button onClick={() => handleCopy(r.ghlLocationId, `loc-${r.recordId}`)}
                          className='text-gray-300 hover:text-gray-500 flex-shrink-0'>
                          {copiedKey === `loc-${r.recordId}` ? <Check className='w-3.5 h-3.5 text-emerald-500' /> : <Copy className='w-3.5 h-3.5' />}
                        </button>
                      )}
                    </div>
                  </td>
                  {/* Actions */}
                  <td className='px-4 py-3.5'>
                    <div className='flex items-center justify-end gap-2'>
                      <button onClick={() => openEditRecord(r)}
                        className='p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'
                        title='Edit record (slug, status)'>
                        <Pencil className='w-3.5 h-3.5' />
                      </button>
                      <button onClick={() => handleSyncOne(r)} disabled={isBusySync(r.recordId)}
                        className='flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'>
                        {isBusySync(r.recordId)
                          ? <Loader2 className='w-3 h-3 animate-spin' />
                          : <ArrowUpDown className='w-3 h-3' />}
                        Sync
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ã¢ÂÂÃ¢ÂÂ Pagination Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
        {totalPages > 1 && (
          <div className='flex items-center justify-between px-4 py-3 border-t border-gray-100'>
            <span className='text-xs text-gray-400'>{filtered.length} restaurants</span>
            <div className='flex items-center gap-2'>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className='p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30'>
                <ChevronLeft className='w-4 h-4' />
              </button>
              <span className='text-xs text-gray-500'>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className='p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30'>
                <ChevronRight className='w-4 h-4' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ã¢ÂÂÃ¢ÂÂ Edit Custom Domain Modal Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ */}
      {modal === 'edit-custom' && selected && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6'>
            <div className='flex items-center justify-between mb-5'>
              <div className='flex items-center gap-2'>
                <Globe className='w-5 h-5 text-blue-600' />
                <h2 className='text-base font-semibold text-gray-800'>Custom Domain</h2>
              </div>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600'><X className='w-5 h-5' /></button>
            </div>

            <p className='text-xs text-gray-500 mb-4'>
              Restaurant: <strong className='text-gray-700'>{selected.restaurantName}</strong>
            </p>

            <div className='mb-5'>
              <label className='block text-xs font-semibold text-gray-500 mb-1'>Custom Domain</label>
              <input className={inp} value={customInput}
                onChange={e => setCustomInput(e.target.value.trim().toLowerCase().replace(/^https?:\/\//, ''))}
                placeholder='firefishgrill.net' />
              <p className='text-xs text-gray-400 mt-1'>
                No http:// Ã¢ÂÂ just the bare domain. Must have a CNAME pointing to the worker.
              </p>
            </div>

            {opErr && (
              <div className='flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600'>
                <AlertCircle className='w-4 h-4 flex-shrink-0' /> {opErr}
              </div>
            )}

            <div className='flex items-center justify-between pt-2'>
              {selected.customDomain && (
                <button onClick={handleRemoveCustomDomain} disabled={busy}
                  className='flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-40'>
                  <Link2Off className='w-3.5 h-3.5' /> Remove custom domain
                </button>
              )}
              <div className='flex gap-2 ml-auto'>
                <button onClick={closeModal} disabled={busy}
                  className='px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'>
                  Cancel
                </button>
                <button onClick={handleSaveCustomDomain} disabled={busy || !customInput.trim()}
                  className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'>
                  {busy ? <Loader2 className='w-4 h-4 animate-spin' /> : <CheckCircle2 className='w-4 h-4' />}
                  {busy ? 'SavingÃ¢ÂÂ¦' : 'Save & Sync KV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- Edit Record Modal (slug + status) -------------------------------- */}
      {modal === 'edit-record' && selected && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6'>
            <div className='flex items-center justify-between mb-5'>
              <div className='flex items-center gap-2'>
                <Pencil className='w-5 h-5 text-blue-600' />
                <h2 className='text-base font-semibold text-gray-800'>Edit Restaurant Record</h2>
              </div>
              <button onClick={closeModal} className='text-gray-400 hover:text-gray-600'><X className='w-5 h-5' /></button>
            </div>

            <p className='text-xs text-gray-500 mb-4'>
              Editing: <strong className='text-gray-700'>{selected.restaurantName}</strong>
            </p>

            <div className='space-y-4 mb-5'>
              <div>
                <label className='block text-xs font-semibold text-gray-500 mb-1'>Slug</label>
                <input className={inp} value={editSlug}
                  onChange={e => setEditSlug(e.target.value.trim().toLowerCase())}
                  placeholder='firefishgrill' />
                <p className='text-xs text-gray-400 mt-1'>Used for portal URL and domain routing. Must match public domain prefix.</p>
              </div>
              <div>
                <label className='block text-xs font-semibold text-gray-500 mb-1'>Status</label>
                <select className={inp} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value='live'>live</option>
                  <option value='setup'>setup</option>
                  <option value='suspended'>suspended</option>
                </select>
              </div>
            </div>

            {opErr && (
              <div className='flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600'>
                <AlertCircle className='w-4 h-4 flex-shrink-0' /> {opErr}
              </div>
            )}

            <div className='flex gap-2 justify-end pt-2'>
              <button onClick={closeModal} disabled={busy}
                className='px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors'>
                Cancel
              </button>
              <button onClick={handleSaveRecord} disabled={busy || !editSlug.trim()}
                className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'>
                {busy ? <Loader2 className='w-4 h-4 animate-spin' /> : <CheckCircle2 className='w-4 h-4' />}
                {busy ? 'Savingâ¦' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
