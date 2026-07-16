// ERouter color palette — electric indigo / cyan (gateway tech)
// Light theme: cool slate
// Dark theme: deep navy slate

export const COLORS = {
  // Primary — Electric Indigo
  primary: {
    DEFAULT: "#4F46E5",
    hover: "#4338CA",
    light: "#818CF8",
    dark: "#3730A3",
  },

  // Accent — Cyan
  accent: {
    DEFAULT: "#06B6D4",
    hover: "#0891B2",
    light: "#22D3EE",
    dark: "#0E7490",
  },

  // Light theme backgrounds
  light: {
    bg: "#F8FAFC",
    bgAlt: "#F1F5F9",
    surface: "#FFFFFF",
    sidebar: "rgba(241, 245, 249, 0.9)",
    border: "rgba(15, 23, 42, 0.1)",
    textMain: "#0F172A",
    textMuted: "#64748B",
  },

  // Dark theme backgrounds
  dark: {
    bg: "#0B1220",
    bgAlt: "#111827",
    surface: "#1E293B",
    sidebar: "rgba(17, 24, 39, 0.92)",
    border: "rgba(226, 232, 240, 0.1)",
    textMain: "#E2E8F0",
    textMuted: "#94A3B8",
  },

  // Status colors
  status: {
    success: "#22C55E",
    successLight: "#DCFCE7",
    successDark: "#166534",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    warningDark: "#92400E",
    error: "#EF4444",
    errorLight: "#FEE2E2",
    errorDark: "#991B1B",
    info: "#06B6D4",
    infoLight: "#CFFAFE",
    infoDark: "#0E7490",
  },
};

// CSS Variables mapping for Tailwind
export const CSS_VARIABLES = {
  light: {
    "--color-primary": COLORS.primary.DEFAULT,
    "--color-primary-hover": COLORS.primary.hover,
    "--color-bg": COLORS.light.bg,
    "--color-bg-alt": COLORS.light.bgAlt,
    "--color-surface": COLORS.light.surface,
    "--color-sidebar": COLORS.light.sidebar,
    "--color-border": COLORS.light.border,
    "--color-text-main": COLORS.light.textMain,
    "--color-text-muted": COLORS.light.textMuted,
  },
  dark: {
    "--color-primary": "#6366F1",
    "--color-primary-hover": "#818CF8",
    "--color-bg": COLORS.dark.bg,
    "--color-bg-alt": COLORS.dark.bgAlt,
    "--color-surface": COLORS.dark.surface,
    "--color-sidebar": COLORS.dark.sidebar,
    "--color-border": COLORS.dark.border,
    "--color-text-main": COLORS.dark.textMain,
    "--color-text-muted": COLORS.dark.textMuted,
  },
};
