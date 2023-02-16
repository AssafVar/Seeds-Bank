import { Grid, Typography } from "@mui/material";
import { Box, Container } from "@mui/system";
import React from "react";
import { classes } from "../../styles/projectsStyle.js";

function ProjectList(props) {
  const projectListArray = [
    {
      projectName: "1",
      plantType: "tomato",
      startDate: "1/1/2023",
      recentlyUpdate: "1/1/2023",
      projectId: 1,
    },
    {
      projectName: "2",
      plantType: "tomato",
      startDate: "1/1/2023",
      recentlyUpdate: "1/1/2023",
      projectId: 2,
    },
    {
      projectName: "3",
      plantType: "tomato",
      startDate: "1/1/2023",
      recentlyUpdate: "1/1/2023",
      projectId: 3,
    },
    {
      projectName: "4",
      plantType: "tomato",
      startDate: "1/1/2023",
      recentlyUpdate: "1/1/2023",
      projectId: 4,
    },
    {
      projectName: "5",
      plantType: "tomato",
      startDate: "1/1/2023",
      recentlyUpdate: "1/1/2023",
      projectId: 5,
    },
    {
      projectName: "6",
      plantType: "tomato",
      startDate: "1/1/2023",
      recentlyUpdate: "1/1/2023",
      projectId: 6,
    },
  ];
  return (
    <Container>
      <Typography variant="h3" style={classes.pageHeadline}>
        {" "}
        Projects list
      </Typography>
      <Grid container spacing={8} style={classes.mainGrid}>
        {projectListArray.map((project) => (
          <Grid
            item
            md={3.5}
            xs={12}
            key={project.projectId}
            style={classes.projectListItem}
          >
            <Typography>project Name: {project.projectName}</Typography>
            <Typography>plant Type: {project.plantType}</Typography>
            <Typography>Start Date: {project.startDate}</Typography>
            <Typography>Last Update: {project.recentlyUpdate}</Typography>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default ProjectList;
