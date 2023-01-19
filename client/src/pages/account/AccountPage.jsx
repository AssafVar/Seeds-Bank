import React, { useState } from "react";
import "./accountPage.css";
import { Box } from "@mui/system";
import AccountHeaderList from "../../components/account/AccountHeaderList";

function AccountPage(props) {
  return (
    <div className="account-container">
      <h1> User Account</h1>
      <div className="left-container">
        <AccountHeaderList/>
        <Box sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}>
            
        </Box>
      </div>
    </div>
  );
}

export default AccountPage;
