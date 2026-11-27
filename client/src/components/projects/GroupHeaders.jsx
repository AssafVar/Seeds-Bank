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

  return (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1, minHeight: 56, py: 0.5 }}>
      <IconButton
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${line.name}, ${meta}`}
        sx={tap}
      >
        {expanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
      </IconButton>
      <Typography component="h3" variant="subtitle1" noWrap title={line.name} sx={{ fontWeight: 700, maxWidth: { xs: "55%", sm: 280 } }}>
        {line.name}
      </Typography>
      <LineStatusChip line={line} />
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1.5, px: 0.5 }}>
        {forkedFrom?.lineId ? (
          <Link component="button" type="button" variant="body2" onClick={() => onAction({ type: "filter-line", lineId: forkedFrom.lineId })} sx={{ minHeight: 44 }} title={`Continues ${forkedFrom.lineName} (latest generation was ${forkedFrom.label} when this line began)`}>
            {origin}
          </Link>
        ) : (
          origin && (
            <Typography variant="body2" color="text.secondary" title={origin} sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
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
      </Box>
      {line.plantCount === 0 && !line.isFounders && (
        <Button size="small" startIcon={<AddIcon />} onClick={() => onAction({ type: "add-plant-to-line", line })} sx={{ minHeight: 44 }}>
          Add plant to this line
        </Button>
      )}
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
  );
}

export function PopulationHeader({ line, population, expanded, onToggle, onAction }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 1, minHeight: 48, pl: 2 }}>
      <IconButton
        onClick={onToggle}
        aria-expanded={expanded}
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
      {expanded && population.plantCount > 0 && (
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
