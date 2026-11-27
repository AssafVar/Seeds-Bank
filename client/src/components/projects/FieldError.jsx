import React from "react";
import Box from "@mui/material/Box";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Error helper text: icon plus text, never colour alone.
export default function FieldError({ children }) {
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <ErrorOutlineIcon fontSize="inherit" aria-hidden="true" />
      {children}
    </Box>
  );
}
