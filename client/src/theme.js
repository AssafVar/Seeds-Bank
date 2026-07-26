import { createTheme } from "@mui/material/styles";

// A vintage seed-catalog identity rather than the generic "green wellness
// app" look most plant/gardening apps default to: a bold primary/secondary
// pair on a warm background instead of cold app-white. Builds an MUI theme
// from whichever palette (see themes.js) the user has picked.
const buildTheme = (colors) =>
  createTheme({
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
      // "Whisper flat": elevation comes from a hairline border in the
      // theme's own divider color, never a drop shadow - the one exception
      // is a floating surface with no backdrop scrim of its own (menus,
      // popovers, autocomplete) where MUI's default shadow is kept so it
      // doesn't disappear against the page behind it.
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 10,
            fontWeight: 600,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            boxShadow: "none",
            border: "1px solid var(--color-divider)",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
        },
      },
    },
  });

export default buildTheme;
