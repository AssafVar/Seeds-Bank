import React from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

const STEPS = [
  {
    step: 1,
    title: "Create an account",
    description: "Sign up with a username, email, and password.",
  },
  {
    step: 2,
    title: "Start a project",
    description: "Name your project and the plant type you're breeding.",
  },
  {
    step: 3,
    title: "Log your plants",
    description: "Record each plant's line, fruit/seed traits, and generation as it grows.",
  },
  {
    step: 4,
    title: "Cross promising lines",
    description: "Once a line's traits look stable, cross it with another to breed a new hybrid.",
  },
];

function GettingStarted() {
  const theme = useTheme();
  const isStacked = useMediaQuery(theme.breakpoints.down("md"));
  const ArrowIcon = isStacked ? ArrowDownwardIcon : ArrowForwardIcon;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        Getting started
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "stretch",
          gap: 2,
        }}
      >
        {STEPS.map(({ step, title, description }, index) => (
          <React.Fragment key={step}>
            <Card
              variant="outlined"
              sx={{
                flex: 1,
                width: "100%",
                borderRadius: 3,
                borderColor: "success.light",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1, height: "100%" }}>
                <Avatar
                  sx={{
                    bgcolor: "success.main",
                    width: 40,
                    height: 40,
                    fontWeight: "bold",
                  }}
                >
                  {step}
                </Avatar>
                <Typography variant="subtitle1" fontWeight="bold">
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              </CardContent>
            </Card>
            {index < STEPS.length - 1 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ArrowIcon
                  sx={{
                    color: "success.main",
                    bgcolor: "success.light",
                    borderRadius: "50%",
                    p: 0.5,
                    width: 32,
                    height: 32,
                  }}
                />
              </Box>
            )}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}

export default GettingStarted;
