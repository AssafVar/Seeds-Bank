import React, { useContext } from "react";
import LocationInfo from "../../components/locationInfo/LocationInfo";
import HomeMain from "../../components/homeMain/HomeMain";
import Sidebar from "../../components/sidebar/Sidebar";
import "./homePage.css";
import authContext from "../../contexts/AuthContext";
import { Container } from "@mui/system";
import { Grid } from "@mui/material";

function HomePage(props) {
  const { activeUser } = useContext(authContext);
  return (
    <Container>
      <h1> Welcome {activeUser?.userName ? activeUser.userName : "guest"}</h1>
      <LocationInfo />
      <Container>
        <Grid container spacing={8}>
          <Grid item xs={4}>
            <Sidebar />
          </Grid>
          <Grid item xs={8}>
            <HomeMain />
          </Grid>
        </Grid>
      </Container>
    </Container>
  );
}

export default HomePage;
