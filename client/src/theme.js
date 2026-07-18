import { createTheme } from "@mui/material/styles";
import colors from "./colors";

// A vintage seed-catalog identity rather than the generic "green wellness
// app" look most plant/gardening apps default to: deep pine green paired
// with a bold vermillion accent (the color of a ripe seed pod or fruit),
// on a warm parchment background instead of cold app-white.
const theme = createTheme({
  palette: {
    primary: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: colors.secondary,
      light: colors.secondaryLight,
      dark: colors.secondaryDark,
      contrastText: "#FFFFFF",
    },
    // Most of the app already leans on color="success" for its icons and
    // buttons as the de facto brand color; aligning it with primary makes
    // all of that cohesive without having to touch every call site.
    success: {
      main: colors.primary,
      light: colors.primaryLight,
      dark: colors.primaryDark,
      contrastText: "#FFFFFF",
    },
    background: {
      default: colors.background,
      paper: colors.paper,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    divider: colors.divider,
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
  },
});

export default theme;
