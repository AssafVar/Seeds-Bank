import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { TRAIT_KEYS, errorInfo } from "../../libs/pedigree";
import DialogModal from "../dialog/DialogModal.jsx";
import FormDialog from "./FormDialog.jsx";
import { GenerationChip, ParentRemovedChip } from "./PedigreeChips.jsx";

const traitLabels = {
  fruitColor: "Fruit color",
  fruitWeight: "Fruit weight (g)",
  seedColor: "Seed color",
  seedWeight: "Seed weight (mg)",
};

// Plant sheet (full screen on phones): pedigree read-only, traits editable.
export default function PlantDetailDialog({ plant, lineName, populationName, onClose, onSaveTraits, onEditParents, onDelete }) {
  const [traits, setTraits] = useState(() => Object.fromEntries(TRAIT_KEYS.map((k) => [k, plant[k] ?? ""])));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = TRAIT_KEYS.some((k) => (plant[k] ?? "") !== traits[k]);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await onSaveTraits(plant, { ...traits, version: plant.version });
      onClose();
    } catch (err) {
      setError(errorInfo(err, "Could not save the plant. Nothing was changed.").message);
      setBusy(false);
    }
  };

  const parentText = (parent) => (parent?.removed ? null : parent?.tag ?? "None");
  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());

  return (
    <>
      <FormDialog open title={plant.tag} titleId="plant-detail-title" onClose={requestClose}>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 1, alignItems: "center" }}>
            <Typography component="dt" color="text.secondary">Mother</Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {plant.mother?.removed ? <ParentRemovedChip onClick={() => onEditParents(plant)} /> : parentText(plant.mother)}
            </Typography>
            <Typography component="dt" color="text.secondary">Father</Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {plant.father?.removed ? <ParentRemovedChip onClick={() => onEditParents(plant)} /> : parentText(plant.father)}
            </Typography>
            <Typography component="dt" color="text.secondary">Generation</Typography>
            <Typography component="dd" sx={{ m: 0 }}><GenerationChip label={plant.label} /></Typography>
            <Typography component="dt" color="text.secondary">Line</Typography>
            <Typography component="dd" sx={{ m: 0 }}>{lineName}</Typography>
            <Typography component="dt" color="text.secondary">Population</Typography>
            <Typography component="dd" sx={{ m: 0 }}>{populationName}</Typography>
          </Box>
          {plant.mother || plant.father ? (
            <Box>
              <Button onClick={() => onEditParents(plant)} sx={{ minHeight: 44 }}>
                Edit parents
              </Button>
            </Box>
          ) : null}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {TRAIT_KEYS.map((k) => (
              <TextField
                key={k}
                label={traitLabels[k]}
                value={traits[k]}
                inputProps={{ maxLength: 200 }}
                onChange={(e) => setTraits((t) => ({ ...t, [k]: e.target.value }))}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, justifyContent: "space-between" }}>
          <Button color="error" onClick={() => onDelete(plant)} disabled={busy} sx={{ minHeight: 48 }}>
            Delete plant
          </Button>
          <Button onClick={save} disabled={busy || !dirty} variant="contained" sx={{ minHeight: 48 }}>
            Save
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
        <Typography>Your edits to {plant.tag} will be lost.</Typography>
      </DialogModal>
    </>
  );
}
