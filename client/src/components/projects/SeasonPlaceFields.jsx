import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { getFields } from "../../services/serverCalls";
import { SEASONS } from "../../libs/pedigree";

// The project's fields for the Place select. Missing data just means "No field yet".
export function useProjectFields(userId, projectId) {
  const [fields, setFields] = useState([]);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(getFields(userId, projectId, 1, 100))
      .then((result) => {
        if (!cancelled) setFields(Array.isArray(result?.items) ? result.items : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, projectId]);
  return fields;
}

export default function SeasonPlaceFields({ season, year, fieldId, fields, disabled = false, onChange, errors = {} }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 100px 1fr" }, gap: 2 }}>
      <TextField
        select
        label="Season"
        value={season}
        disabled={disabled}
        onChange={(e) => onChange({ season: e.target.value })}
        sx={{ gridColumn: { xs: "1 / 2", sm: "auto" } }}
      >
        {SEASONS.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Year"
        type="number"
        value={year}
        disabled={disabled}
        inputProps={{ min: 1900, max: 2100 }}
        onChange={(e) => onChange({ year: e.target.value === "" ? "" : Number(e.target.value) })}
      />
      <TextField
        select
        label="Place"
        value={fieldId ?? ""}
        disabled={disabled}
        error={Boolean(errors.fieldId)}
        helperText={errors.fieldId || undefined}
        onChange={(e) => onChange({ fieldId: e.target.value === "" ? null : e.target.value })}
        sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}
      >
        <MenuItem value="">No field yet</MenuItem>
        {fields.map((f) => (
          <MenuItem key={f.id} value={f.id}>
            {f.name}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
