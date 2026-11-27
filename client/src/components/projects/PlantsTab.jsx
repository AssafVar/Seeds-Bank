import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import AddIcon from "@mui/icons-material/Add";
import CallMergeIcon from "@mui/icons-material/CallMerge";
import CheckIcon from "@mui/icons-material/Check";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { getPlant } from "../../services/serverCalls";
import { errorInfo, lineChips, lineNameMap, pluralPlants, visibleLines } from "../../libs/pedigree";
import AddPlantDialog from "./AddPlantDialog.jsx";
import ContinueLineDialog from "./ContinueLineDialog.jsx";
import CreateLineDialog from "./CreateLineDialog.jsx";
import DeletePlantDialog from "./DeletePlantDialog.jsx";
import EditParentsDialog from "./EditParentsDialog.jsx";
import NewPopulationDialog from "./NewPopulationDialog.jsx";
import PlantDetailDialog from "./PlantDetailDialog.jsx";
import PlantsGroupedList from "./PlantsGroupedList.jsx";
import PlantsGroupedTable from "./PlantsGroupedTable.jsx";
import UndoSnackbar from "./UndoSnackbar.jsx";

const LINE_LIMIT = 20;
const BIG_PROJECT = 100;
const TRAITS = ["fruitColor", "fruitWeight", "seedColor", "seedWeight"];
const srOnly = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };

const FilterChip = ({ selected, label, onClick }) => (
  <Chip
    label={label}
    onClick={onClick}
    color={selected ? "primary" : "default"}
    variant={selected ? "filled" : "outlined"}
    icon={selected ? <CheckIcon /> : undefined}
    aria-pressed={selected}
    sx={{ height: 36, flexShrink: 0, "&::after": { content: '""', position: "absolute", inset: "-4px 0" } }}
  />
);

