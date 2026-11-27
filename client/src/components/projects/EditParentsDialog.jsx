import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import { errorInfo } from "../../libs/pedigree";
import FormDialog from "./FormDialog.jsx";
import ParentPicker from "./ParentPicker.jsx";

const toRef = (ref) => (ref?.plantId ? { plantId: ref.plantId, tag: ref.tag } : null);

export default function EditParentsDialog({ plant, userId, projectId, lineNames, onClose, onSubmit }) {
  const [mother, setMother] = useState(toRef(plant.mother));
  const [father, setFather] = useState(toRef(plant.father));
  const [self, setSelf] = useState(Boolean(plant.isSelf));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setFormError("");
    if (!mother || !father) {
      const msg = "Pick both parents, or leave both empty for a founder.";
      setErrors({ [mother ? "father" : "mother"]: msg });
      return;
    }
    setBusy(true);
    try {
      await onSubmit(plant, {
        motherPlantId: mother.plantId,
        fatherPlantId: father.plantId,
        startNewLine: false,
        version: plant.version,
      });
      onClose();
    } catch (err) {
      const info = errorInfo(err, "Could not save the parents. Nothing was changed.");
      if (info.field === "mother" || info.field === "father") setErrors({ [info.field]: info.message });
      else setFormError(info.message);
      setBusy(false);
    }
  };

  return (
    <FormDialog open title={`Edit parents of ${plant.tag}`} titleId="edit-parents-title" onClose={onClose}>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {formError && <Alert severity="error" role="alert">{formError}</Alert>}
        <ParentPicker
          userId={userId}
          projectId={projectId}
          label="Mother"
          value={mother}
          lineNames={lineNames}
          excludePlantId={plant.plantId}
          error={errors.mother}
          autoFocus
          onChange={(v) => {
            setMother(v);
            if (self) setFather(v);
            setErrors({});
          }}
        />
        <ParentPicker
          userId={userId}
          projectId={projectId}
          label="Father"
          value={father}
          lineNames={lineNames}
          excludePlantId={plant.plantId}
          error={errors.father}
          disabled={self}
          onChange={(v) => {
            setFather(v);
            setErrors({});
          }}
        />
        <FormControlLabel
          sx={{ minHeight: 44 }}
          control={
            <Checkbox
              checked={self}
              disabled={!mother}
              onChange={(e) => {
                setSelf(e.target.checked);
                if (e.target.checked) setFather(mother);
              }}
            />
          }
          label="Same plant is both parents (self)"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} sx={{ minHeight: 44 }}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={busy} variant="contained" sx={{ minHeight: 44 }}>
          Save
        </Button>
      </DialogActions>
    </FormDialog>
  );
}
