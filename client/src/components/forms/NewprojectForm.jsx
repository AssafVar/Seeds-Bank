import { Button, Grid, TextField, Typography } from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useState } from "react";
import { classes } from "../../styles/projectsStyle.js";

function NewprojectForm(props) {
  const [projectName, setProjectName] = useState("");
  const [plantType, setPlantType] = useState("");

  const createNewProject = () => {
    console.log("Creating new project: " + projectName + " " + plantType);
  };
  return (
    <Container>
      <Grid container spacing={8} style={classes.newProjectModalMainGrid}>
        <Grid item xs={10}>
          <TextField
            id="projectName"
            label="Project Name"
            variant="standard"
            required
            value={projectName}
            autoComplete="projectName"
            onChange={(e) => setProjectName(e.target.value)}
          />
          <br />
          <TextField
            id="plantType"
            label="Plant Type"
            variant="standard"
            required
            value={plantType}
            autoComplete="plantType"
            onChange={(e) => setPlantType(e.target.value)}
          />
        </Grid>
        <Grid item xs={2} style={classes.newProjectModalButtonGrid}>
          <Button
            style={classes.newProjectModalApplyButton}
            onClick={createNewProject}
          >
            Create
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}

export default NewprojectForm;
