import { Button, Grid, TextField } from "@mui/material";
import { Container } from "@mui/system";
import React, { useContext, useState } from "react";
import authContext from "../../contexts/AuthContext.js";
import { createNewProject } from "../../services/serverCalls.js";
import { classes } from "../../styles/projectsStyle.js";

function NewprojectForm(props) {
  const [projectName, setProjectName] = useState("");
  const [plantType, setPlantType] = useState("");

  const {activeUser} = useContext(authContext);
  const handleNewProject = async() => {
    const results = await createNewProject(activeUser.userId, projectName, plantType);
    console.log("results:", results);
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
            onClick={handleNewProject}
          >
            Create
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}

export default NewprojectForm;
