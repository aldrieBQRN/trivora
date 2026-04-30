/**
 * TRIVORA Design System — Color Tokens
 * Unified palette across all pages (Welcome, TMO Dashboard, etc.)
 *
 * Usage:
 *   import { colors } from '@/data/designTokens';
 *   style={{ backgroundColor: colors.primary.navy }}
 */

export const colors = {
  // ─── PRIMARY COLORS ───────────────────────────────────────────
  primary: {
    navy: '#1C2340',         // Deep Navy - Main CTAs, text, dark backgrounds
    indigo: '#4F5BCB',       // Secondary Indigo - Highlights, accents, active states
    lavender: '#EDEEF4',     // Light Lavender - Page background, subtle fills
  },

  // ─── SECONDARY COLORS ─────────────────────────────────────────
  secondary: {
    darkIndigo: '#3A4570',   // Darker muted indigo
    mediumIndigo: '#2E3A9E', // Medium indigo (hover states)
    lightIndigo: '#7B8EF5',  // Light indigo (gradients)
  },

  // ─── ACCENT COLORS ────────────────────────────────────────────
  accent: {
    success: '#34D399',      // Emerald - Status active, success states
    error: '#DC2626',        // Red - Violations, alerts, danger
    warning: '#D97706',      // Amber - Warnings, caution
  },

  // ─── SEMANTIC REDS (For context-specific alerts) ─────────────
  semantic: {
    red: {
      light: '#FEF2F2',      // Red background
      base: '#DC2626',       // Red accent
      dark: '#B91C1C',       // Red hover state
      darker: '#991B1B',     // Red icon background
    },
    green: {
      light: 'rgba(5,150,105,.08)',  // Green icon background
      base: '#059669',               // Green status dot
      dark: '#065F46',               // Green icon color
    },
    amber: {
      light: 'rgba(217,119,6,.08)',  // Amber icon background
      base: '#D97706',               // Amber base
      dark: '#78350F',               // Amber icon color
    },
  },

  // ─── NEUTRAL COLORS ──────────────────────────────────────────
  neutral: {
    white: '#FFFFFF',
    offWhite: '#FAFAFA',
    background: '#EDEEF4',   // Light page background
  },

  // ─── TEXT COLORS ─────────────────────────────────────────────
  text: {
    primary: '#1C2340',      // Navy - Primary text
    secondary: '#5A6488',    // Medium gray-blue
    tertiary: '#8A96BC',     // Light gray-blue
    muted: '#9AA3CC',        // Muted gray-blue
  },

  // ─── BORDER COLORS ───────────────────────────────────────────
  border: {
    light: 'rgba(28,35,64,.07)',
    medium: 'rgba(28,35,64,.08)',
    dark: 'rgba(28,35,64,.12)',
  },

  // ─── OVERLAY & TRANSPARENCY ──────────────────────────────────
  overlay: {
    dark: 'rgba(10,14,50,.3)',       // Dark overlay (mobile sidebar)
    light: 'rgba(255,255,255,.92)',  // Light overlay
  },
};

/**
 * UTILITY: Generate rgba color with opacity
 * @param {string} hex - Hex color code (e.g., '#1C2340')
 * @param {number} opacity - Opacity value (0-1)
 * @returns {string} RGBA string
 */
export const withOpacity = (hex, opacity) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
};

/**
 * GRADIENT PRESETS
 */
export const gradients = {
  // Active indicator gradient (used on sidebar active state)
  activeIndicator: 'linear-gradient(180deg, #7B8EF5 0%, #3040B0 100%)',

  // Avatar gradient
  avatar: 'linear-gradient(135deg, #4F5BCB 0%, #2E3A9E 100%)',

  // Area chart fill gradient
  areaChartFill: {
    id: 'tdAreaFill',
    stops: [
      { offset: '5%', color: '#4F5BCB', opacity: 0.12 },
      { offset: '95%', color: '#4F5BCB', opacity: 0 },
    ],
  },

  // Radial glow (bottom-right)
  radialGlow: 'radial-gradient(circle, rgba(79,91,203,.04) 0%, transparent 70%)',
};

/**
 * SHADOW PRESETS
 */
export const shadows = {
  xs: '0 1px 3px rgba(28,35,64,.04)',
  sm: '0 1px 6px rgba(28,35,64,.05)',
  md: '0 2px 10px rgba(28,35,64,.06)',
  lg: '0 4px 20px rgba(28,35,64,.08)',
  xl: '0 4px 24px rgba(28,35,64,.12)',
  xxl: '0 12px 40px rgba(28,35,64,.12)',
};

/**
 * COMPONENT COLOR COMBINATIONS
 */
export const components = {
  // KPI cards
  kpi: {
    iconBg: {
      stone: 'rgba(28,35,64,.06)',
      rose: 'rgba(220,38,38,.08)',
      emerald: 'rgba(5,150,105,.08)',
      amber: 'rgba(217,119,6,.08)',
    },
    iconColor: {
      stone: '#3A4570',
      rose: '#991B1B',
      emerald: '#065F46',
      amber: '#78350F',
    },
  },

  // Button styles
  button: {
    primary: {
      bg: '#1C2340',
      text: '#FFFFFF',
      hover: '#2E3A9E',
    },
    outline: {
      bg: '#FFFFFF',
      text: '#1C2340',
      border: 'rgba(28,35,64,.2)',
    },
  },

  // Card styles
  card: {
    bg: '#FFFFFF',
    border: 'rgba(28,35,64,.08)',
  },

  // Input styles
  input: {
    bg: '#FAFAFA',
    border: 'rgba(28,35,64,.12)',
    text: '#1C2340',
    placeholder: '#9AA3CC',
  },
};

/**
 * EXPORT ALL AS DEFAULT (for convenience)
 */
export default {
  colors,
  gradients,
  shadows,
  components,
  withOpacity,
};
