import { Button, Grid, Typography } from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useState } from "react";
import "./locationInfo.css";
import { classes } from "../../styles/homeStyle";
import { getTempDataAPI } from "../../services/serverCalls";
import LineChartTemp from "../lineChart/LineChartTemp";
import Carousel from "react-material-ui-carousel";

function LocationInfo(props) {
  const [position, setPosition] = useState("");
  const [chartData, setChartData] = useState([]);
  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => setPosition(position.coords),
      (error) => console.log(error)
    );
  };
  const getTempData = async (lat, lng) => {
    const result = await getTempDataAPI(lat, lng);
    const { temperature_2m: temp, time } = result.data.hourly;
    const data = temp.map((item, index) => {
      return { temp: item, time: time[index] };
    });
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
      <Container>
        {chartData && (
          <Carousel axis="vertical" showThumbs={false} animation="slide">
            {chartData.map((item, index) => (
              <Box key={index}>
                <Typography variant="h5">{index}</Typography>
                <LineChartTemp
                  chartData={item}
                  xAxisTitle={"time"}
                  yAxisTitle={"temp"}
                />
                <Button onClick={() => deleteChart(index)}>Delete</Button>
              </Box>
            ))}
          </Carousel>
        )}
      </Container>
      <Grid container spacing={1} style={classes.main}>
        <Grid item xs={3} style={classes.box}>
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
        <Grid item xs={3} style={classes.box}>
          <Typography>Temp:</Typography>
        </Grid>
        <Grid item xs={3} style={classes.box}>
          <Typography>Weather:</Typography>
        </Grid>
      </Grid>
    </Container>
  );
}

export default LocationInfo;
