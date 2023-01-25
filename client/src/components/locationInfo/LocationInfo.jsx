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
        <Typography variant="h5">Temprature data </Typography>
        <br />
        <Grid container spacing={2} style={classes.main}>
          <Grid item xs={3} style={classes.chart}>
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
          <Grid item xs={8} style={classes.chart}>
            {chartData.length > 0 && (
              <Carousel axis="vertical" showThumbs={false} animation="slide">
                {chartData.map((item, index) => (
                  <Box key={index}>
                    <Typography variant="h5">{index}</Typography>
                    <LineChartTemp
                      chartData={item}
                      xAxisTitle={"time"}
                      yAxisTitle={"temp"}
                    />
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
