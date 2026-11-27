import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { LINE_NAME_PATTERN, errorInfo, pluralPlants } from "../../libs/pedigree";
import DialogModal from "../dialog/DialogModal.jsx";
import FormDialog from "./FormDialog.jsx";

const latestLabel = (line) => (line.populations ?? []).find((p) => p.isLatestGeneration)?.label ?? line.populations?.[0]?.label ?? "";

// "Continue {line} as a new line": the old line stays; the new one remembers it.
export default function ContinueLineDialog({ line, existingNames = [], onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const gen = latestLabel(line);
  const trimmed = name.trim();
  const duplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  const fromText = `${line.name}${gen ? ` ${gen}` : ""}`;

  const submit = async () => {
    setFormError("");
    if (!LINE_NAME_PATTERN.test(trimmed)) {
      setError("Line names use letters, numbers, dashes and spaces, 1 to 40 characters.");
      return;
    }
    if (duplicate) {
      setError(`A line named ${trimmed} already exists in this project.`);
      return;
    }
    setBusy(true);
    try {
      await onSubmit(line, { newName: trimmed });
      onClose();
    } catch (err) {
      const info = errorInfo(err, "Could not create the line. Nothing was changed.");
      if (info.field === "lineName" || info.code === "line_name_taken" || info.code === "invalid_line_name") setError(info.message);
      else setFormError(info.message);
      setBusy(false);
    }
  };

  const requestClose = () => (name ? setConfirmDiscard(true) : onClose());

  const point = (icon, text) => (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
      {icon}
      <Typography variant="body2">{text}</Typography>
    </Box>
  );

  return (
    <>
      <FormDialog open title={`Continue ${line.name} as a new line`} titleId="continue-line-title" onClose={requestClose}>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            label="New line name"
            value={name}
            autoFocus
            required
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            error={Boolean(error) || (duplicate && Boolean(trimmed))}
            helperText={
              error ||
              (duplicate && trimmed ? `A line named ${trimmed} already exists in this project.` : "Line names are unique in this project. Letters, numbers, dashes and spaces.")
            }
            inputProps={{ maxLength: 40 }}
            FormHelperTextProps={{ "aria-live": "polite" }}
          />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {point(<CheckCircleOutlineIcon fontSize="small" color="primary" aria-hidden="true" />, `${line.name} stays as it is, with all its plants and tags.`)}
            {point(
              <InfoOutlinedIcon fontSize="small" color="primary" aria-hidden="true" />,
              `${trimmed || "The new line"} starts empty. New plants you add to it are recorded as coming from ${fromText}.`
            )}
            {point(<LockOutlinedIcon fontSize="small" color="primary" aria-hidden="true" />, "Plant tags never change.")}
          </Box>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
            <Typography variant="body2">{`${line.name} · ${pluralPlants(line.plantCount ?? 0)} · unchanged`}</Typography>
            <Typography variant="body2">{`${trimmed || "New line"} · 0 plants · from ${fromText}`}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={requestClose} disabled={busy} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || duplicate} variant="contained" sx={{ minHeight: 44 }}>
            Create new line
          </Button>
        </DialogActions>
      </FormDialog>
      <DialogModal
        isOpen={confirmDiscard}
        title="Discard changes?"
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        destructive
        focusCancel
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={onClose}
      >
        <Typography>The new line name will be lost.</Typography>
      </DialogModal>
    </>
  );
}
