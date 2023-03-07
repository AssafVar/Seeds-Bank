import { Button, Typography } from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useState } from "react";
import "./locationInfo.css";
import { getCoords, getTempDataAPI } from "../../services/serverCalls";
import LineChartTemp from "../lineChart/LineChartTemp";
import Carousel from "react-material-ui-carousel";
import SearchCities from "../search/SearchCities";

function LocationInfo(props) {
  const [chartData, setChartData] = useState([]);
  const [location, setLocation] = useState({});

  const getTempData = async (lat, log) => {
    const result = await getTempDataAPI(lat, log);
    const time = result.data.hourly.time.map((item, index) => {
      const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const date = new Date(item);
      return `${days[date.getDay()]} ${date.getHours()}:${date.getMinutes()}0`;
    });
    const data = {
      time: time,
      temprature: result.data.hourly.temperature_2m,
      precipitation:result.data.hourly.precipitation,
      vpd:result.data.hourly.vapor_pressure_deficit,
      location:location,
    };
    setChartData((prev) => [...prev, data]);
  };

  const getLocationCoords = async() =>{
    const {lat, lon} = await getCoords(location);
    getTempData(lat, lon);
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
      <div style={{alignItems:"center"}}>
        <SearchCities handleLocation={(city) => setLocation(city)} />
        <Button
          onClick={() =>
            getLocationCoords()
          }
          variant="contained"
          style={{ marginLeft: "5px", height: "55px", borderRadius: "20px"}}
          disabled={!!!location?.city}
        >
          Get Location Info
        </Button>
      </div>
      <div style={{ height: "1000px" }}>
        {chartData.length > 0 && (
          <Carousel animation="slide">
            {chartData.map((item, index) => (
              <Box key={index}>
                <br/>
                <Typography variant="h5" margin="20px" >{item.location.city}</Typography>
                <LineChartTemp chartData={item}/>
                <br />
                <Button
                  style={{ marginLeft: "50px", borderRadius: "20px" }}
                  onClick={() => deleteChart(index)}
                  variant="contained"
                  color="warning"
                >
                  Delete Chart
                </Button>
              </Box>
            ))}
          </Carousel>
        )}
      </div>
      <br />
    </Container>
  );
}

export default LocationInfo;
