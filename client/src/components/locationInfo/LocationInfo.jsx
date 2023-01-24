import { Button, Grid, Typography } from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useState } from "react";
import "./locationInfo.css";
import { classes } from "../../styles/homeStyle";
import { getTempDataAPI } from "../../services/serverCalls";

function LocationInfo(props) {
  const [position, setPosition] = useState("");

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => setPosition(position.coords),
      (error) => console.log(error)
    );
  };
  const getTempData = async (lat, lng) => {
    const result = await getTempDataAPI(lat, lng);
    console.log(result);
  };
  return (
    <Container>
      <Grid container spacing={1} style={classes.main}>
        <Grid item xs={4} style={classes.box}>
          <Box className={classes.box}>
            <Button onClick={getLocation}>Get current location</Button>
            <Button
              onClick={() =>
                getTempData(
                  position.latitude.toFixed(2),
                  position.longitude.toFixed(2)
                )
              }
            >
              Get temp data
            </Button>

            {position && (
              <>
                <Typography>Latitude: {position.latitude}</Typography>
                <Typography>Longtitude: {position.longitude}</Typography>
              </>
            )}
          </Box>
        </Grid>
        <Grid item xs={4} style={classes.box}>
          <Typography>Temp:</Typography>
        </Grid>
        <Grid item xs={4} style={classes.box}>
          <Typography>Weather:</Typography>
        </Grid>
      </Grid>
    </Container>
  );
}

export default LocationInfo;
