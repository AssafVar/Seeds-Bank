import React, { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EventIcon from "@mui/icons-material/Event";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VerifiedIcon from "@mui/icons-material/Verified";
import { originText, pluralPlants } from "../../libs/pedigree";
import { GenerationChip, LineStatusChip } from "./PedigreeChips.jsx";

const tap = { width: 44, height: 44 };

export function KebabMenu({ label, children }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  return (
    <>
      <IconButton aria-label={label} aria-haspopup="menu" aria-expanded={Boolean(anchor)} onClick={(e) => setAnchor(e.currentTarget)} sx={tap}>
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} onClick={close}>
        {children}
      </Menu>
    </>
  );
}

export const menuItem = (icon, text, onClick, extra = {}) => (
  <MenuItem key={text} onClick={onClick} sx={{ minHeight: 44, ...extra.sx }} {...extra.props}>
    <ListItemIcon>{icon}</ListItemIcon>
    {text}
  </MenuItem>
);

export function LineHeader({ line, expanded, matchCount, onToggle, onAction }) {
  const populationCount = (line.populations ?? []).length;
  const stable = line.stabilityState === "stable" || line.isStable;
  const forks = line.forks ?? [];
  const forkedFrom = line.origin?.forkedFrom;
  const origin = originText(line);
  const meta = line.plantCount === 0 ? "0 plants" : `${populationCount} ${populationCount === 1 ? "population" : "populations"} · ${pluralPlants(line.plantCount)}`;

  // Phone: row 1 = name, status, kebab; row 2 = origin, forks, counts (full width).
  // Desktop: everything on one row.
  return (
    <Box
      sx={{
        display: "grid",
        alignItems: "center",
        columnGap: 1,
        minHeight: 56,
        py: 0.5,
        minWidth: 0,
        gridTemplateColumns: { xs: "44px minmax(0, 1fr) auto", md: "44px minmax(0, auto) minmax(0, 1fr) auto" },
        gridTemplateAreas: { xs: '"toggle title actions" ". meta meta"', md: '"toggle title meta actions"' },
      }}
    >
      <IconButton
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={expanded ? `line-${line.id}-body` : undefined}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${line.name}, ${meta}`}
        sx={{ ...tap, gridArea: "toggle" }}
      >
        {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
      </IconButton>
      <Box sx={{ gridArea: "title", display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <Typography component="h3" variant="subtitle1" noWrap title={line.name} sx={{ fontWeight: 700, minWidth: 0, maxWidth: { md: 280 } }}>
          {line.name}
        </Typography>
        <Box sx={{ flexShrink: 0 }}>
          <LineStatusChip line={line} />
        </Box>
      </Box>
      <Box sx={{ gridArea: "meta", minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.5, px: { md: 0.5 } }}>
        {forkedFrom?.lineId ? (
          <Link component="button" type="button" variant="body2" onClick={() => onAction({ type: "filter-line", lineId: forkedFrom.lineId })} sx={{ minHeight: 44, textAlign: "left" }} title={`Continues ${forkedFrom.lineName} (latest generation was ${forkedFrom.label} when this line began)`}>
            {origin}
          </Link>
        ) : (
          origin && (
            <Typography variant="body2" color="text.secondary" title={origin} sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flexBasis: { xs: "100%", md: "auto" }, minWidth: 0 }}>
              {origin}
            </Typography>
          )
        )}
        {forks.length > 0 && (
          <Link component="button" type="button" variant="body2" onClick={() => onAction({ type: "filter-line", lineId: forks[0].lineId })} sx={{ minHeight: 44 }}>
            {`Continued as ${forks[0].name}${forks.length > 1 ? ` +${forks.length - 1}` : ""}`}
          </Link>
        )}
        <Typography variant="body2" color="text.secondary">
          {meta}
          {matchCount !== undefined ? ` · ${matchCount} ${matchCount === 1 ? "match" : "matches"}` : ""}
        </Typography>
        {line.plantCount === 0 && !line.isFounders && (
          <Button size="small" startIcon={<AddIcon />} onClick={() => onAction({ type: "add-plant-to-line", line })} sx={{ minHeight: 44 }}>
            Add plant to this line
          </Button>
        )}
      </Box>
      <Box sx={{ gridArea: "actions", display: "flex", alignItems: "center", flexShrink: 0 }}>
        {!line.isFounders && (
          <Button
            size="small"
            startIcon={<VerifiedIcon />}
            onClick={() => onAction({ type: "toggle-stable", line })}
            sx={{ minHeight: 44, display: { xs: "none", md: "inline-flex" } }}
          >
            {stable ? "Mark as not stable" : "Mark line stable"}
          </Button>
        )}
        {!line.isFounders && (
          <KebabMenu label={`Line actions for ${line.name}`}>
            {menuItem(<CallSplitIcon fontSize="small" />, "Continue as new line...", () => onAction({ type: "continue-line", line }))}
            {menuItem(<EventIcon fontSize="small" />, "New population", () => onAction({ type: "new-population", line }))}
            {menuItem(<VerifiedIcon fontSize="small" />, stable ? "Mark as not stable" : "Mark line stable", () => onAction({ type: "toggle-stable", line }), {
              sx: { display: { md: "none" } },
            })}
          </KebabMenu>
        )}
      </Box>
    </Box>
  );
}

export function PopulationHeader({ line, population, expanded, onToggle, onAction }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1, minHeight: 48, pl: 2 }}>
      <IconButton
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={expanded ? `pop-${population.id}-body` : undefined}
        aria-label={`${expanded ? "Collapse" : "Expand"} population ${population.name}`}
        sx={tap}
      >
        {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
      </IconButton>
      <Typography component="h4" variant="body1" noWrap title={population.name} sx={{ fontWeight: 600, maxWidth: { xs: "55%", sm: 320 } }}>
        {population.name}
      </Typography>
      <GenerationChip label={population.label} />
      <Typography variant="body2" color="text.secondary">
        {pluralPlants(population.plantCount)}
      </Typography>
      {expanded && population.plantCount > 0 && !line.isFounders && (
        <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "inline" } }}>
          Generation worked out from the parents
        </Typography>
      )}
      <Box sx={{ flex: 1 }} />
      {population.plantCount === 0 && (
        <KebabMenu label={`Population actions for ${population.name}`}>
          {menuItem(<DeleteOutlineIcon fontSize="small" />, "Delete empty population", () => onAction({ type: "delete-population", line, population }))}
        </KebabMenu>
      )}
    </Box>
  );
}
