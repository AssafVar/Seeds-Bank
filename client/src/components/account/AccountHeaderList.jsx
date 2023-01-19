import React, { useState } from 'react';
import { Box } from "@mui/system";
import { List, ListItemButton } from "@mui/material";

function AccountHeaderList(props) {
    const headerList = [
        "General",
        "account",
        "Subscriptions",
        "Settings",
        "Delete account",
      ];
      const [formType, setFormType] = useState(headerList[0]);

    return (
        <>
            <Box sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
        <List>
          {headerList.map((item, index) => (
            <ListItemButton
              key={index}
              selected={index === +headerList.indexOf(formType)}
              onClick={() => setFormType(item)}
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