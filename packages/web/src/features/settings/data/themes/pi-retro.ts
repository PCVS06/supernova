import type {ThemeVariant} from "@/features/settings/lib/themes";

const dark = {
  codeThemeId: "github-dark",
  theme: {
    accent: "#ffffff",
    contrast: 60,
    fonts: {code: null, ui: null},
    ink: "#ffffff",
    opaqueWindows: true,
    semanticColors: {
      diffAdded: "#00a240",
      diffRemoved: "#e02e2a",
    },
    surface: "#000000",
  },
  variant: "dark",
} as const satisfies ThemeVariant;

const light = {
  codeThemeId: "github-light",
  theme: {
    accent: "#303030",
    contrast: 45,
    fonts: {code: null, ui: null},
    ink: "#0d0d0d",
    opaqueWindows: true,
    semanticColors: {
      diffAdded: "#00a240",
      diffRemoved: "#e02e2a",
    },
    surface: "#ffffff",
  },
  variant: "light",
} as const satisfies ThemeVariant;

export const piRetroTheme = {id: "pi-retro", name: "Radian", dark, light} as const;
