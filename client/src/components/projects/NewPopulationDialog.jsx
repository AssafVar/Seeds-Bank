import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import { currentSeasonAndYear, errorInfo } from "../../libs/pedigree";
import FormDialog from "./FormDialog.jsx";
import SeasonPlaceFields, { useProjectFields } from "./SeasonPlaceFields.jsx";

export default function NewPopulationDialog({ line, userId, projectId, onClose, onSubmit }) {
  const fields = useProjectFields(userId, projectId);
  const [place, setPlace] = useState({ ...currentSeasonAndYear(), fieldId: null });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setFormError("");
    setErrors({});
    try {
      await onSubmit({
        lineId: line.id,
        season: place.season,
        year: place.year === "" ? undefined : place.year,
        fieldId: place.fieldId ?? undefined,
      });
      onClose();
    } catch (err) {
      const info = errorInfo(err, "Could not create the population. Nothing was changed.");
      if (info.field === "fieldId") setErrors({ fieldId: info.message });
      else setFormError(info.message);
      setBusy(false);
    }
  };

  return (
    <FormDialog open title={`New population in ${line.name}`} titleId="new-population-title" onClose={onClose} focusSelector="[role=button][aria-haspopup=listbox], [role=combobox]">
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {formError && <Alert severity="error">{formError}</Alert>}
        <SeasonPlaceFields {...place} fields={fields} errors={errors} onChange={(p) => setPlace((prev) => ({ ...prev, ...p }))} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} sx={{ minHeight: 44 }}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={busy} variant="contained" sx={{ minHeight: 44 }}>
          Create population
        </Button>
      </DialogActions>
    </FormDialog>
  );
}
