// SVG representation of AKO Laboratorio Clínico official branding
export const AKO_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7" />
      <stop offset="35%" stop-color="#06b6d4" />
      <stop offset="70%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#f97316" />
    </linearGradient>
    <linearGradient id="helixGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="akoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7e22ce" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
  </defs>

  <!-- Outer colorful orbits and swirls -->
  <path d="M 120,250 C 120,130 220,100 320,120 C 420,140 450,220 440,280 C 430,340 370,390 250,400 C 130,410 80,330 120,250 Z" fill="none" stroke="url(#orbitGradient)" stroke-width="12" stroke-linecap="round" />
  <path d="M 180,210 C 200,160 270,140 330,170 C 390,200 400,270 370,320 C 340,370 270,380 220,350" fill="none" stroke="url(#helixGradient)" stroke-width="8" stroke-linecap="round" />

  <!-- The Flask (Matraz de Erlenmeyer) -->
  <path d="M 235,120 L 265,120 L 265,180 L 340,310 C 355,335 340,350 310,350 L 190,350 C 160,350 145,335 160,310 L 235,180 Z" fill="#faf5ff" stroke="#581c87" stroke-width="14" stroke-linejoin="round" />
  
  <!-- Liquid Fill inside Flask -->
  <path d="M 205,260 Q 250,250 295,260 L 325,315 C 335,330 325,340 305,340 L 195,340 C 175,340 165,330 175,315 Z" fill="#c084fc" opacity="0.85" />
  
  <!-- Floating bubbles -->
  <circle cx="215" cy="285" r="8" fill="#e9d5ff" opacity="0.6" />
  <circle cx="285" cy="295" r="12" fill="#e9d5ff" opacity="0.6" />
  <circle cx="250" cy="315" r="10" fill="#e9d5ff" opacity="0.6" />
  <circle cx="230" cy="275" r="5" fill="#e9d5ff" opacity="0.6" />
  <circle cx="270" cy="280" r="6" fill="#e9d5ff" opacity="0.6" />

  <!-- DNA strands inside flask -->
  <path d="M 220,290 Q 250,270 280,290" fill="none" stroke="#22c55e" stroke-width="6" stroke-linecap="round" />
  <path d="M 220,315 Q 250,335 280,315" fill="none" stroke="#eab308" stroke-width="6" stroke-linecap="round" />
  <line x1="230" y1="285" x2="230" y2="315" stroke="#94a3b8" stroke-width="3" />
  <line x1="250" y1="280" x2="250" y2="325" stroke="#94a3b8" stroke-width="3" />
  <line x1="270" y1="285" x2="270" y2="315" stroke="#94a3b8" stroke-width="3" />

  <!-- Rim of Flask -->
  <ellipse cx="250" cy="120" rx="20" ry="6" fill="#faf5ff" stroke="#581c87" stroke-width="12" />

  <!-- Red Blood Droplet -->
  <path d="M 330,165 C 330,165 315,195 315,205 C 315,215 325,225 335,225 C 345,225 355,215 355,205 C 355,195 330,165 330,165 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="4" stroke-linejoin="round" />

  <!-- Connected atoms / molecules on the right -->
  <line x1="380" y1="230" x2="420" y2="200" stroke="#cbd5e1" stroke-width="5" />
  <line x1="380" y1="230" x2="400" y2="270" stroke="#cbd5e1" stroke-width="5" />
  <circle cx="380" cy="230" r="16" fill="#3b82f6" />
  <circle cx="420" cy="200" r="12" fill="#10b981" />
  <circle cx="400" cy="270" r="14" fill="#f97316" />

  <!-- Heartbeat ECG line on the left -->
  <path d="M 100,280 L 130,280 L 140,250 L 150,320 L 160,270 L 170,290 L 180,280 L 210,280" fill="none" stroke="#f97316" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Logo text at bottom -->
  <text x="250" y="440" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-weight="900" font-size="65" text-anchor="middle" letter-spacing="4">
    <tspan fill="#8b5cf6">A</tspan><tspan fill="#06b6d4">K</tspan><tspan fill="#f97316">O</tspan>
  </text>
  <text x="250" y="480" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-weight="800" font-size="22" fill="#581c87" text-anchor="middle" letter-spacing="3">
    LABORATORIO CLÍNICO
  </text>
</svg>`;

// Helper function to return SVG as an optimized base64 data URI
export function getAkoLogoBase64(): string {
  try {
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(AKO_LOGO_SVG)));
  } catch (e) {
    return "";
  }
}
