import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import { LINE_NAME_PATTERN, errorInfo } from "../../libs/pedigree";
import FormDialog from "./FormDialog.jsx";

// "Create first line": an empty line with an optional origin note.
export default function CreateLineDialog({ existingNames = [], onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [origin, setOrigin] = useState("");
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    setFormError("");
    if (!LINE_NAME_PATTERN.test(trimmed)) {
      setNameError("Line names use letters, numbers, dashes and spaces, 1 to 40 characters.");
      return;
    }
    if (existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setNameError(`A line named ${trimmed} already exists in this project.`);
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ name: trimmed, originNote: origin.trim() || undefined });
      onClose();
    } catch (err) {
      const info = errorInfo(err, "Could not create the line. Nothing was changed.");
      if (info.field === "lineName" || info.field === "line") setNameError(info.message);
      else setFormError(info.message);
      setBusy(false);
    }
  };

  return (
    <FormDialog open title="Create first line" titleId="create-line-title" onClose={onClose}>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {formError && <Alert severity="error">{formError}</Alert>}
        <TextField
          label="Line name"
          value={name}
          autoFocus
          required
          onChange={(e) => {
            setName(e.target.value);
            setNameError("");
          }}
          error={Boolean(nameError)}
          helperText={nameError || "Line names are unique in this project. Letters, numbers, dashes and spaces."}
          inputProps={{ maxLength: 40 }}
          FormHelperTextProps={{ "aria-live": "polite" }}
        />
        <TextField
          label="Origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          helperText="e.g. Roma VF × San Marzano"
          inputProps={{ maxLength: 200 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} sx={{ minHeight: 44 }}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={busy} variant="contained" sx={{ minHeight: 44 }}>
          Create line
        </Button>
      </DialogActions>
    </FormDialog>
  );
}
