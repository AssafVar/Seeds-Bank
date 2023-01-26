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
  const labels = chartData.time;
  const options = {
    responsive: true,
    plugins: {
      scales: {},
      title: {
        display: true,
        text: "Weather prediction",
      },
      legend: {
        position: "right",
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
        label: "°C",
        data: chartData.data,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
    ],
  };

  return (
    <Container style={{ width: "100%", height: "250px" }}>
      <Line options={options} data={data} />;
    </Container>
  );
}

export default LineChartTemp;
