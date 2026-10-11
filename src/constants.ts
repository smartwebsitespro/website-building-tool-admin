// v1.0 | 10/10/2026

export const BIONIC_BASE        = 'https://bionic-memory.webadmin-a18.workers.dev'
export const BIONIC_KEY         = import.meta.env.VITE_BIONIC_KEY ?? ''
export const BACKUP_WORKER_BASE = 'https://bionicbackup.webadmin-a18.workers.dev'

// Ecommerce niche worker — admin API + public site
export const WORKER_BASE = 'https://websitebuildingtool.com'
export const WORKER_KEY  = import.meta.env.VITE_WORKER_KEY ?? ''

// Customer portal URL (subdomain admin)
export const portalBase = (slug: string) =>
  `https://${slug}.websitebuildingtool.com`

// Customer temp public site URL (path-based)
export const siteBase = (slug: string) =>
  `https://websitebuildingtool.com/${slug}`

// R2 media CDN (ecom-media bucket — custom domain)
export const MEDIA_BUCKET = 'https://media.websitebuildingtool.com'
