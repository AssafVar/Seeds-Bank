import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GrassIcon from "@mui/icons-material/Grass";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { traitSummary } from "../../libs/pedigree";
import { KebabMenu, LineHeader, PopulationHeader, menuItem } from "./GroupHeaders.jsx";
import { GenerationChip, ParentRemovedChip } from "./PedigreeChips.jsx";

const POPULATION_LIMIT = 5;

function ParentLink({ parent, role, onOpen, onEditParents }) {
  if (parent.removed) return <ParentRemovedChip onClick={onEditParents} />;
  return (
    <Typography variant="body2" component="span">
      {role}:{" "}
      <Link component="button" type="button" variant="body2" onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-label={`${role} ${parent.tag}, opens plant`} sx={{ minHeight: 44, verticalAlign: "baseline" }}>
        {parent.tag}
      </Link>
    </Typography>
  );
}

function PlantCard({ plant, onAction }) {
  const hasParents = Boolean(plant.mother || plant.father);
  const open = () => onAction({ type: "open-plant", plant });
  return (
    <Paper variant="outlined" onClick={open} sx={{ minHeight: 64, p: 1.5, mx: 2, my: 1, cursor: "pointer" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Link component="button" type="button" underline="none" onClick={(e) => { e.stopPropagation(); open(); }} title={plant.tag} aria-label={`Open ${plant.tag}`} sx={{ fontWeight: 700, minHeight: 44, minWidth: 0, textAlign: "left", maxWidth: "55%" }} noWrap>
          {plant.tag}
        </Link>
        <GenerationChip label={plant.label} kept={Boolean(plant.mother?.removed || plant.father?.removed)} />
        <Box sx={{ flex: 1 }} />
        <Box onClick={(e) => e.stopPropagation()}>
          <KebabMenu label={`Plant actions for ${plant.tag}`}>
            {menuItem(<GrassIcon fontSize="small" />, "Self this plant", () => onAction({ type: "self", plant }))}
            {hasParents && menuItem(<LinkOffIcon fontSize="small" />, "Edit parents", () => onAction({ type: "edit-parents", plant }))}
            {menuItem(<DeleteOutlineIcon fontSize="small" />, "Delete plant", () => onAction({ type: "delete-plant", plant }))}
          </KebabMenu>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 2, alignItems: "center" }}>
        {hasParents ? (
          <>
            {plant.mother && <ParentLink parent={plant.mother} role="Mother" onOpen={() => onAction({ type: "open-parent", parentId: plant.mother.plantId })} onEditParents={() => onAction({ type: "edit-parents", plant })} />}
            {plant.father && <ParentLink parent={plant.father} role="Father" onOpen={() => onAction({ type: "open-parent", parentId: plant.father.plantId })} onEditParents={() => onAction({ type: "edit-parents", plant })} />}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">No parents</Typography>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {traitSummary(plant).join(" · ")}
      </Typography>
    </Paper>
  );
}

export default function PlantsGroupedList({
  lines,
  counts,
  searching,
  expandedLineIds,
  expandedPopulationIds,
  plantsByPopulation,
  pageSize,
  onToggleLine,
  onTogglePopulation,
  onGoToPage,
  onLoadMore,
  onAction,
}) {
  const [showAll, setShowAll] = useState(() => new Set());

  return (
    <Box>
      {lines.map((line) => {
        const lineOpen = expandedLineIds.has(line.id);
        const populations = showAll.has(line.id) ? line.populations : line.populations.slice(0, POPULATION_LIMIT);
        const hidden = line.populations.length - populations.length;
        const lineMatches = searching ? line.populations.reduce((n, p) => n + (counts.byPopulation[p.id] ?? 0), 0) : undefined;
        return (
          <Paper key={line.id} variant="outlined" sx={{ mb: 2, borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: "background.paper", backgroundImage: (theme) => `linear-gradient(${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.main, 0.08)})` }}>
              <LineHeader line={line} expanded={lineOpen} matchCount={lineMatches} onToggle={() => onToggleLine(line.id)} onAction={onAction} />
            </Box>
            {lineOpen &&
              populations.map((population) => {
                const popOpen = expandedPopulationIds.has(population.id);
                const state = plantsByPopulation[population.id];
                const loaded = state?.items?.length ?? 0;
                return (
                  <Box key={population.id} sx={{ borderTop: 1, borderColor: "divider" }}>
                    <PopulationHeader line={line} population={population} expanded={popOpen} onToggle={() => onTogglePopulation(population.id)} onAction={onAction} />
                    {popOpen && population.plantCount === 0 && (
                      <Box sx={{ pl: 2, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2">No plants yet.</Typography>
                        <Button size="small" onClick={() => onAction({ type: "add-plant-to-population", line, population })} sx={{ minHeight: 44 }}>
                          Add plant
                        </Button>
                      </Box>
                    )}
                    {popOpen && state?.status === "loading" && <LinearProgress aria-label="Loading plants" />}
                    {popOpen && state?.status === "error" && (
                      <Alert severity="error" sx={{ m: 2 }} action={<Button color="inherit" onClick={() => onGoToPage(population.id, state.page)}>Retry</Button>}>
                        Could not load plants. Check your connection and try again.
                      </Alert>
                    )}
                    {popOpen && (state?.items ?? []).map((plant) => <PlantCard key={plant.plantId} plant={plant} onAction={onAction} />)}
                    {popOpen && state && state.totalCount > loaded && loaded > 0 && (
                      <Box sx={{ px: 2, pb: 1.5, display: "flex", alignItems: "center", gap: 2 }}>
                        <Button onClick={() => onLoadMore(population.id)} sx={{ minHeight: 44 }}>{`Show ${pageSize} more`}</Button>
                        <Typography variant="body2" color="text.secondary">{`Showing ${loaded} of ${state.totalCount}`}</Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}
            {lineOpen && hidden > 0 && (
              <Button sx={{ ml: 2, minHeight: 44 }} onClick={() => setShowAll((prev) => new Set(prev).add(line.id))}>
                {`Show ${hidden} older ${hidden === 1 ? "population" : "populations"}`}
              </Button>
            )}
          </Paper>
        );
      })}
    </Box>
  );
}
