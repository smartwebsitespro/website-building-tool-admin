// v1.0 | 10/10/2026 — WBT Ecommerce onboarding wizard
// Steps: ShopType → Identity → Details → Branding → Site/Connect → Review → Execute
// GHL flow: 6 steps + execute | WooCommerce flow: 5 steps + execute

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, ChevronLeft, ChevronRight, Loader2,
  ShoppingBag, ShoppingCart, Upload, ExternalLink
} from 'lucide-react'
import { WORKER_BASE, WORKER_KEY, MEDIA_BUCKET, siteBase, portalBase } from '../constants'

// ---- Types ----
type ShopType = 'ghl' | 'woocommerce'

interface FormData {
  // Step 1
  shopType:       ShopType | ''
  // Step 2 — Identity
  locationId:     string   // GHL: required | WooCommerce: auto-generated UUID
  firstName:      string
  email:          string
  companyName:    string
  // Step 3 — Shop Details
  shopName:       string
  shopPhone:      string
  shopAddress:    string
  shopTagline:    string
  wooStoreUrl:    string   // WooCommerce only
  // Step 4 — Branding (GHL) | Connect (WooCommerce)
  primaryColor:   string
  accentColor:    string
  logoUrl:        string
  // Step 5 — Site Setup (GHL only)
  slug:           string
  atmosphere:     string
}

const INITIAL: FormData = {
  shopType: '', locationId: '', firstName: '', email: '', companyName: '',
  shopName: '', shopPhone: '', shopAddress: '', shopTagline: '', wooStoreUrl: '',
  primaryColor: '#4f46e5', accentColor: '#06b6d4',
  logoUrl: '', slug: '', atmosphere: 'default-shop-v1',
}

const GHL_STEPS  = ['Shop Type', 'Identity', 'Details', 'Branding', 'Site Setup', 'Review']
const WOO_STEPS  = ['Shop Type', 'Identity', 'Details', 'Connect', 'Review']

const ATMOSPHERES = [
  { id: 'default-shop-v1', label: 'Default Shop',  desc: 'Clean modern storefront' },
]

