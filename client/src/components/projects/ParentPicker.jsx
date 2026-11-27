import React, { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import FieldError from "./FieldError.jsx";
import { getPlants } from "../../services/serverCalls";

const SEARCH_DELAY_MS = 250;
const PICKER_PAGE_SIZE = 20;

// Mother / father picker: searches the project's plants by tag on the server.
// `value` is { plantId, tag } or null. Everything shown is plain text.
export default function ParentPicker({
  userId,
  projectId,
  label,
  value,
  onChange,
  lineNames = {},
  error = "",
  disabled = false,
  excludePlantId = null,
  autoFocus = false,
  helperText = "",
  onBlur,
}) {
  const [inputValue, setInputValue] = useState(value?.tag ?? "");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInputValue(value?.tag ?? "");
  }, [value]);

  useEffect(() => {
    if (disabled) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const page = await getPlants(userId, projectId, {
          q: inputValue === value?.tag ? "" : inputValue.slice(0, 100),
          page: 1,
          pageSize: PICKER_PAGE_SIZE,
        });
        if (!cancelled) setOptions(page?.items ?? []);
      } catch (err) {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputValue, userId, projectId, disabled, value]);

  const shown = options.filter((o) => o.plantId !== excludePlantId);
  const describe = (plant) => {
    const traits = [plant.fruitColor, plant.fruitWeight ? `${plant.fruitWeight} g` : null].filter(Boolean).join(", ");
    return `${lineNames[plant.lineId] ?? ""} ${plant.label ?? ""}${traits ? ` · ${traits}` : ""}`.trim();
  };

  return (
    <Autocomplete
      options={shown}
      value={value ? { plantId: value.plantId, tag: value.tag } : null}
      inputValue={inputValue}
      onInputChange={(e, text, reason) => {
        if (reason === "input") setInputValue(text);
        if (reason === "clear") setInputValue("");
      }}
      onChange={(e, plant) => onChange(plant ? { plantId: plant.plantId, tag: plant.tag } : null)}
      getOptionLabel={(o) => o.tag ?? ""}
      isOptionEqualToValue={(a, b) => a.plantId === b.plantId}
      filterOptions={(x) => x}
      loading={loading}
      disabled={disabled}
      noOptionsText={inputValue ? `There is no plant ${inputValue} in this project.` : "Type a tag to search"}
      loadingText="Searching..."
      onBlur={onBlur}
      renderOption={(props, plant) => (
        <li {...props} key={plant.plantId}>
          <Box>
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {plant.tag}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary">
              {" · "}
              {describe(plant)}
            </Typography>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          autoFocus={autoFocus}
          error={Boolean(error)}
          helperText={
            error ? (
              <FieldError>{error}</FieldError>
            ) : (
              helperText || undefined
            )
          }
          FormHelperTextProps={{ "aria-live": "polite" }}
        />
      )}
    />
  );
}
