import React, { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { getLinePurityMap } from "../../libs/projects.js";

const plantLabel = (plant, isStable) =>
  `${plant.line} — gen ${plant.generation}${isStable ? " ✓ stable" : ""}`;

export default function CrossPlantsModal({ isOpen, projectDetails, onConfirm, onClose }) {
  const [parentAId, setParentAId] = useState("");
  const [parentBId, setParentBId] = useState("");

  const linePurity = getLinePurityMap(projectDetails);
  const canConfirm = parentAId && parentBId && parentAId !== parentBId;

  const handleClose = () => {
    setParentAId("");
    setParentBId("");
    onClose();
  };

  const handleConfirm = () => {
    const parentA = projectDetails.find((item) => item.plant_id === parentAId);
    const parentB = projectDetails.find((item) => item.plant_id === parentBId);
    onConfirm(parentA, parentB);
    setParentAId("");
    setParentBId("");
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} aria-labelledby="cross-plants-title">
      <DialogTitle id="cross-plants-title">Cross two lines</DialogTitle>
      <DialogContent>
        <FormControl fullWidth style={{ marginTop: 8 }}>
          <InputLabel id="parent-a-label">Parent A</InputLabel>
          <Select
            labelId="parent-a-label"
            label="Parent A"
            value={parentAId}
            onChange={(e) => setParentAId(e.target.value)}
          >
            {projectDetails.map((plant) => (
              <MenuItem key={plant.plant_id} value={plant.plant_id}>
                {plantLabel(plant, linePurity[plant.line]?.isStable)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth style={{ marginTop: 24 }}>
          <InputLabel id="parent-b-label">Parent B</InputLabel>
          <Select
            labelId="parent-b-label"
            label="Parent B"
            value={parentBId}
            onChange={(e) => setParentBId(e.target.value)}
          >
            {projectDetails.map((plant) => (
              <MenuItem key={plant.plant_id} value={plant.plant_id}>
                {plantLabel(plant, linePurity[plant.line]?.isStable)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={!canConfirm} autoFocus>
          Cross
        </Button>
      </DialogActions>
    </Dialog>
  );
}
