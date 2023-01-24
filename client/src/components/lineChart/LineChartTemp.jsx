import { Container } from "@mui/system";
import React from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";

function LineChartTemp({ chartData, yAxisTitle, xAxisTitle }) {
  return (
    <Container style={{ width: "100%", height: "300px" }}>
      <ResponsiveContainer width={700} height="80%">
        <LineChart data={chartData}>
          <XAxis dataKey={xAxisTitle} />
          <YAxis dataKey={yAxisTitle} />
          <CartesianGrid stroke="#f5f5f5" />
          <Line
            type="monotone"
            dataKey={yAxisTitle}
            stroke="#ff7300"
            yAxisId={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </Container>
  );
}

export default LineChartTemp;
