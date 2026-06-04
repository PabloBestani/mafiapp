export const colors = {
  bg: "#080909",
  bgRaised: "#111315",
  surface: "#191B1A",
  surfaceAlt: "#23241F",
  border: "#3F4437",
  borderStrong: "#6F7259",
  text: "#F1EDE2",
  textMuted: "#B8B5A6",
  textDim: "#7E7D70",
  brandRed: "#A40000",
  brandRedDark: "#650000",
  brandRedSoft: "#D14A3E",
  sage: "#989878",
  olive: "#505040",
  success: "#7FA66A",
  warning: "#D0A85C",
  danger: "#D14A3E",
  info: "#8FA8B8"
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  pill: 999
} as const;

export const typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "800" },
  section: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  label: { fontSize: 14, lineHeight: 18, fontWeight: "700" },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: "600" }
} as const;

export const layout = {
  screenPadding: 16,
  touchTarget: 44,
  bottomBarMinHeight: 72,
  bottomBarMaxHeight: 88,
  cardRadius: radius.md,
  cardBorderWidth: 1
} as const;

export const motion = {
  pressMs: 90,
  fastMs: 140,
  baseMs: 180,
  panelMs: 220
} as const;

export const zIndex = {
  base: 0,
  header: 10,
  bottomBar: 20,
  modal: 50,
  toast: 60
} as const;

export const assets = {
  cardBack: require("../../../assets/brand/mafiapp-card-back.jpg"),
  wordmark: require("../../../assets/brand/mafiapp-wordmark.png")
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  layout,
  motion,
  zIndex,
  assets
} as const;

export type Theme = typeof theme;
