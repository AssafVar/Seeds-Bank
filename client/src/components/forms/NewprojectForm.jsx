import { Button, TextField, Typography } from "@mui/material";
import { Container } from "@mui/system";
import React, { useState } from "react";

function NewprojectForm(props) {
  const [projectName, setProjectName] = useState("");
  const [plantType, setPlantType] = useState("");

  const createNewProject = () => {
    console.log("Creating new project: " + projectName + " " + plantType);
  };
  return (
    <Container>
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
      <Button onClick={createNewProject}>Create</Button>
    </Container>
  );
}

export default NewprojectForm;
