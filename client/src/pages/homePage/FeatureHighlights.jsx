import React from "react";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useNavigate } from "react-router-dom";
import SpaIcon from "@mui/icons-material/Spa";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import MenuBookIcon from "@mui/icons-material/MenuBook";

const FEATURES = [
  {
    icon: SpaIcon,
    title: "Track your projects",
    description:
      "Log every plant's line, generation, and traits across a breeding project.",
    to: "/projects",
  },
  {
    icon: CallSplitIcon,
    title: "Select & cross lines",
    description:
      "See which lines have gone stable across generations, then cross two of them to create a new hybrid record.",
    to: "/projects",
  },
  {
    icon: WbSunnyIcon,
    title: "Weather-aware planning",
    description:
      "Pull hourly temperature, precipitation, and vapor pressure deficit for any location to inform your breeding decisions.",
    to: "/climate",
  },
  {
    icon: MenuBookIcon,
    title: "Learn how it works",
    description: "See the full rundown of what Seeds Bank can do for your breeding program.",
    to: "/functionality",
  },
];

function FeatureHighlights() {
  const navigate = useNavigate();

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        What you can do
      </Typography>
      <Grid container spacing={2}>
        {FEATURES.map(({ icon: Icon, title, description, to }) => (
          <Grid item xs={12} sm={6} md={3} key={title}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardActionArea onClick={() => navigate(to)} sx={{ height: "100%" }}>
                <CardContent>
                  <Icon color="success" fontSize="large" />
                  <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default FeatureHighlights;
