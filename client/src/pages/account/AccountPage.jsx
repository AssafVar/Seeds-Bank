import React from "react";
import "./accountPage.css";
import AccountHeaderList from "../../components/account/AccountHeaderList";
import AccountGeneral from "../../components/account/AccountGeneral";
import { Box, Grid, Typography } from "@mui/material";
import { Container } from "@mui/system";
import { classes } from "../../styles/accountStyle.js";

function AccountPage(props) {
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
            <AccountHeaderList />
          </Box>
        </Grid>
        <Grid item xs={8}>
          <Box>
            {" "}
            <AccountGeneral />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AccountPage;
