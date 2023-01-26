import React, { useContext } from "react";
import LocationInfo from "../../components/locationInfo/LocationInfo";
import HomeMain from "../../components/homeMain/HomeMain";
import Sidebar from "../../components/sidebar/Sidebar";
import "./homePage.css";
import authContext from "../../contexts/AuthContext";
import { Container } from "@mui/system";
import { Grid, Typography } from "@mui/material";
import { classes } from "../../styles/homeStyle";

function HomePage(props) {
  const { activeUser } = useContext(authContext);
  return (
    <Container>
      <Typography variant="h3" margin={5}>
        {" "}
        Welcome {activeUser?.userName ? activeUser.userName : "guest"}
      </Typography>
      <Container style={classes.locationInfoContainer}>
        <LocationInfo />
      </Container>
      <Container>
        <Grid container spacing={8}>
          <Grid item xs={4}>
            <Container>
              <Sidebar />
            </Container>
          </Grid>
          <Grid item xs={8}>
            <Container>
              <HomeMain />
            </Container>
          </Grid>
        </Grid>
      </Container>
    </Container>
  );
}

export default HomePage;
