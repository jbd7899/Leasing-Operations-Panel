const brand = {
  navy: "#0A1628",
  teal: "#0D6E6E",
  tealLight: "#14A0A0",
  blue: "#1A56DB",
  blueLight: "#3B82F6",
  accent: "#10B981",
  accentWarm: "#F59E0B",
  danger: "#EF4444",
  warning: "#F97316",
};

const dark = {
  bg: "#080E1C",
  bgCard: "#111827",
  bgElevated: "#1C2A3E",
  bgInput: "#162032",
  border: "#1E2E44",
  borderLight: "#283D57",
  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#4B5E78",
  tint: brand.tealLight,
  tabIconDefault: "#4B5E78",
  tabIconSelected: brand.tealLight,
  activeBg: "#0D2A2A",
  activeBorder: "#164444",
};

const light = {
  bg: "#F0F4FA",
  bgCard: "#FFFFFF",
  bgElevated: "#FFFFFF",
  bgInput: "#EEF2F8",
  border: "#DDE5F0",
  borderLight: "#E8EEF7",
  text: "#0A1628",
  textSecondary: "#4B6084",
  textMuted: "#8EA3BF",
  tint: brand.teal,
  tabIconDefault: "#8EA3BF",
  tabIconSelected: brand.teal,
  activeBg: "#E0F5F5",
  activeBorder: "#B2DFDF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export default {
  brand,
  dark,
  light,
};
