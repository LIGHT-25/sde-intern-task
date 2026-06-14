import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Hex to Color Name ---

const COLOR_NAMES: Record<string, string> = {
  // Preset survey builder colors
  '#4f46e5': 'Indigo',
  '#10b981': 'Emerald',
  '#f43f5e': 'Rose',
  '#f59e0b': 'Amber',
  '#8b5cf6': 'Violet',
  '#334155': 'Charcoal',
  // Common web colors
  '#000000': 'Black',
  '#ffffff': 'White',
  '#ef4444': 'Red',
  '#f97316': 'Orange',
  '#eab308': 'Yellow',
  '#22c55e': 'Green',
  '#14b8a6': 'Teal',
  '#06b6d4': 'Cyan',
  '#3b82f6': 'Blue',
  '#6366f1': 'Indigo',
  '#a855f7': 'Purple',
  '#ec4899': 'Pink',
  '#64748b': 'Slate',
  '#6b7280': 'Gray',
  '#78716c': 'Stone',
  '#a3a3a3': 'Silver',
  '#dc2626': 'Crimson',
  '#ea580c': 'Burnt Orange',
  '#ca8a04': 'Gold',
  '#16a34a': 'Forest Green',
  '#0891b2': 'Dark Cyan',
  '#2563eb': 'Royal Blue',
  '#7c3aed': 'Deep Violet',
  '#db2777': 'Magenta',
  '#0f172a': 'Midnight',
  '#1e293b': 'Dark Slate',
  '#374151': 'Gunmetal',
  '#991b1b': 'Dark Red',
  '#9a3412': 'Rust',
  '#166534': 'Dark Green',
  '#1e40af': 'Navy Blue',
  '#4338ca': 'Dark Indigo',
  '#7e22ce': 'Dark Purple',
  '#be185d': 'Dark Pink',
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return [r, g, b]
}

function colorDistance(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)
}

/**
 * Converts a hex color code to a human-friendly color name.
 * Returns the exact name if it's a known preset, otherwise
 * finds the nearest named color.
 */
export function hexToColorName(hex: string): string {
  if (!hex) return 'Default'

  const normalized = hex.toLowerCase().trim()

  // Exact match
  const exact = COLOR_NAMES[normalized]
  if (exact) return exact

  // Validate hex format
  if (!/^#[0-9a-f]{6}$/.test(normalized)) return hex

  // Find nearest named color
  let closestName = 'Custom'
  let closestDist = Infinity

  for (const [knownHex, name] of Object.entries(COLOR_NAMES)) {
    const dist = colorDistance(normalized, knownHex)
    if (dist < closestDist) {
      closestDist = dist
      closestName = name
    }
  }

  return closestName
}

/**
 * Converts a friendly color name back to a hex code.
 * If the input is already a valid hex code, returns it normalized.
 */
export function colorNameToHex(name: string): string {
  if (!name) return ''

  const normalizedName = name.toLowerCase().trim()

  // Try exact match in COLOR_NAMES (checking known names)
  for (const [hex, knownName] of Object.entries(COLOR_NAMES)) {
    if (knownName.toLowerCase() === normalizedName) {
      return hex
    }
  }

  // Handle standard hex codes with or without '#'
  if (/^#[0-9a-f]{6}$/i.test(normalizedName)) {
    return normalizedName.toLowerCase()
  }
  if (/^[0-9a-f]{6}$/i.test(normalizedName)) {
    return `#${normalizedName.toLowerCase()}`
  }

  return ''
}
