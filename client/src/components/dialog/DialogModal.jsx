import React, { useRef } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import ModalCloseButton from "../common/ModalCloseButton.jsx";
import { InlineSpinner } from "../common/Spinner.jsx";

// A confirmation dialog: title, body, Cancel and a confirm button. Used for
// delete and discard prompts. `error` is shown as text (never as HTML).
export default function DialogModal({
  isOpen,
  title,
  children,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  destructive = false,
  busy = false,
  error = "",
  focusCancel = false,
  onCancel,
  onConfirm,
}) {
  const cancelRef = useRef(null);
  return (
    <Dialog
      open={isOpen}
      TransitionProps={{ onEntered: () => focusCancel && cancelRef.current?.focus() }}
      onClose={busy ? undefined : onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-body"
      PaperProps={{ sx: { position: "relative", overflow: "visible" } }}
    >
      <ModalCloseButton onClick={onCancel} disabled={busy} />
      <DialogTitle id="confirm-dialog-title" variant="h5">
        {title}
      </DialogTitle>
      <DialogContent id="confirm-dialog-body">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {error}
          </Alert>
        )}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button ref={cancelRef} onClick={onCancel} disabled={busy} autoFocus={focusCancel} sx={{ minHeight: 44 }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={busy}
          variant="contained"
          color={destructive ? "error" : "primary"}
          sx={{ minHeight: 44 }}
        >
          {busy ? <InlineSpinner size={20} /> : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
