// v1.0 | 10/10/2026 — WebsiteBuildingTool Superadmin layout (adapted from packed-house-admin AdminLayout v1.0)

import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useSettings } from '@/hooks/useSettings'
import {
  LayoutDashboard,
  ShoppingBag,
  Globe,
  Wand2,
  Settings,
  Menu,
  X,
  RefreshCw,
  Database,
} from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/':                  'Dashboard',
  '/shops':             'Shops',
  '/wizard':            'Add Shop',
  '/domains':           'Domain Manager',
  '/platform-updates':  'Platform Updates',
  '/settings':          'Settings',
  '/bionic-backups':    'Bionic Backups',
}

export default function AdminLayout() {
  const location           = useLocation()
  const { data: settings } = useSettings()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!settings?.chatEnabled || !settings?.adminBotEmbed) {
      const existing = document.getElementById('admin-bot-embed')
      if (existing) existing.remove()
      return
    }
    if (document.getElementById('admin-bot-embed')) return
    const wrapper = document.createElement('div')
    wrapper.id = 'admin-bot-embed'
    const frag = document.createRange().createContextualFragment(settings.adminBotEmbed)
    wrapper.appendChild(frag)
    document.body.appendChild(wrapper)
  }, [settings?.chatEnabled, settings?.adminBotEmbed])

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path)
  )?.[1] ?? 'Admin'

  const navLinks = [
    { label: 'Dashboard',        path: '/',                icon: LayoutDashboard, end: true as const },
    { label: 'Shops',            path: '/shops',           icon: ShoppingBag },
    { label: 'Add Shop',         path: '/wizard',          icon: Wand2 },
    { label: 'Domain Manager',   path: '/domains',         icon: Globe },
    { label: 'Platform Updates', path: '/platform-updates',icon: RefreshCw },
    { label: 'Settings',         path: '/settings',        icon: Settings },
    { label: 'Bionic Backups',   path: '/bionic-backups',  icon: Database },
  ]

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-100 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">WBT</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 leading-tight truncate">WebsiteBuildingTool</div>
            <div className="text-xs text-gray-400">Superadmin</div>
          </div>
          <button
            className="ml-auto md:hidden text-gray-400 hover:text-gray-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navLinks.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100">
          <div className="text-xs text-gray-400">admin.websitebuildingtool.com</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            className="md:hidden text-gray-400 hover:text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base font-semibold text-gray-900">{pageTitle}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
