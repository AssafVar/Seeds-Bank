// Single source of truth for the app's color palette. theme.js builds the
// MUI theme from these values, and index.js writes the same values onto
// :root as CSS custom properties, so anything - MUI's theme or plain CSS -
// draws from one place instead of drifting independently.
const colors = {
  primary: "#1F4D3A",
  primaryLight: "#4A7A64",
  primaryDark: "#123024",
  secondary: "#D6543A",
  secondaryLight: "#E8836D",
  secondaryDark: "#A83824",
  background: "#F7F1E3",
  paper: "#FFFDF7",
  textPrimary: "#2B241C",
  textSecondary: "#6B5F4F",
  divider: "#E3D9C4",
};

// Writes the same palette onto :root as CSS custom properties, so plain
// CSS (or devtools inspection) can reference var(--color-primary) etc.
// without duplicating the hex values here.
export const applyCssVariables = () => {
  const root = document.documentElement.style;
  root.setProperty("--color-primary", colors.primary);
  root.setProperty("--color-primary-light", colors.primaryLight);
  root.setProperty("--color-primary-dark", colors.primaryDark);
  root.setProperty("--color-secondary", colors.secondary);
  root.setProperty("--color-secondary-light", colors.secondaryLight);
  root.setProperty("--color-secondary-dark", colors.secondaryDark);
  root.setProperty("--color-background", colors.background);
  root.setProperty("--color-paper", colors.paper);
  root.setProperty("--color-text-primary", colors.textPrimary);
  root.setProperty("--color-text-secondary", colors.textSecondary);
  root.setProperty("--color-divider", colors.divider);
};

export default colors;
