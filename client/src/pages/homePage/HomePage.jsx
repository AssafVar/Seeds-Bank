import React, { useContext } from "react";
import LocationInfo from "../../components/locationInfo/LocationInfo";
import "./homePage.css";
import authContext from "../../contexts/AuthContext";
import { Container } from "@mui/system";
import { Grid} from "@mui/material";
import PageHeadline from "../../components/headline/PageHeadline";
import HomePageAbout from "./HomePageAbout";

function HomePage(props) {
  const { activeUser } = useContext(authContext);
  const welcomingTitle = activeUser?.userName
    ? `Welcome ${activeUser.userName}`
    : `Welcome new member`;

  return (
    <Container>
      <PageHeadline title={welcomingTitle} />
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <HomePageAbout />
        </Grid>
        <Grid item xs={12} md={8}> <LocationInfo /></Grid>
      </Grid>
      <Container>
        <Grid container spacing={8}>
          <Grid item xs={4}>
          </Grid>
          <Grid item xs={8}>
          </Grid>
        </Grid>
      </Container>
    </Container>
  );
}

export default HomePage;