export default function Wizard() {
  const { slug: editSlug } = useParams<{ slug: string }>()
  const navigate           = useNavigate()
  const isUpdateMode       = !!editSlug

  const [step,          setStep]          = useState(1)
  const [formData,      setFormData]      = useState<FormData>(INITIAL)
  const [logoUploading, setLogoUploading] = useState(false)
  const [isSubmitting,  setIsSubmitting]  = useState(false)
  const [done,          setDone]          = useState(false)
  const [processItems,  setProcessItems]  = useState<{ name: string; status: 'pending'|'running'|'success'|'error'; error?: string }[]>([])

  const isGHL = formData.shopType === 'ghl'
  const isWoo = formData.shopType === 'woocommerce'
  const STEPS = isGHL ? GHL_STEPS : (isWoo ? WOO_STEPS : ['Shop Type'])
  const totalSteps = STEPS.length
  const executeStep = totalSteps + 1

  // Load existing shop for update mode
  useEffect(() => {
    if (!editSlug) return
    fetch(`${WORKER_BASE}/admin/locations/${editSlug}`, {
      headers: { 'X-Context-Key': WORKER_KEY }
    })
      .then(r => r.json())
      .then(d => {
        if (d.location) {
          const l = d.location
          setFormData(prev => ({
            ...prev,
            shopType:   l.shop_type || '',
            locationId: l.id || '',
            shopName:   l.name || '',
            shopPhone:  l.phone || '',
            shopAddress: l.address || '',
            shopTagline: l.tagline || '',
            logoUrl:    l.logo_url || '',
            atmosphere: l.atmosphere || 'default-shop-v1',
            slug:       l.slug || '',
          }))
        }
      })
      .catch(() => {})
  }, [editSlug])

  // Helpers
  const set = (k: keyof FormData, v: string) =>
    setFormData(prev => ({ ...prev, [k]: v }))

  const validate = (): boolean => {
    if (step === 1) return !!formData.shopType
    if (step === 2) return !!(formData.firstName && formData.email && formData.companyName && (isWoo || formData.locationId))
    if (step === 3) return !!(formData.shopName && (isGHL || formData.wooStoreUrl))
    if (step === 4) return isGHL ? !!(formData.primaryColor && formData.accentColor) : true // WooCommerce connect is optional for now
    if (isGHL && step === 5) return !!(formData.slug && formData.atmosphere)
    return true
  }

  // Logo upload
  const uploadLogo = async (file: File) => {
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${WORKER_BASE}/upload`, {
        method: 'POST',
        headers: { 'X-Context-Key': WORKER_KEY },
        body: fd,
      })
      const d = await r.json()
      if (d.url) set('logoUrl', d.url)
    } catch {}
    finally { setLogoUploading(false) }
  }

  // Execute: create shop
  const submitForm = async () => {
    setIsSubmitting(true)
    const locationId = formData.locationId || crypto.randomUUID()

    const items = isGHL ? [
      { name: 'Create location record in D1', status: 'pending' as const },
      { name: 'Register slug in KV',          status: 'pending' as const },
      { name: 'Write initial settings',        status: 'pending' as const },
    ] : [
      { name: 'Create location record in D1', status: 'pending' as const },
      { name: 'Register slug in KV',          status: 'pending' as const },
      { name: 'Write initial settings',        status: 'pending' as const },
    ]
    setProcessItems(items)
    setStep(executeStep)

    const run = async (i: number, fn: () => Promise<void>) => {
      setProcessItems(p => p.map((x, idx) => idx === i ? { ...x, status: 'running' } : x))
      try {
        await fn()
        setProcessItems(p => p.map((x, idx) => idx === i ? { ...x, status: 'success' } : x))
      } catch (e: any) {
        setProcessItems(p => p.map((x, idx) => idx === i ? { ...x, status: 'error', error: e.message } : x))
        throw e
      }
    }

    try {
      // Step 1: Create D1 location record
      await run(0, async () => {
        const slug = formData.slug || formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const body: any = {
          slug,
          shopType:   formData.shopType,
          locationId: locationId,
          name:       formData.shopName,
          tagline:    formData.shopTagline || null,
          email:      formData.email || null,
          phone:      formData.shopPhone || null,
          atmosphere: formData.atmosphere || 'default-shop-v1',
        }
        if (formData.logoUrl) body.logo_url = formData.logoUrl
        const r = isUpdateMode
          ? await fetch(`${WORKER_BASE}/admin/locations/${editSlug}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Context-Key': WORKER_KEY },
              body: JSON.stringify(body)
            })
          : await fetch(`${WORKER_BASE}/admin/locations`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Context-Key': WORKER_KEY },
              body: JSON.stringify(body)
            })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error || `HTTP ${r.status}`) }
      })

      // Step 2: KV slug registration (POST creates during location, but explicit for update)
      await run(1, async () => {
        const slug = formData.slug || formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const r = await fetch(`${WORKER_BASE}/admin/kv`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Context-Key': WORKER_KEY },
          body: JSON.stringify({ key: `slug:${slug}`, value: { locationId, shopType: formData.shopType } })
        })
        if (!r.ok) throw new Error(`KV write failed`)
      })

      // Step 3: Initial settings
      await run(2, async () => {
        const settings = [
          { key: 'currency',  value: 'USD' },
          { key: 'timezone',  value: Intl.DateTimeFormat().resolvedOptions().timeZone },
          ...(formData.primaryColor ? [{ key: 'primary_color', value: formData.primaryColor }] : []),
          ...(formData.accentColor  ? [{ key: 'accent_color',  value: formData.accentColor  }] : []),
          ...(isWoo && formData.wooStoreUrl ? [{ key: 'woo_store_url', value: formData.wooStoreUrl }] : []),
        ]
        for (const s of settings) {
          await fetch(`${WORKER_BASE}/admin/settings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Context-Key': WORKER_KEY },
            body: JSON.stringify({ locationId, key: s.key, value: s.value })
          })
        }
      })

      setDone(true)
    } catch {}
    finally { setIsSubmitting(false) }
  }

  // ---- Render helpers ----
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  const slug = formData.slug || formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Progress bar */}
        {step <= totalSteps && formData.shopType && (
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-start justify-between gap-1">
              {STEPS.map((label, idx) => {
                const s = idx + 1
                return (
                  <div key={s} className="flex-1 flex flex-col items-center relative">
                    {s < STEPS.length && (
                      <div className={`absolute top-4 left-1/2 w-full h-0.5 transition-colors ${step > s ? 'bg-indigo-600' : 'bg-gray-100'}`} />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all z-10 ${
                      step > s  ? 'bg-indigo-600 border-indigo-600 text-white' :
                      step === s ? 'bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100' :
                                   'bg-white border-gray-200 text-gray-400'
                    }`}>
                      {step > s ? <CheckCircle2 size={14} /> : s}
                    </div>
                    <span className={`text-[9px] uppercase tracking-wide mt-1.5 font-semibold text-center ${
                      step === s ? 'text-indigo-600' : 'text-gray-300'
                    }`}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step header */}
        <div className="px-6 pt-4 pb-1">
          <h2 className="text-base font-bold text-gray-900">
            {step === 1 && 'Select Shop Type'}
            {step === 2 && '2. Identity'}
            {step === 3 && '3. Shop Details'}
            {step === 4 && (isGHL ? '4. Branding' : '4. Connect WooCommerce')}
            {isGHL && step === 5 && '5. Site Setup'}
            {step === totalSteps && step !== 1 && step !== executeStep && 'Review & Confirm'}
            {step === executeStep && (done ? '\u2713 Setup Complete' : `Configuring ${formData.shopName || formData.companyName}\u2026`)}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {step === 1 && 'GHL builds the full site. WooCommerce is management-only.'}
            {step === 2 && 'Admin contact and credentials'}
            {step === 3 && 'Shop name, contact info' + (isWoo ? ', and WooCommerce store URL' : '')}
            {step === 4 && (isGHL ? 'Logo and brand colors' : 'Connect your WooCommerce store')}
            {isGHL && step === 5 && 'Public URL slug and atmosphere theme'}
            {step === totalSteps && step !== 1 && step !== executeStep && 'Review all settings before saving'}
          </p>
        </div>

        {/* Form area */}
        <div className="px-6 py-4 space-y-4">

          {/* STEP 1: Shop Type */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => { set('shopType', 'ghl'); setStep(2) }}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                  formData.shopType === 'ghl'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                }`}
              >
                <ShoppingBag size={28} className="text-indigo-600" />
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900">GHL</div>
                  <div className="text-xs text-gray-400 mt-0.5">Full site + ecommerce</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { set('shopType', 'woocommerce'); setStep(2) }}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                  formData.shopType === 'woocommerce'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <ShoppingCart size={28} className="text-purple-600" />
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-900">WooCommerce</div>
                  <div className="text-xs text-gray-400 mt-0.5">Management portal only</div>
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: Identity */}
          {step === 2 && (
            <div className="space-y-3">
              {isGHL && (
                <div>
                  <label className={labelCls}>GHL Location ID *</label>
                  <input className={inputCls} value={formData.locationId} onChange={e => set('locationId', e.target.value)} placeholder="e.g. abc123XYZ" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First Name *</label>
                  <input className={inputCls} value={formData.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Jane" />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input className={inputCls} type="email" value={formData.email} onChange={e => set('email', e.target.value)} placeholder="jane@shop.com" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Company Name *</label>
                <input className={inputCls} value={formData.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Reba Designs LLC" />
              </div>
            </div>
          )}

          {/* STEP 3: Shop Details */}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Shop Name *</label>
                <input className={inputCls} value={formData.shopName} onChange={e => set('shopName', e.target.value)} placeholder="Reba Designs" />
              </div>
              <div>
                <label className={labelCls}>Tagline</label>
                <input className={inputCls} value={formData.shopTagline} onChange={e => set('shopTagline', e.target.value)} placeholder="Handcrafted with love" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={formData.shopPhone} onChange={e => set('shopPhone', e.target.value)} placeholder="(831) 555-0100" />
                </div>
                <div>
                  <label className={labelCls}>Address</label>
                  <input className={inputCls} value={formData.shopAddress} onChange={e => set('shopAddress', e.target.value)} placeholder="Santa Cruz, CA" />
                </div>
              </div>
              {isWoo && (
                <div>
                  <label className={labelCls}>WooCommerce Store URL *</label>
                  <input className={inputCls} type="url" value={formData.wooStoreUrl} onChange={e => set('wooStoreUrl', e.target.value)} placeholder="https://myshop.com" />
                  <p className="text-xs text-gray-400 mt-1">Must be an active WordPress/WooCommerce site</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Branding (GHL) | Connect (WooCommerce) */}
          {step === 4 && (
            <div className="space-y-4">
              {isGHL && (
                <>
                  {/* Logo upload */}
                  <div>
                    <label className={labelCls}>Logo</label>
                    <div className="flex items-center gap-3">
                      {formData.logoUrl && (
                        <img src={formData.logoUrl} alt="logo" className="w-12 h-12 rounded-lg object-contain border border-gray-100" />
                      )}
                      <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                        {logoUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        {logoUploading ? 'Uploading\u2026' : 'Upload logo'}
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
                      </label>
                      {formData.logoUrl && (
                        <input className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg" value={formData.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="or paste URL" />
                      )}
                    </div>
                  </div>
                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Primary Color *</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={formData.primaryColor} onChange={e => set('primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                        <input className={inputCls} value={formData.primaryColor} onChange={e => set('primaryColor', e.target.value)} placeholder="#4f46e5" />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Accent Color *</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={formData.accentColor} onChange={e => set('accentColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                        <input className={inputCls} value={formData.accentColor} onChange={e => set('accentColor', e.target.value)} placeholder="#06b6d4" />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {isWoo && (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm text-purple-800">
                    <p className="font-semibold mb-1">WooCommerce Connection</p>
                    <p className="text-xs text-purple-600">Full OAuth integration is coming in Phase 6. You can connect the store from the customer portal Settings page after setup.</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs text-gray-500">
                    <p>\u2713 Store URL saved from previous step</p>
                    <p>\u2713 Connection wizard available in customer portal</p>
                    <p className="text-gray-400">Phase 6: wc-auth redirect → Stripe Connect → Google Business</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5 GHL: Site Setup */}
          {isGHL && step === 5 && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>URL Slug *</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">websitebuildingtool.com/</span>
                  <input
                    className={inputCls}
                    value={formData.slug}
                    onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder={formData.shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'my-shop'}
                  />
                </div>
                {slug && (
                  <a href={siteBase(slug)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-indigo-500 mt-1 hover:underline">
                    <ExternalLink size={11} /> {siteBase(slug)}
                  </a>
                )}
              </div>
              <div>
                <label className={labelCls}>Atmosphere (Theme) *</label>
                <div className="space-y-2">
                  {ATMOSPHERES.map(a => (
                    <label key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.atmosphere === a.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'
                    }`}>
                      <input type="radio" className="sr-only" checked={formData.atmosphere === a.id} onChange={() => set('atmosphere', a.id)} />
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <ShoppingBag size={15} className="text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{a.label}</div>
                        <div className="text-xs text-gray-400">{a.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REVIEW step */}
          {step === totalSteps && step !== 1 && step !== executeStep && (
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <Row label="Shop Type"    value={formData.shopType === 'ghl' ? 'GHL (Full site)' : 'WooCommerce (Management)'} />
                <Row label="Name"         value={formData.shopName} />
                <Row label="Admin"        value={`${formData.firstName} \u2014 ${formData.email}`} />
                {formData.shopPhone   && <Row label="Phone"     value={formData.shopPhone} />}
                {formData.shopTagline && <Row label="Tagline"   value={formData.shopTagline} />}
                {isGHL && <Row label="GHL ID"    value={formData.locationId} />}
                {isGHL && <Row label="Slug"       value={`/  ${slug}`} />}
                {isGHL && <Row label="Atmosphere" value={formData.atmosphere} />}
                {isGHL && formData.primaryColor && <Row label="Primary"   value={formData.primaryColor} />}
                {isWoo && formData.wooStoreUrl   && <Row label="WooStore"  value={formData.wooStoreUrl} />}
              </div>
            </div>
          )}

          {/* EXECUTE step */}
          {step === executeStep && (
            <div className="space-y-2">
              {processItems.map((item, i) => (
                <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  item.status === 'success' ? 'bg-emerald-50 border-emerald-100' :
                  item.status === 'running' ? 'bg-blue-50   border-blue-100'    :
                  item.status === 'error'   ? 'bg-red-50    border-red-100'     :
                                              'bg-gray-50   border-gray-100'
                }`}>
                  {item.status === 'success' && <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />}
                  {item.status === 'running' && <Loader2 size={15} className="text-blue-500 animate-spin flex-shrink-0" />}
                  {item.status === 'error'   && <span className="text-red-500 font-bold flex-shrink-0">\u2715</span>}
                  {item.status === 'pending' && <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                  <span className={`text-sm flex-1 ${item.status === 'error' ? 'text-red-700 font-medium' : 'text-gray-700'}`}>{item.name}</span>
                  {item.error && <span className="text-xs text-red-500 truncate max-w-[160px]">{item.error}</span>}
                </div>
              ))}
              {done && (
                <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-emerald-800">{formData.shopName} is live!</p>
                  {isGHL && (
                    <p className="text-xs text-emerald-600 mt-1">
                      <a href={siteBase(slug)} target="_blank" rel="noreferrer" className="underline font-mono">{siteBase(slug)}</a>
                    </p>
                  )}
                  <p className="text-xs text-emerald-600 mt-1">
                    Portal: <a href={portalBase(slug)} target="_blank" rel="noreferrer" className="underline font-mono">{portalBase(slug)}</a>
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      onClick={() => navigate('/shops')}
                      className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                    >
                      View all shops
                    </button>
                    <button
                      onClick={() => { setStep(1); setFormData(INITIAL); setDone(false); setProcessItems([]) }}
                      className="text-xs text-emerald-700 underline"
                    >
                      Add another shop
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Nav buttons */}
        {step <= totalSteps && step !== 1 && (
          <div className="px-6 pb-5 flex items-center justify-between border-t border-gray-50 pt-4">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <ChevronLeft size={15} /> Back
            </button>
            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                disabled={!validate()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg"
              >
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={submitForm}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {isSubmitting ? 'Running\u2026' : isUpdateMode ? 'Save Changes' : 'Create Shop'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// Review row helper
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-700 text-right truncate max-w-[220px]">{value}</span>
    </div>
  )
}
