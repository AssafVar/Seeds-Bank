import Box from "@mui/material/Box";
import { alpha, useTheme } from "@mui/material/styles";

// A rotating two-tone ring (vermillion fading into pine green) instead of
// MUI's flat single-color default, so waiting states read as part of the
// app's own "vintage seed-catalog" identity rather than generic Material UI.
// Built from a conic-gradient masked into a ring (no extra assets/deps).
function ring(colorStart, colorEnd, size, thickness) {
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    background: `conic-gradient(from -90deg, transparent 0deg, ${colorStart} 90deg, ${colorEnd} 360deg)`,
    WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
    mask: `radial-gradient(farthest-side, transparent calc(100% - ${thickness}px), #000 calc(100% - ${thickness}px))`,
    animation: "seedbank-spin 0.9s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite",
    "@keyframes seedbank-spin": {
      to: { transform: "rotate(360deg)" },
    },
  };
}

// The big, centered spinner for a section/page waiting on its initial fetch.
export default function Spinner({ size = 40, minHeight = 120, sx, ...props }) {
  const theme = useTheme();
  const thickness = Math.max(3, Math.round(size * 0.11));
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight, ...sx }}
      {...props}
    >
      <Box
        sx={{
          ...ring(theme.palette.secondary.main, theme.palette.primary.main, size, thickness),
          filter: `drop-shadow(0 1px 3px ${alpha(theme.palette.primary.main, 0.25)})`,
        }}
      />
    </Box>
  );
}

// A small spinner for inline use (buttons, icon slots) that takes on the
// surrounding text color via currentColor, the same way MUI's
// color="inherit" did - so it still matches a contained button's white
// label or an outlined button's ink color without extra props.
export function InlineSpinner({ size = 18, sx, ...props }) {
  const thickness = Math.max(2, Math.round(size * 0.16));
  return (
    <Box
      component="span"
      sx={{
        ...ring("currentColor", "transparent", size, thickness),
        display: "inline-block",
        verticalAlign: "middle",
        opacity: 0.9,
        ...sx,
      }}
      {...props}
    />
  );
}
