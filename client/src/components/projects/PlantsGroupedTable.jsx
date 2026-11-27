import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import GrassIcon from "@mui/icons-material/Grass";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { errorInfo } from "../../libs/pedigree";
import { KebabMenu, LineHeader, PopulationHeader, menuItem } from "./GroupHeaders.jsx";
import { GenerationChip, ParentRemovedChip } from "./PedigreeChips.jsx";

const COLUMNS = 8;
const HEADERS = ["Tag", "Mother", "Father", "Fruit color", "Fruit wt (g)", "Seed color", "Seed wt (mg)"];
const TRAIT_COLUMNS = ["fruitColor", "fruitWeight", "seedColor", "seedWeight"];
const POPULATION_LIMIT = 5;
// Tag gets room for real tags; the generation chip never squeezes it.
const COLUMN_WIDTHS = [210, 150, 150, 100, 90, 100, 90, 150];
export const PAGE_SIZE_OPTIONS = [25, 50, 100];

function ParentCell({ parent, role, onOpen, onEditParents }) {
  if (parent.removed) return <ParentRemovedChip onClick={onEditParents} />;
  return (
    <Link component="button" type="button" variant="body2" onClick={onOpen} aria-label={`${role} ${parent.tag}, opens plant`} sx={{ minHeight: 44 }}>
      {parent.tag}
    </Link>
  );
}

// Click to edit: Enter saves, Esc puts the old value back. A rejected value keeps the cell open.
function TraitCell({ plant, field, label, onSave }) {
  const current = plant[field] ?? "";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [error, setError] = useState("");

  const cancel = () => {
    setEditing(false);
    setError("");
  };
  const commit = async () => {
    if (value === current) return cancel();
    try {
      await onSave(plant, field, value);
      cancel();
    } catch (err) {
      setError(errorInfo(err, "Could not save the plant. Nothing was changed.").message);
    }
  };

  if (!editing) {
    return (
      <Button
        color="inherit"
        onClick={() => {
          setValue(current);
          setEditing(true);
        }}
        aria-label={`Edit ${label} of ${plant.tag}`}
        sx={{ minHeight: 44, minWidth: 0, justifyContent: "flex-start", textTransform: "none", fontWeight: 400 }}
      >
        {current || "—"}
      </Button>
    );
  }
  return (
    <TextField
      size="small"
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          e.stopPropagation();
          cancel();
        }
      }}
      error={Boolean(error)}
      helperText={error || undefined}
      inputProps={{ "aria-label": `${label} of ${plant.tag}`, maxLength: 200 }}
      FormHelperTextProps={{ "aria-live": "polite" }}
    />
  );
}

