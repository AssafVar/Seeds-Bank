import React from 'react';
import { List, ListItemButton, ListItemText } from "@mui/material";

function AdminSectionList({ sections, activeId, onChange }) {
  return (
    <List sx={{ p: 0 }}>
      {sections.map((section) => {
        const isActive = section.id === activeId;
        return (
          <ListItemButton
            key={section.id}
            onClick={() => onChange(section.id)}
            sx={{
              borderRadius: "10px",
              mb: 0.5,
              pl: 1.75,
              borderLeft: "3px solid",
              borderLeftColor: isActive ? "success.main" : "transparent",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <ListItemText
              primary={section.label}
              primaryTypographyProps={{
                color: isActive ? "success.main" : "text.primary",
                fontWeight: isActive ? 700 : 400,
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}

export default AdminSectionList;
