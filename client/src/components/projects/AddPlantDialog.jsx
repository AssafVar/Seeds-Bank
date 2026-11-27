import React, { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { previewPlacement } from "../../services/serverCalls";
import { LINE_NAME_PATTERN, TAG_PATTERN, TRAIT_KEYS, currentSeasonAndYear, errorInfo, suggestLineName } from "../../libs/pedigree";
import DialogModal from "../dialog/DialogModal.jsx";
import FieldError from "./FieldError.jsx";
import FormDialog from "./FormDialog.jsx";
import ParentPicker from "./ParentPicker.jsx";
import SeasonPlaceFields, { useProjectFields } from "./SeasonPlaceFields.jsx";

const TITLES = { add: "Add plant", founder: "Add plant", cross: "Cross plants", self: "Self this plant" };
const SAVE_FAILED = "Could not save the plant. Nothing was changed.";
const PREVIEW_DELAY_MS = 250;
const FIELD_KEYS = { mother: "mother", father: "father", tag: "tag", lineName: "lineName", line: "line", fieldId: "fieldId" };

const traitLabels = {
  fruitColor: "Fruit color",
  fruitWeight: "Fruit weight (g)",
  seedColor: "Seed color",
  seedWeight: "Seed weight (mg)",
};

const emptyTraits = () => Object.fromEntries(TRAIT_KEYS.map((k) => [k, ""]));

// One dialog for Add plant, Cross plants, Self this plant and Add founder plants.
// `onCreate(body)` performs the request (the page's hook) and returns the response.
export default function AddPlantDialog({ mode = "add", preset = {}, userId, projectId, lineNames = {}, onClose, onCreate }) {
  const initial = currentSeasonAndYear();
  const fields = useProjectFields(userId, projectId);
  const contentRef = useRef(null);
  const isFounderMode = mode === "founder";

  const [tag, setTag] = useState("");
  const [tagTouched, setTagTouchedState] = useState(false);
  // A ref too: the preview effect reads it without re-running when the breeder types a tag.
  const tagTouchedRef = useRef(false);
  const setTagTouched = (value) => {
    tagTouchedRef.current = value;
    setTagTouchedState(value);
  };
  const [mother, setMother] = useState(preset.mother ?? null);
  const [father, setFather] = useState(preset.father ?? null);
  const [self, setSelf] = useState(mode === "self");
  const [choice, setChoice] = useState(preset.lineId ? `line:${preset.lineId}` : null);
  const [newLineName, setNewLineName] = useState("");
  const [place, setPlace] = useState({
    season: preset.season ?? initial.season,
    year: preset.year ?? initial.year,
    fieldId: preset.fieldId ?? null,
  });
  const [traits, setTraits] = useState(emptyTraits);
  const [preview, setPreview] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const oneParent = Boolean(mother) !== Boolean(father);
  const hasParents = Boolean(mother && father);
  const populationLocked = Boolean(preset.populationId);

  const dirty =
    tagTouched ||
    TRAIT_KEYS.some((k) => traits[k]) ||
    (mother?.plantId ?? null) !== (preset.mother?.plantId ?? null) ||
    (father?.plantId ?? null) !== (preset.father?.plantId ?? null);

  // The server works out line, generation, tag suggestion and population.
  useEffect(() => {
    if (oneParent) {
      // No placement can be worked out with one parent: drop the founder tag and preview.
      if (!tagTouchedRef.current) setTag("");
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    const startNew = choice === "new";
    const timer = setTimeout(async () => {
      try {
        const result = await previewPlacement(userId, projectId, {
          motherPlantId: mother?.plantId,
          fatherPlantId: father?.plantId,
          lineId: choice && choice.startsWith("line:") ? Number(choice.slice(5)) : undefined,
          startNewLine: startNew ? true : undefined,
          newLineName: startNew ? newLineName.trim() : undefined,
          season: place.season,
          year: place.year,
          fieldId: place.fieldId ?? undefined,
          populationId: preset.populationId,
        });
        if (cancelled) return;
        setPreview(result);
        setErrors((prev) => ({ ...prev, mother: undefined, father: undefined, line: undefined }));
        if (!tagTouchedRef.current) setTag(result.suggestedTag ?? "");
      } catch (err) {
        if (cancelled) return;
        setPreview(null);
        const info = errorInfo(err, "");
        if (info.status === 400 && info.field && FIELD_KEYS[info.field]) {
          setErrors((prev) => ({ ...prev, [FIELD_KEYS[info.field]]: info.message }));
        }
      }
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId, projectId, mother, father, choice, newLineName, place, preset.populationId, oneParent, refreshKey]);

  const oneParentMessage = "Pick both parents, or leave both empty for a founder.";
  const motherError = errors.mother ?? (oneParent && !mother ? oneParentMessage : undefined);
  const fatherError = errors.father ?? (oneParent && !father ? oneParentMessage : undefined);
  const forcedNew = hasParents && preview?.forcedNewLine;
  const selectedChoice = choice ?? (preview ? (preview.startsNewLine ? "new" : `line:${preview.line?.id}`) : "");
  const startsNew = hasParents && selectedChoice === "new";
  // A new line always gets a name sent; prefill a unique one the breeder can edit.
  useEffect(() => {
    if (startsNew && !newLineName && mother && father) {
      setNewLineName(suggestLineName(mother.tag, father.tag, Object.values(lineNames)));
    }
  }, [startsNew, newLineName, mother, father, lineNames]);

  const choices = (preview?.allowedLineChoices ?? []).map((c) => ({
    value: c.isNew ? "new" : `line:${c.lineId}`,
    label: c.isNew ? "Start a new line" : `Add to ${c.name}`,
  }));

  const changeMother = (value) => {
    setMother(value);
    if (self) setFather(value);
    setChoice(preset.lineId ? `line:${preset.lineId}` : null);
    setErrors((p) => ({ ...p, mother: undefined }));
  };
  const changeFather = (value) => {
    setFather(value);
    setChoice(null);
    setErrors((p) => ({ ...p, father: undefined }));
  };
  const changeSelf = (checked) => {
    setSelf(checked);
    if (checked) setFather(mother);
    setChoice(null);
  };

  const validate = () => {
    const next = {};
    if (!TAG_PATTERN.test(tag.trim())) next.tag = "Tags use letters, numbers, dots, dashes and underscores, up to 24 characters.";
    if (oneParent) {
      const msg = "Pick both parents, or leave both empty for a founder.";
      if (!mother) next.mother = msg;
      else next.father = msg;
    }
    if (mode === "cross" && !hasParents) {
      next.mother = next.mother ?? "Pick a mother to cross.";
      next.father = next.father ?? "Pick a father to cross.";
    }
    if (startsNew && !LINE_NAME_PATTERN.test(newLineName.trim())) {
      next.lineName = "Line names use letters, numbers, dashes and spaces, 1 to 40 characters.";
    }
    return next;
  };

  const focusFirstInvalid = () =>
    setTimeout(() => contentRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);

  const submit = async (addAnother) => {
    setNotice("");
    setFormError("");
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid();
      return;
    }
    const body = {
      tag: tag.trim(),
      motherPlantId: mother?.plantId,
      fatherPlantId: father?.plantId,
      lineId: hasParents && !startsNew && selectedChoice.startsWith("line:") ? Number(selectedChoice.slice(5)) : undefined,
      startNewLine: startsNew,
      newLineName: startsNew ? newLineName.trim() : undefined,
      season: place.season,
      year: place.year === "" ? undefined : place.year,
      fieldId: place.fieldId ?? undefined,
      populationId: preset.populationId,
      count: 1,
    };
    TRAIT_KEYS.forEach((k) => {
      if (traits[k].trim()) body[k] = traits[k].trim();
    });
    setSubmitting(true);
    try {
      await onCreate(body);
      if (addAnother) {
        setNotice(`Added ${body.tag}.`);
        setTag("");
        setTagTouched(false);
        setTraits(emptyTraits());
        setRefreshKey((k) => k + 1);
      } else {
        onClose();
      }
    } catch (err) {
      const info = errorInfo(err, SAVE_FAILED);
      const key = info.field ? FIELD_KEYS[info.field] : null;
      if (key) {
        setErrors({ [key]: info.message });
        focusFirstInvalid();
      } else {
        setFormError(info.status && info.status < 500 && info.message !== SAVE_FAILED ? `${SAVE_FAILED} ${info.message}` : SAVE_FAILED);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());
  const tagNearLimit = tag.length >= 19;

  return (
    <>
      <FormDialog open title={TITLES[mode]} titleId="add-plant-title" onClose={requestClose}>
        <DialogContent ref={contentRef} sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          {formError && (
            <Alert severity="error" role="alert">
              {formError}
            </Alert>
          )}
          {notice && (
            <Alert severity="success" role="status">
              {notice}
            </Alert>
          )}

          {!isFounderMode && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <ParentPicker
                userId={userId}
                projectId={projectId}
                label="Mother"
                value={mother}
                onChange={changeMother}
                lineNames={lineNames}
                error={motherError}
                autoFocus={mode === "cross"}
              />
              <ParentPicker
                userId={userId}
                projectId={projectId}
                label="Father"
                value={father}
                onChange={changeFather}
                lineNames={lineNames}
                error={fatherError}
                disabled={self}
              />
              {mode !== "cross" && (
                <FormControlLabel
                  sx={{ gridColumn: { sm: "1 / -1" }, minHeight: 44 }}
                  control={<Checkbox checked={self} disabled={!mother} onChange={(e) => changeSelf(e.target.checked)} />}
                  label="Same plant is both parents (self)"
                />
              )}
            </Box>
          )}

          {hasParents ? (
            <FormControl error={Boolean(errors.line)} disabled={forcedNew}>
              <FormLabel id="line-choice-label">Line</FormLabel>
              <RadioGroup
                aria-labelledby="line-choice-label"
                value={selectedChoice}
                onChange={(e) => setChoice(e.target.value)}
              >
                {(choices.length > 0 ? choices : [{ value: "new", label: "Start a new line" }]).map((c) => (
                  <FormControlLabel key={c.value} value={c.value} control={<Radio />} label={c.label} sx={{ minHeight: 44 }} />
                ))}
              </RadioGroup>
              {forcedNew && <FormHelperText>These parents come from different lines, so this starts a new line.</FormHelperText>}
              {errors.line && <FormHelperText aria-live="polite"><FieldError>{errors.line}</FieldError></FormHelperText>}
            </FormControl>
          ) : oneParent ? null : (
            <Typography variant="body2">
              <strong>Line</strong>: Founders · P
            </Typography>
          )}

          {startsNew && (
            <TextField
              label="Line name"
              value={newLineName}
              onChange={(e) => setNewLineName(e.target.value)}
              error={Boolean(errors.lineName)}
              helperText={
                errors.lineName ? <FieldError>{errors.lineName}</FieldError> :
                `Line names are unique in this project. Letters, numbers, dashes and spaces.${newLineName.length >= 32 ? ` ${newLineName.length}/40` : ""}`
              }
              inputProps={{ maxLength: 40 }}
              FormHelperTextProps={{ "aria-live": "polite" }}
              required
            />
          )}

          <TextField
            label="Tag"
            value={tag}
            onChange={(e) => {
              setTag(e.target.value);
              setTagTouched(true);
              setErrors((p) => ({ ...p, tag: undefined }));
            }}
            error={Boolean(errors.tag)}
            helperText={errors.tag ? <FieldError>{errors.tag}</FieldError> : `Tags never change after saving.${tagNearLimit ? ` ${tag.length}/24` : ""}`}
            inputProps={{ maxLength: 24 }}
            FormHelperTextProps={{ "aria-live": "polite" }}
            required
          />

          <SeasonPlaceFields
            {...place}
            fields={fields}
            disabled={populationLocked}
            errors={errors}
            onChange={(partial) => setPlace((p) => ({ ...p, ...partial }))}
          />

          {preview && !oneParent && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="body2" role="status">
                {preview.population?.action === "joins"
                  ? `Joins population ${preview.population.name} (${preview.population.plantCount} plants)`
                  : `Creates population ${preview.population?.name ?? ""}`}
              </Typography>
              <Box>
                <Chip
                  color="primary"
                  variant="outlined"
                  label={`Generation ${preview.label} (worked out from the parents)`}
                />
              </Box>
            </Box>
          )}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            {TRAIT_KEYS.map((k) => (
              <TextField
                key={k}
                label={traitLabels[k]}
                value={traits[k]}
                onChange={(e) => setTraits((t) => ({ ...t, [k]: e.target.value }))}
                inputProps={{ maxLength: 200 }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: "wrap" }}>
          <Button onClick={requestClose} disabled={submitting} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button
            onClick={() => submit(true)}
            disabled={submitting}
            variant={isFounderMode ? "contained" : "text"}
            sx={{ minHeight: 44 }}
          >
            Save and add another
          </Button>
          <Button
            onClick={() => submit(false)}
            disabled={submitting}
            variant={isFounderMode ? "outlined" : "contained"}
            sx={{ minHeight: 44 }}
          >
            {mode === "cross" ? "Cross plants" : mode === "self" ? "Self this plant" : "Add plant"}
          </Button>
        </DialogActions>
      </FormDialog>
      <DialogModal
        isOpen={confirmDiscard}
        title="Discard this plant?"
        cancelLabel="Keep editing"
        confirmLabel="Discard"
        destructive
        focusCancel
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={onClose}
      >
        <Typography>What you typed will be lost.</Typography>
      </DialogModal>
    </>
  );
}