function EmptyProject({ onCreateLine, onAddFounders }) {
  const steps = [
    ["Founders", "Plants with no parents, e.g. Roma VF."],
    ["First cross", "Pick a mother and a father. The generation is worked out."],
    ["Next rounds", "Offspring of F1, crossed or selfed."],
  ];
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 }, textAlign: "center", borderRadius: 4 }}>
      <CallMergeIcon color="primary" sx={{ fontSize: 48 }} aria-hidden="true" />
      <Typography variant="h5" component="h2" sx={{ mt: 1 }}>
        No lines yet
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 480, mx: "auto", my: 1 }}>
        A line is a named lineage. Start with plants you already have, then cross or self them to grow it.
      </Typography>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap", my: 2 }}>
        <Button variant="contained" onClick={onCreateLine} sx={{ minHeight: 48 }}>
          Create first line
        </Button>
        <Button variant="outlined" onClick={onAddFounders} sx={{ minHeight: 48 }}>
          Add founder plants
        </Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2, textAlign: "left" }}>
        {steps.map(([title, body], i) => (
          <Box key={title}>
            <Typography sx={{ fontWeight: 700 }}>{`${i + 1}. ${title}`}</Typography>
            <Typography variant="body2" color="text.secondary">
              {body}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

export default function PlantsTab({ pedigree: p, userId, projectId, pageSize, onPageSize }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [lineLimit, setLineLimit] = useState(LINE_LIMIT);
  const initialised = useRef(false);

  const { lines, counts, filters, expandedLineIds } = p;
  const names = useMemo(() => lineNameMap(lines), [lines]);
  const totalPlants = useMemo(() => lines.reduce((n, l) => n + (l.plantCount ?? 0), 0), [lines]);
  const hasRealLines = lines.some((l) => !l.isFounders);
  const isEmptyProject = totalPlants === 0 && !hasRealLines;
  const filtersActive = filters.lineId !== null || filters.latestOnly || filters.q.trim() !== "";
  const visible = useMemo(() => visibleLines(lines, { ...filters, counts }), [lines, filters, counts]);
  const shown = visible.slice(0, lineLimit);
  const { chips, more } = useMemo(() => lineChips(lines, counts, filters.lineId), [lines, counts, filters.lineId]);
  const allExpanded = shown.length > 0 && shown.every((l) => expandedLineIds.has(l.id));

  // First load: small projects open fully; big ones open only the newest population.
  useEffect(() => {
    if (initialised.current || p.status !== "ready" || lines.length === 0) return;
    initialised.current = true;
    const ordered = visibleLines(lines, {});
    const populationsWithPlants = ordered.flatMap((l) => l.populations).filter((pop) => pop.plantCount > 0).length;
    if (totalPlants <= BIG_PROJECT && populationsWithPlants <= 8) {
      p.expandAll(ordered);
    } else {
      const firstId = ordered.find((l) => l.populations.length > 0)?.id;
      p.expandAll(ordered.map((l) => ({ id: l.id, populations: l.id === firstId ? l.populations.slice(0, 1) : [] })));
    }
  }, [p, lines, totalPlants]);

  const fail = (err, fallback) => setNotice(errorInfo(err, fallback).message);

  const createPlant = async (body) => {
    const result = await p.createPlants(body);
    const plant = result.plants?.[0];
    if (plant) {
      const popName = result.line?.populations?.find((pop) => pop.id === plant.populationId)?.name ?? "";
      setAnnouncement(`Added ${plant.tag} to ${result.line?.name}, population ${popName}.`);
    }
    return result;
  };

  const refOf = (ref) => (ref?.plantId ? { plantId: ref.plantId, tag: ref.tag } : null);

  const handleAction = async (action) => {
    switch (action.type) {
      case "open-plant":
        return setDialog({ type: "detail", plant: action.plant });
      case "open-parent":
        try {
          return setDialog({ type: "detail", plant: await getPlant(userId, projectId, action.parentId) });
        } catch (err) {
          return fail(err, "Could not open the plant.");
        }
      case "self": {
        const self = refOf({ plantId: action.plant.plantId, tag: action.plant.tag });
        return setDialog({ type: "add", mode: "self", preset: { mother: self, father: self } });
      }
      case "edit-parents":
        return setDialog({ type: "edit-parents", plant: action.plant });
      case "delete-plant":
        return setDialog({ type: "delete", plant: action.plant });
      case "add-plant-to-line":
        return setDialog({ type: "add", mode: "add", preset: { lineId: action.line.id } });
      case "add-plant-to-population": {
        const pop = action.population;
        return setDialog({
          type: "add",
          mode: "add",
          preset: { lineId: action.line.id, populationId: pop.id, season: pop.season ?? undefined, year: pop.year ?? undefined, fieldId: pop.fieldId ?? null },
        });
      }
      case "continue-line":
        return setDialog({ type: "continue", line: action.line });
      case "new-population":
        return setDialog({ type: "new-population", line: action.line });
      case "toggle-stable":
        try {
          return await p.markStable(action.line.id, !(action.line.isStable || action.line.stabilityState === "stable"));
        } catch (err) {
          return fail(err, "Could not change the line. Nothing was changed.");
        }
      case "delete-population":
        try {
          await p.deletePopulation(action.population.id);
          return setNotice(`Deleted empty population ${action.population.name}.`);
        } catch (err) {
          return fail(err, "Could not delete the population. Nothing was changed.");
        }
      case "filter-line":
        return p.setLineFilter(action.lineId);
      default:
        return undefined;
    }
  };

  const saveTrait = (plant, field, value) => {
    const body = Object.fromEntries(TRAITS.map((k) => [k, plant[k] ?? ""]));
    return p.updateTraits(plant.plantId, plant.populationId, { ...body, [field]: value, version: plant.version });
  };
  const saveTraits = (plant, body) => p.updateTraits(plant.plantId, plant.populationId, body);

  const deletePlant = async (plant, confirm) => {
    const result = await p.deletePlant(plant.plantId, confirm);
    setDialog(null);
    const n = result?.childrenAffected ?? 0;
    setNotice(n > 0 ? `Deleted ${plant.tag}. ${n} ${n === 1 ? "child" : "children"} kept.` : `Deleted ${plant.tag}.`);
  };

  const handleUndo = async () => {
    try {
      await p.runUndo();
    } catch (err) {
      fail(err, "Could not undo. Nothing was changed.");
    }
  };

  const close = () => setDialog(null);
  const lineOf = (plant) => names[plant.lineId] ?? "";
  const populationNameOf = (plant) =>
    lines.flatMap((l) => l.populations ?? []).find((pop) => pop.id === plant.populationId)?.name ?? "";

  const openAdd = (mode, preset = {}) => setDialog({ type: "add", mode, preset });
  const summary = filters.latestOnly
    ? `Showing latest generation only (${pluralPlants(counts.total)})`
    : `${pluralPlants(totalPlants)} in ${lines.length} ${lines.length === 1 ? "line" : "lines"}`;

  const groupProps = {
    lines: shown,
    counts,
    searching: filters.q.trim() !== "",
    expandedLineIds,
    expandedPopulationIds: p.expandedPopulationIds,
    plantsByPopulation: p.plantsByPopulation,
    pageSize,
    onToggleLine: p.toggleLine,
    onTogglePopulation: p.togglePopulation,
    onGoToPage: p.goToPage,
    onAction: handleAction,
  };

  const crossButton = (
    <Tooltip title={totalPlants < 2 ? "Add at least two plants first" : ""}>
      <span>
        <Button variant="outlined" disabled={totalPlants < 2} onClick={() => openAdd("cross")} startIcon={<CallMergeIcon />} sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}>
          Cross plants
        </Button>
      </span>
    </Tooltip>
  );
  const rankButton = (
    <Tooltip title="Coming in a later step">
      <span>
        <Button disabled aria-disabled="true" startIcon={<LockOutlinedIcon />} sx={{ minHeight: 44, width: { xs: "100%", md: "auto" }, borderStyle: "dashed", borderWidth: 1, borderColor: "divider" }} variant="outlined">
          Rank &amp; select · later
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <Box sx={{ mx: { xs: 0, sm: 1 } }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: { md: "center" }, gap: 1.5, mb: 2, flexDirection: { xs: "column", md: "row" } }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" component="h2">
            Plants
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {summary}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openAdd("add")} sx={{ minHeight: 48, width: { xs: "100%", md: "auto" }, order: { xs: -1, md: 3 } }}>
          Add plant
        </Button>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "auto auto" }, gap: 1, width: { xs: "100%", md: "auto" }, order: { md: 2 } }}>
          {crossButton}
          {rankButton}
        </Box>
        {!isEmptyProject && (
          <TextField
            size="small"
            label="Search tag or trait"
            value={filters.q}
            onChange={(e) => p.setSearchText(e.target.value)}
            sx={{ width: { xs: "100%", md: 220, xl: 280 }, order: { md: 1 }, "& .MuiInputBase-root": { minHeight: 44 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          />
        )}
      </Box>

      <Box role="status" sx={srOnly}>
        {announcement}
      </Box>

      {isEmptyProject ? (
        <EmptyProject onCreateLine={() => setDialog({ type: "create-line" })} onAddFounders={() => openAdd("founder")} />
      ) : (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: { xs: "nowrap", md: "wrap" }, overflowX: { xs: "auto", md: "visible" }, scrollSnapType: "x proximity", pb: 0.5, mb: 1 }} role="group" aria-label="Line">
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
              Line
            </Typography>
            <FilterChip selected={filters.lineId === null} label={`All ${totalPlants}`} onClick={() => p.setLineFilter(null)} />
            {chips.map((c) => (
              <FilterChip key={c.id} selected={filters.lineId === c.id} label={`${c.name} ${c.count}`} onClick={() => p.setLineFilter(c.id)} />
            ))}
            {more.length > 0 && (
              <>
                <Chip label="More lines" onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ height: 36, flexShrink: 0 }} />
                <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
                  {more.map((c) => (
                    <MenuItem key={c.id} sx={{ minHeight: 44 }} onClick={() => { p.setLineFilter(c.id); setMoreAnchor(null); }}>
                      {`${c.name} ${c.count}`}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
            <FilterChip selected={filters.latestOnly} label="Latest generation only" onClick={() => p.setLatestOnly(!filters.latestOnly)} />
            <Box sx={{ flex: 1 }} />
            {isMobile ? (
              <Button onClick={() => (allExpanded ? p.collapseAll() : p.expandAll(shown))} sx={{ minHeight: 44 }}>
                {allExpanded ? "Collapse all" : "Expand all"}
              </Button>
            ) : (
              <>
                <Button onClick={() => p.expandAll(shown)} sx={{ minHeight: 44 }}>
                  Expand all
                </Button>
                <Button onClick={p.collapseAll} sx={{ minHeight: 44 }}>
                  Collapse all
                </Button>
              </>
            )}
          </Box>

          {visible.length === 0 && filtersActive ? (
            <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
              <Typography>No plants match.</Typography>
              <Button onClick={p.clearFilters} sx={{ minHeight: 44 }}>
                Clear filters
              </Button>
            </Paper>
          ) : isMobile ? (
            <PlantsGroupedList {...groupProps} onLoadMore={p.loadMore} />
          ) : (
            <PlantsGroupedTable {...groupProps} onPageSize={onPageSize} onSaveTrait={saveTrait} />
          )}
          {visible.length > lineLimit && (
            <Button onClick={() => setLineLimit((n) => n + LINE_LIMIT)} sx={{ minHeight: 44, mt: 1 }}>
              Show more lines
            </Button>
          )}
        </>
      )}

      {dialog?.type === "add" && (
        <AddPlantDialog
          mode={dialog.mode}
          preset={dialog.preset}
          userId={userId}
          projectId={projectId}
          lineNames={names}
          onClose={close}
          onCreate={createPlant}
        />
      )}
      {dialog?.type === "detail" && (
        <PlantDetailDialog
          key={dialog.plant.plantId}
          plant={dialog.plant}
          lineName={lineOf(dialog.plant)}
          populationName={populationNameOf(dialog.plant)}
          onClose={close}
          onSaveTraits={saveTraits}
          onEditParents={(plant) => setDialog({ type: "edit-parents", plant })}
          onDelete={(plant) => setDialog({ type: "delete", plant })}
        />
      )}
      {dialog?.type === "edit-parents" && (
        <EditParentsDialog plant={dialog.plant} userId={userId} projectId={projectId} lineNames={names} onClose={close} onSubmit={p.updateParents} />
      )}
      {dialog?.type === "delete" && (
        <DeletePlantDialog plant={dialog.plant} lineName={lineOf(dialog.plant)} userId={userId} projectId={projectId} onClose={close} onDelete={deletePlant} />
      )}
      {dialog?.type === "continue" && (
        <ContinueLineDialog line={dialog.line} existingNames={lines.map((l) => l.name)} onClose={close} onSubmit={(line, body) => p.renameLine(line.id, body)} />
      )}
      {dialog?.type === "new-population" && (
        <NewPopulationDialog
          line={dialog.line}
          userId={userId}
          projectId={projectId}
          onClose={close}
          onSubmit={async (body) => {
            await p.createPopulation(body);
            setNotice("Population created.");
          }}
        />
      )}
      {dialog?.type === "create-line" && (
        <CreateLineDialog existingNames={lines.map((l) => l.name)} onClose={close} onSubmit={p.createLine} />
      )}

      <UndoSnackbar undo={p.undo} notice={notice} onUndo={handleUndo} onDismissUndo={p.dismissUndo} onDismissNotice={() => setNotice("")} />
    </Box>
  );
}
