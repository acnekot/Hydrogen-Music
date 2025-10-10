const HALFTONE_OVERLAY =
  'repeating-radial-gradient(circle at 0 0, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px)'

const DEFAULT_COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="defaultCoverGradient" x1="30" y1="30" x2="210" y2="210" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6d28d9" />
      <stop offset="1" stop-color="#ef4444" />
    </linearGradient>
  </defs>
  <rect x="20" y="20" width="200" height="200" rx="32" fill="url(#defaultCoverGradient)" />
  <path d="M120 70c-4.42 0-8 3.58-8 8v70.9c-4.24-2.64-9.24-4.18-14.63-4.18-15.98 0-28.94 12.96-28.94 28.94S81.39 202.6 97.37 202.6c15.98 0 28.94-12.96 28.94-28.94V98h26v48.9c-4.24-2.64-9.24-4.18-14.63-4.18-15.98 0-28.94 12.96-28.94 28.94s12.96 28.94 28.94 28.94c15.98 0 28.94-12.96 28.94-28.94V78c0-4.42-3.58-8-8-8z" fill="rgba(255,255,255,0.9)" />
</svg>`

export const DEFAULT_COVER_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  DEFAULT_COVER_SVG
)}`

export const HALFTONE_PATTERN = HALFTONE_OVERLAY
