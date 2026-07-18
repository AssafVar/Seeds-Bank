import React from "react";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import GrassIcon from "@mui/icons-material/Grass";
import DeleteIcon from "@mui/icons-material/Delete";
import VerifiedIcon from "@mui/icons-material/Verified";

export default function PlantCard({
  row,
  index,
  isStable,
  stableGenerations,
  onFieldChange,
  onAddChild,
  onDelete,
}) {
  return (
    <Card sx={{ width: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            label="Line"
            fullWidth
            name="line"
            id={`line${row.plant_id}`}
            value={row.line}
            onInput={(e) => onFieldChange(e.target)}
          />
          {isStable && (
            <Tooltip title={`Stable for ${stableGenerations} generations`}>
              <VerifiedIcon color="success" fontSize="small" />
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Fruit Color"
            fullWidth
            name="fruit_color"
            id={`fruit_color${index}`}
            value={row.fruit_color}
            onInput={(e) => onFieldChange(e.target)}
          />
          <TextField
            label="Fruit Weight"
            fullWidth
            name="fruit_weight"
            id={`fruit_weight${index}`}
            value={row.fruit_weight}
            onChange={(e) => onFieldChange(e.target)}
          />
          <TextField
            label="Seed Color"
            fullWidth
            name="seed_color"
            id={`seed_color${index}`}
            value={row.seed_color}
            onChange={(e) => onFieldChange(e.target)}
          />
          <TextField
            label="Seed Weight"
            fullWidth
            name="seed_weight"
            id={`seed_weight${index}`}
            value={row.seed_weight}
            onChange={(e) => onFieldChange(e.target)}
          />
          <TextField
            label="Generation"
            fullWidth
            name="generation"
            id={`generation${index}`}
            value={row.generation}
            onChange={(e) => onFieldChange(e.target)}
          />
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: "space-around" }}>
        <Tooltip title="Add Child">
          <Button onClick={onAddChild} variant="text" color="secondary">
            <GrassIcon color="success" />
          </Button>
        </Tooltip>
        <Tooltip title="Remove plant">
          <Button onClick={onDelete} variant="text" color="secondary">
            <DeleteIcon color="error" />
          </Button>
        </Tooltip>
      </CardActions>
    </Card>
  );
}
