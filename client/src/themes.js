// Single source of truth for the app's color palettes. theme.js builds the
// MUI theme from whichever palette is active, and applyCssVariables writes
// the same values onto :root as CSS custom properties, so anything - MUI's
// theme, plain CSS, or raw SVG/Leaflet drawing code - stays in sync with the
// user's chosen theme instead of drifting independently.
//
// Each palette keeps the app's "vintage seed-catalog" identity (a bold
// primary/secondary pair on a warm, near-white background) but pushes
// saturation further than the original single palette so the picker actually
// offers visibly distinct, vivid options.
export const themes = {
  pine: {
    label: "Pine",
    colors: {
      primary: "#12693F",
      primaryLight: "#3E9468",
      primaryDark: "#0A3F26",
      primaryRgb: "18, 105, 63",
      secondary: "#E8491F",
      secondaryLight: "#FF7A4D",
      secondaryDark: "#A83214",
      secondaryRgb: "232, 73, 31",
      background: "#F7F1E3",
      paper: "#FFFDF7",
      textPrimary: "#2B241C",
      textSecondary: "#6B5F4F",
      divider: "#E3D9C4",
      muted: "#8A7A5C",
    },
  },
  sunset: {
    label: "Sunset",
    colors: {
      primary: "#E85D2B",
      primaryLight: "#FF8C5A",
      primaryDark: "#A83E18",
      primaryRgb: "232, 93, 43",
      secondary: "#0E7C74",
      secondaryLight: "#3FA69C",
      secondaryDark: "#08544E",
      secondaryRgb: "14, 124, 116",
      background: "#FFF4EC",
      paper: "#FFFFFF",
      textPrimary: "#2E1F17",
      textSecondary: "#7A6152",
      divider: "#F0DCC9",
      muted: "#B08A6E",
    },
  },
  ocean: {
    label: "Ocean",
    colors: {
      primary: "#0B6E94",
      primaryLight: "#3F9BBD",
      primaryDark: "#054A63",
      primaryRgb: "11, 110, 148",
      secondary: "#E8395C",
      secondaryLight: "#FF6E89",
      secondaryDark: "#A82441",
      secondaryRgb: "232, 57, 92",
      background: "#EFF7FA",
      paper: "#FFFFFF",
      textPrimary: "#17262C",
      textSecondary: "#52707A",
      divider: "#D3E6EC",
      muted: "#7C97A0",
    },
  },
  berry: {
    label: "Berry",
    colors: {
      primary: "#922C6B",
      primaryLight: "#C15A9A",
      primaryDark: "#601A46",
      primaryRgb: "146, 44, 107",
      secondary: "#6E9A1E",
      secondaryLight: "#96C24A",
      secondaryDark: "#4A6A12",
      secondaryRgb: "110, 154, 30",
      background: "#FBF0F6",
      paper: "#FFFFFF",
      textPrimary: "#2A1620",
      textSecondary: "#7A5468",
      divider: "#EBD3E1",
      muted: "#A47C93",
    },
  },
  meadow: {
    label: "Meadow",
    colors: {
      primary: "#3E8E22",
      primaryLight: "#71BC50",
      primaryDark: "#245B10",
      primaryRgb: "62, 142, 34",
      secondary: "#6A2FD9",
      secondaryLight: "#9569EC",
      secondaryDark: "#481FA0",
      secondaryRgb: "106, 47, 217",
      background: "#F4FAEE",
      paper: "#FFFFFF",
      textPrimary: "#1E2A16",
      textSecondary: "#5C6F4F",
      divider: "#DCEAC9",
      muted: "#8CA37A",
    },
  },
};

export const defaultThemeId = "pine";

// Writes a palette onto :root as CSS custom properties, so plain CSS, SVG
// attributes, and Leaflet's inline styles (all of which resolve var() live)
// pick up a theme change immediately without re-rendering.
export const applyCssVariables = (colors) => {
  const root = document.documentElement.style;
  root.setProperty("--color-primary", colors.primary);
  root.setProperty("--color-primary-light", colors.primaryLight);
  root.setProperty("--color-primary-dark", colors.primaryDark);
  root.setProperty("--color-primary-rgb", colors.primaryRgb);
  root.setProperty("--color-secondary", colors.secondary);
  root.setProperty("--color-secondary-light", colors.secondaryLight);
  root.setProperty("--color-secondary-dark", colors.secondaryDark);
  root.setProperty("--color-secondary-rgb", colors.secondaryRgb);
  root.setProperty("--color-background", colors.background);
  root.setProperty("--color-paper", colors.paper);
  root.setProperty("--color-text-primary", colors.textPrimary);
  root.setProperty("--color-text-secondary", colors.textSecondary);
  root.setProperty("--color-divider", colors.divider);
  root.setProperty("--color-muted", colors.muted);
};

export default themes;
