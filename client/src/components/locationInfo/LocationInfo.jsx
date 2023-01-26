import { Button, Grid, Typography } from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useState } from "react";
import "./locationInfo.css";
import { classes } from "../../styles/homeStyle";
import { getTempDataAPI } from "../../services/serverCalls";
import LineChartTemp from "../lineChart/LineChartTemp";
import Carousel from "react-material-ui-carousel";

function LocationInfo(props) {
  const [position, setPosition] = useState({});
  const [chartData, setChartData] = useState([]);
  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => setPosition(position.coords),
      (error) => console.log(error)
    );
  };
  const getTempData = async (lat, lng) => {
    const result = await getTempDataAPI(lat, lng);
    const time = result.data.hourly.time.map((item, index) => {
      const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const date = new Date(item);
      return `${days[date.getDay()]} ${date.getHours()}:${date.getMinutes()}0`;
    });

    const data = {
      time: time,
      data: result.data.hourly.temperature_2m,
    };
    setChartData((prev) => [...prev, data]);
  };
  const deleteChart = (key) => {
    const newChartData = chartData.filter((item, index) => {
      return index !== key;
    });
    setChartData(newChartData);
  };

  return (
    <Container>
      <Typography variant="h5">Temprature data </Typography>
      <br />
      <Grid container spacing={2} style={classes.locationInfoMainGrid}>
        <Grid item xs={3} style={classes.locationInfoChart}>
          <Button onClick={getLocation}>Get current location</Button>
          <Button
            onClick={() =>
              getTempData(
                position?.latitude.toFixed(2),
                position?.longitude.toFixed(2)
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
        </Grid>
        <Grid item xs={1}></Grid>
        <Grid item xs={8} style={classes.locationInfoChart}>
          {chartData.length > 0 && (
            <Carousel animation="slide">
              {chartData.map((item, index) => (
                <Box key={index}>
                  <Typography variant="h5">{index}</Typography>
                  <LineChartTemp chartData={item} />
                  <br />
                  <Button
                    style={{ marginLeft: "50px" }}
                    onClick={() => deleteChart(index)}
                  >
                    Delete
                  </Button>
                </Box>
              ))}
            </Carousel>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}

export default LocationInfo;
