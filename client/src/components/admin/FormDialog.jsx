import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { InlineSpinner } from "../common/Spinner.jsx";

// Shared create/edit modal for the Admin page's CRUD sections - the caller
// supplies the form fields as children plus the save/cancel wiring, so only
// the Dialog chrome and button/message layout are shared.
function FormDialog({ open, onClose, title, message, onSave, saveLabel, saving, saveDisabled, children }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>{children}</Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {message && (
          <Typography variant="body2" sx={{ mr: "auto" }}>
            {message}
          </Typography>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={saveDisabled}>
          {saving ? <InlineSpinner size={20} /> : saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FormDialog;
