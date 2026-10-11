// packed-house-admin — hooks/useSettings.tsx
// v1.0 | 09/06/2026 — stub; returns hardcoded platform defaults

export function useSettings() {
  return {
    data: {
      businessName:  'PackedHouse HQ',
      chatEnabled:   false,
      adminBotEmbed: '',
    },
    loading: false,
    error:   null,
  }
}