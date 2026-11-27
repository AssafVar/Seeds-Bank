import React from "react";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import VerifiedIcon from "@mui/icons-material/Verified";
import VisibilityIcon from "@mui/icons-material/Visibility";

export function GenerationChip({ label, kept = false, size = "small" }) {
  if (!label) return null;
  const chip = (
    <Chip
      size={size}
      variant="outlined"
      color="primary"
      label={label}
      aria-label={`Generation ${label}`}
      sx={{ fontWeight: 600 }}
    />
  );
  return kept ? <Tooltip title="Generation kept from before the parent was removed">{chip}</Tooltip> : chip;
}

export function ParentRemovedChip({ onClick }) {
  return (
    <Chip
      color="warning"
      variant="outlined"
      icon={<LinkOffIcon />}
      label="Parent removed"
      sx={{ height: 40, maxWidth: "none", flexShrink: 0, "& .MuiChip-label": { overflow: "visible", textOverflow: "clip" } }}
      onClick={onClick}
      aria-label={onClick ? "Parent removed, edit parents" : "Parent removed"}
    />
  );
}

const formatDate = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : null;
};

// stabilityState: "stable" | "looksStable" | "segregating" | "none" (server).
// Icon plus text, never colour alone.
export function LineStatusChip({ line }) {
  const state = line.stabilityState ?? (line.isStable ? "stable" : line.looksStable ? "looksStable" : "none");
  if (state === "stable") {
    const when = formatDate(line.stableMarkedAt);
    return (
      <Tooltip title={when ? `Marked stable on ${when}` : "Marked stable"}>
        <Chip size="small" color="success" icon={<VerifiedIcon />} label="Stable" />
      </Tooltip>
    );
  }
  if (state === "looksStable") {
    return (
      <Tooltip title="Looks stable: the last generation's plants are alike in all four traits.">
        <Chip size="small" color="info" variant="outlined" icon={<VisibilityIcon />} label="Looks stable" />
      </Tooltip>
    );
  }
  if (state === "segregating") {
    return (
      <Tooltip title="Segregating: the last generations still differ in their traits.">
        <Chip size="small" color="warning" variant="outlined" icon={<CallSplitIcon />} label="Segregating" />
      </Tooltip>
    );
  }
  return null;
}
