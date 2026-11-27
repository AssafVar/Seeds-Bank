import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import ModalCloseButton from "../common/ModalCloseButton.jsx";

// Shared shell for the plant and line dialogs: full-screen on phones,
// 560px on desktop, close button, focus trapped by MUI.
// `focusSelector` names the element to focus once the dialog has finished opening.
export default function FormDialog({ open, title, titleId, onClose, children, maxWidth = "sm", focusSelector }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionProps={{ onEntered: (node) => focusSelector && node?.querySelector(focusSelector)?.focus() }}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={maxWidth}
      aria-labelledby={titleId}
      PaperProps={{ sx: { position: "relative", overflow: fullScreen ? "auto" : "visible" } }}
    >
      <ModalCloseButton onClick={onClose} floating={!fullScreen} />
      <DialogTitle id={titleId} variant="h5" sx={{ pl: fullScreen ? 7 : 3 }}>
        {title}
      </DialogTitle>
      <Box sx={{ display: "contents" }}>{children}</Box>
    </Dialog>
  );
}
