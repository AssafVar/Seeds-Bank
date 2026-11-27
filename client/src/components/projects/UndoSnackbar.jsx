import React from "react";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import UndoIcon from "@mui/icons-material/Undo";

// One snackbar slot: an undoable message first, then plain notices. role="status".
export default function UndoSnackbar({ undo, notice, onUndo, onDismissUndo, onDismissNotice }) {
  const message = undo ? undo.label : notice;
  return (
    <Snackbar
      key={message || "none"}
      open={Boolean(message)}
      autoHideDuration={undo ? 8000 : 5000}
      onClose={(e, reason) => {
        if (reason === "clickaway") return;
        if (undo) onDismissUndo();
        else onDismissNotice();
      }}
      message={message}
      ContentProps={{ role: "status" }}
      action={
        undo ? (
          <Button color="inherit" size="small" startIcon={<UndoIcon />} onClick={onUndo} sx={{ minHeight: 44 }}>
            Undo
          </Button>
        ) : null
      }
    />
  );
}
