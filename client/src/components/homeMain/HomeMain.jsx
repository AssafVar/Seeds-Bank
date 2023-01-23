import React from "react";
import AppInfo from "./AppInfo";
import "./homeMain.css";
import Weather from "../Weather";
import Example from "../Example";
import { Container } from "@mui/system";
import { Grid } from "@mui/material";

function HomeMain(props) {
  return (
    <>
      <Container>
        <AppInfo />
      </Container>
      <Container>
        <Grid container spacing={8}>
          <Grid item xs={4}>
            <Weather />
          </Grid>
          <Grid item xs={4}>
            <Example />
          </Grid>
          <Grid item xs={4}>
            <Example />
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default HomeMain;
