import { Typography } from "@mui/material";
import { Container } from "@mui/system";
import React, { useEffect, useState } from "react";
import { fetchCurrentProject } from "../../services/serverCalls.js";
import { classes } from '../../styles/projectsStyle.js'


function ProjectItem({ projectId }) {
    const [project, setProject] = useState(null);
    const fetchProject = async() => {
        const response = await fetchCurrentProject(123)
        console.log(response);
    }
  useEffect(() => {
    fetchProject();
  }, []);

  return (
    <Container>
      <Typography variant="h3" style={classes.pageHeadline}>{projectId} project</Typography>
    </Container>
  );
}

export default ProjectItem;
