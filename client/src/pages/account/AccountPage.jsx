import React, {useEffect, useState} from "react";
import "./accountPage.css";
import AccountHeaderList from "../../components/account/AccountHeaderList";
import AccountGeneral from "../../components/account/AccountGeneral";
import { Box, Grid, Typography } from "@mui/material";
import { Container } from "@mui/system";
import { classes } from "../../styles/accountStyle.js";
import AccountProfile from "../../components/account/AccountProfile";
import AccountDelete from "../../components/account/AccountDelete";

function AccountPage(props) {

  const [formType, setFormType] = useState("General");
  const onFormChange = (type) => {
    setFormType(type);
  };

  return (
    <Container>
      <Typography variant="h3" style={classes.pageHeadline}>
        {" "}
        User Account
      </Typography>
      <Grid container spacing={8}>
        <Grid item xs={4}>
          <Box>
            {" "}
            <AccountHeaderList onFormChange={onFormChange} formType={formType}/>
          </Box>
        </Grid>
        <Grid item xs={8}>
          <Box>
            {" "}
            {formType==="General" && <AccountGeneral />}
            {formType==="Profile" && <AccountProfile />}
            {formType==="Delete Account" && <AccountDelete />}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AccountPage;
