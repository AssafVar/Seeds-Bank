import { Button, Typography } from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useState } from "react";
import "./locationInfo.css";
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
      <Typography variant="h5">Temprature data </Typography><br />
          <div style={{height:"350px"}}>
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
          </div><br/>
          <Box style={{display:"flex", justifyContent:"space-around"}}>
        <div>
        <Button onClick={getLocation} variant="contained" style={{margin:"5px"}}>
          Get location
        </Button><br/>
        {position.latitude&&<>
        <Button
          onClick={() =>
            getTempData(
              position?.latitude.toFixed(2),
              position?.longitude.toFixed(2)
              )
            }
            variant="contained"
            style={{margin:"5px"}}
            >
          Get Temprature
        </Button>
              </>}
          </div>
          <div>
            {position.latitude &&<>
            <Typography variant="body1">Latitude: {position.latitude} </Typography>
            <Typography variant="body1">Longtitude: {position.longitude}</Typography>
            </>}
          </div>
      </Box>
    </Container>
  );
}

export default LocationInfo;
