import React from 'react';
import { List, ListItemButton, ListItemText } from "@mui/material";

const SECTIONS = ["General", "Profile", "Subscriptions", "Settings", "Delete Account"];

function AccountHeaderList({ formType, onFormChange }) {
  return (
    <List sx={{ p: 0 }}>
      {SECTIONS.map((item) => {
        const isActive = item === formType;
        return (
          <ListItemButton
            key={item}
            onClick={() => onFormChange(item)}
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
              primary={item}
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

export default AccountHeaderList;
