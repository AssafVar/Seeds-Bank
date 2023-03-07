import { Container } from "@mui/system";
import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function LineChartTemp({ chartData }) {

  const chartTitle = `${chartData.location.city}, ${chartData.location.country} Weather prediction`
  const labels = chartData.time;

  const options = {
   scales: {
        temprature: {
          position: "left",
          display: true,
          title: {
            display: true,
            text: 'Temperature [°C]',
          },
        },
        precipitation: {
          position: "left",
          display: true,
          title: {
            display: true,
            text: 'Precipitation [mm]',
          },
        },
        vpd: {
          position: "left",
          display: true,
          title: {
            display: true,
            text: 'VPD [kPa]',
          },
        },
    },
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: chartTitle,
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 1,
          boxHeight: 1,
        },
      },
    },
  };
  

  const data = {
    labels,
    datasets: [
      {
        label: "Temprature",
        data: chartData.temprature,
        borderColor: "rgb(124, 181, 24)",
        backgroundColor: "rgba(124, 181, 24, 0.1)",
        yAxisID:"temprature"
      },
      {
        label: "Precipitation",
        data: chartData.precipitation,
        borderColor: "rgb(251, 97, 7)",
        backgroundColor: "rgba(251, 97, 7, 0.1)",
        yAxisID:"precipitation",
      },
      {
        label: "VPD",
        data: chartData.vpd,
        borderColor: "rgb(243, 222, 44)",
        backgroundColor: "rgba(243, 222, 44, 0.1)",
        yAxisID:"vpd"
      },
    ],
  };

  return (
    <Container style={{ width: "120vw", height: "350px" }}>
      <Line options={options} data={data} />
    </Container>
  );
}

export default LineChartTemp;
