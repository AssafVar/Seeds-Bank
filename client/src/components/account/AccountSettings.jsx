import { Box, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { classes } from "../../styles/accountStyle.js";
import useThemeMode from "../../hooks/useThemeMode";

function ThemeSwatch({ id, label, colors, isSelected, onSelect }) {
  return (
    <Box
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(id))}
      sx={{
        position: "relative",
        width: 140,
        borderRadius: "14px",
        border: "2px solid",
        borderColor: isSelected ? colors.primary : "var(--color-divider)",
        overflow: "hidden",
        cursor: "pointer",
        outline: "none",
        transition: "border-color 0.15s ease, transform 0.15s ease",
        "&:hover": { transform: "translateY(-2px)" },
        "&:focus-visible": { borderColor: colors.primary },
      }}
    >
      <Box sx={{ display: "flex", height: 56 }}>
        <Box sx={{ flex: 2, bgcolor: colors.background }} />
        <Box sx={{ flex: 1, bgcolor: colors.primary }} />
        <Box sx={{ flex: 1, bgcolor: colors.secondary }} />
      </Box>
      <Box sx={{ px: 1.5, py: 1, bgcolor: colors.paper, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: isSelected ? 600 : 400 }}>
          {label}
        </Typography>
        {isSelected && <CheckCircleIcon sx={{ fontSize: 18, color: colors.primary }} />}
      </Box>
    </Box>
  );
}

function AccountSettings() {
  const { themeId, setThemeId, themeOptions } = useThemeMode();

  return (
    <Box style={classes.formBox}>
      <Typography style={classes.boxHeadline}>App theme</Typography>
      <Typography style={classes.formText}>Pick the color theme you'd like to use across the app</Typography>
      <Box
        role="radiogroup"
        aria-label="App theme"
        sx={{ display: "flex", flexWrap: "wrap", gap: 2, px: "10px", pb: "10px" }}
      >
        {themeOptions.map(({ id, label, colors }) => (
          <ThemeSwatch
            key={id}
            id={id}
            label={label}
            colors={colors}
            isSelected={id === themeId}
            onSelect={setThemeId}
          />
        ))}
      </Box>
    </Box>
  );
}

export default AccountSettings;