function PlantRow({ plant, onAction, onSaveTrait }) {
  const hasParents = Boolean(plant.mother || plant.father);
  return (
    <TableRow hover>
      <TableCell component="th" scope="row" sx={{ pl: 6, fontWeight: 600 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <Typography component="span" noWrap title={plant.tag} sx={{ fontWeight: 600, minWidth: 0, flex: "1 1 auto" }}>
            {plant.tag}
          </Typography>
          <Box sx={{ flexShrink: 0 }}>
            <GenerationChip label={plant.label} kept={Boolean(plant.mother?.removed || plant.father?.removed)} />
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        {plant.mother ? (
          <ParentCell parent={plant.mother} role="Mother" onOpen={() => onAction({ type: "open-parent", parentId: plant.mother.plantId })} onEditParents={() => onAction({ type: "edit-parents", plant })} />
        ) : (
          <Typography variant="body2" color="text.secondary">{hasParents ? "—" : "No parents"}</Typography>
        )}
      </TableCell>
      <TableCell>
        {plant.father ? (
          <ParentCell parent={plant.father} role="Father" onOpen={() => onAction({ type: "open-parent", parentId: plant.father.plantId })} onEditParents={() => onAction({ type: "edit-parents", plant })} />
        ) : (
          hasParents && <Typography variant="body2" color="text.secondary">—</Typography>
        )}
      </TableCell>
      {TRAIT_COLUMNS.map((field, i) => (
        <TableCell key={field}>
          <TraitCell plant={plant} field={field} label={HEADERS[3 + i]} onSave={onSaveTrait} />
        </TableCell>
      ))}
      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
        <IconButton aria-label={`Edit ${plant.tag}`} onClick={() => onAction({ type: "open-plant", plant })} sx={{ width: 44, height: 44 }}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label={`Delete ${plant.tag}`} onClick={() => onAction({ type: "delete-plant", plant })} sx={{ width: 44, height: 44 }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
        <KebabMenu label={`Plant actions for ${plant.tag}`}>
          {menuItem(<GrassIcon fontSize="small" />, "Self this plant", () => onAction({ type: "self", plant }))}
          {hasParents && menuItem(<LinkOffIcon fontSize="small" />, "Edit parents", () => onAction({ type: "edit-parents", plant }))}
          {menuItem(<DeleteOutlineIcon fontSize="small" />, "Delete plant", () => onAction({ type: "delete-plant", plant }))}
        </KebabMenu>
      </TableCell>
    </TableRow>
  );
}

const fullRow = (key, children, sx) => (
  <TableRow key={key}>
    <TableCell colSpan={COLUMNS} sx={{ p: 0, ...sx }}>
      {children}
    </TableCell>
  </TableRow>
);

export default function PlantsGroupedTable({
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
  onPageSize,
  onAction,
  onSaveTrait,
}) {
  const [showAll, setShowAll] = useState(() => new Set());

  return (
    <Paper variant="outlined" sx={{ borderRadius: 4, overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: "calc(100vh - 320px)", minHeight: 160 }}>
        <Table stickyHeader size="small" aria-label="Plants grouped by line and population" sx={{ minWidth: 1030, tableLayout: "fixed" }}>
          <colgroup>
            {COLUMN_WIDTHS.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <TableHead>
            <TableRow>
              {HEADERS.map((h, i) => (
                <TableCell key={h} sx={{ pl: i === 0 ? 6 : undefined, fontWeight: 700 }}>
                  {h}
                </TableCell>
              ))}
              <TableCell>
                <Box component="span" sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                  Actions
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          {lines.map((line) => {
              const lineOpen = expandedLineIds.has(line.id);
              const populations = showAll.has(line.id) ? line.populations : line.populations.slice(0, POPULATION_LIMIT);
              const hidden = line.populations.length - populations.length;
              const lineMatches = searching ? line.populations.reduce((n, p) => n + (counts.byPopulation[p.id] ?? 0), 0) : undefined;
              return (
                <TableBody key={line.id} id={lineOpen ? `line-${line.id}-body` : undefined}>
                  {fullRow(
                    `line-${line.id}`,
                    <LineHeader line={line} expanded={lineOpen} matchCount={lineMatches} onToggle={() => onToggleLine(line.id)} onAction={onAction} />,
                    { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) }
                  )}
                  {lineOpen &&
                    populations.map((population) => {
                      const popOpen = expandedPopulationIds.has(population.id);
                      const state = plantsByPopulation[population.id];
                      return (
                        <React.Fragment key={population.id}>
                          {fullRow(
                            `pop-${population.id}`,
                            <PopulationHeader line={line} population={population} expanded={popOpen} onToggle={() => onTogglePopulation(population.id)} onAction={onAction} />,
                            { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03) }
                          )}
                          {popOpen && population.plantCount === 0 &&
                            fullRow(
                              `empty-${population.id}`,
                              <Box sx={{ pl: 6, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="body2">No plants yet.</Typography>
                                <Button size="small" onClick={() => onAction({ type: "add-plant-to-population", line, population })} sx={{ minHeight: 44 }}>
                                  Add plant
                                </Button>
                              </Box>
                            )}
                          {popOpen && state?.status === "loading" && fullRow(`load-${population.id}`, <LinearProgress aria-label="Loading plants" />)}
                          {popOpen &&
                            state?.status === "error" &&
                            fullRow(
                              `err-${population.id}`,
                              <Alert severity="error" action={<Button color="inherit" onClick={() => onGoToPage(population.id, state.page)}>Retry</Button>}>
                                Could not load plants. Check your connection and try again.
                              </Alert>
                            )}
                          {popOpen && (state?.items ?? []).map((plant) => <PlantRow key={plant.plantId} plant={plant} onAction={onAction} onSaveTrait={onSaveTrait} />)}
                          {popOpen &&
                            state &&
                            state.totalCount > PAGE_SIZE_OPTIONS[0] &&
                            fullRow(
                              `page-${population.id}`,
                              <TablePagination
                                component="div"
                                count={state.totalCount}
                                page={Math.max(0, (state.page ?? 1) - 1)}
                                rowsPerPage={pageSize}
                                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                                onPageChange={(e, page) => onGoToPage(population.id, page + 1)}
                                onRowsPerPageChange={(e) => onPageSize(Number(e.target.value))}
                              />
                            )}
                        </React.Fragment>
                      );
                    })}
                  {lineOpen &&
                    hidden > 0 &&
                    fullRow(
                      `older-${line.id}`,
                      <Button sx={{ ml: 6, minHeight: 44 }} onClick={() => setShowAll((prev) => new Set(prev).add(line.id))}>
                        {`Show ${hidden} older ${hidden === 1 ? "population" : "populations"}`}
                      </Button>
                    )}
                </TableBody>
              );
            })}
        </Table>
      </TableContainer>
    </Paper>
  );
}
