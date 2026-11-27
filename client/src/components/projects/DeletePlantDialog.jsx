import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { getPlants } from "../../services/serverCalls";
import { errorInfo, traitSummary } from "../../libs/pedigree";
import DialogModal from "../dialog/DialogModal.jsx";

const SHOWN_CHILDREN = 3;

// Confirmation only: deleting has no undo. With children, lists up to three of them.
export default function DeletePlantDialog({ plant, lineName, userId, projectId, onClose, onDelete }) {
  const [children, setChildren] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const childCount = plant.childCount ?? 0;

  useEffect(() => {
    if (childCount === 0) return undefined;
    let cancelled = false;
    getPlants(userId, projectId, { parentId: plant.plantId, page: 1, pageSize: SHOWN_CHILDREN })
      .then((page) => {
        if (!cancelled) setChildren(page?.items ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [childCount, plant.plantId, userId, projectId]);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onDelete(plant, childCount > 0);
    } catch (err) {
      const info = errorInfo(err, "Could not delete the plant. Nothing was changed.");
      setError(info.code === "has_children" ? "This plant now has children. Close this dialog and try again." : info.message);
      setBusy(false);
    }
  };

  const roleOf = (child) => (child.mother?.plantId === plant.plantId ? "Mother" : "Father");

  return (
    <DialogModal
      isOpen
      title={`Delete ${plant.tag}?`}
      confirmLabel="Delete plant"
      destructive
      busy={busy}
      error={error}
      focusCancel={childCount > 0}
      onCancel={onClose}
      onConfirm={confirm}
    >
      {childCount > 0 ? (
        <Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", mb: 2 }}>
            <WarningAmberIcon color="warning" aria-hidden="true" />
            <Typography>
              {`${plant.tag} is a parent of ${childCount} ${childCount === 1 ? "plant" : "plants"} in ${lineName} ${plant.label}. They are kept and marked Parent removed until you pick a new parent.`}
            </Typography>
          </Box>
          <Box component="ul" sx={{ pl: 3, m: 0 }}>
            {children.map((c) => (
              <li key={c.plantId}>
                <Typography variant="body2">
                  {`${c.tag} · ${roleOf(c)} · ${traitSummary(c).join(" · ")}`}
                </Typography>
              </li>
            ))}
          </Box>
          {childCount > SHOWN_CHILDREN && <Typography variant="body2">{`and ${childCount - SHOWN_CHILDREN} more`}</Typography>}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Traits and tags of those plants do not change.
          </Typography>
          <Typography sx={{ mt: 1 }}>This cannot be undone.</Typography>
        </Box>
      ) : (
        <Typography>This removes the plant. This cannot be undone.</Typography>
      )}
    </DialogModal>
  );
}
