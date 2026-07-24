import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";

// Title (+ optional description) on the left, an "Add" button on the right -
// the header row repeated at the top of every Admin CRUD section.
function SectionHeader({ title, description, buttonLabel, onAdd }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
      <Box>
        <Typography variant="h6">{title}</Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd} sx={{ flexShrink: 0 }}>
        {buttonLabel}
      </Button>
    </Box>
  );
}

export default SectionHeader;
