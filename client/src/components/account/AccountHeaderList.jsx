import React from 'react';
import { Box } from "@mui/system";
import { List, ListItemButton } from "@mui/material";

function AccountHeaderList({formType,onFormChange}) {

    const headerList = [
        "General",
        "Profile",
        "Subscriptions",
        "Settings",
        "Delete Account",
      ];

    return (
        <>
            <Box sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
        <List>
          {headerList.map((item, index) => (
            <ListItemButton
              key={index}
              selected={index === +headerList.indexOf(formType)}
              onClick = {() => onFormChange(item)}
            >
              {item}
            </ListItemButton>
          ))}
        </List>
        </Box>
      </>
    );
}

export default AccountHeaderList;