import { Button, Grid } from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useCallback, useContext, useEffect, useState } from "react";
import authContext from "../../contexts/AuthContext.js";
import { getUserProjectsList } from "../../services/serverCalls.js";
import { classes } from "../../styles/projectsStyle.js";
import PageHeadline from "../headline/PageHeadline.jsx";
import ProjectModal from "../modals/ProjectModal.jsx";
import ProjectCard from "./ProjectCard.jsx";
import ProjectItem from "./ProjectItem.jsx";
import Spinner from "../common/Spinner.jsx";

function ProjectList(props) {
  
  const {activeUser} = useContext(authContext);
  const [isProject, setIsProject] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [isProjectModal, setIsProjectModal] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const fetchProjectsList = useCallback(async() => {
    setIsLoadingProjects(true);
    const response = await getUserProjectsList(activeUser.userId);
    setProjectsList(response.data);
    setIsLoadingProjects(false);
  }, [activeUser]);

  const handleChangeProject = (projectId) => {
    setProjectId(projectId);
    setIsProject(true);
  };

  const handleModal = () =>{
    setIsProjectModal(false);
    fetchProjectsList();
  };

  const returnToProjectList = () => {
    setIsProject(false);
  };

  useEffect(()=>{
    fetchProjectsList();
  },[fetchProjectsList])

  return (
    <Container>
      {!isProject ? (
        <>
          <PageHeadline title={"Projects List"}/>
          <Box>
            <Button onClick={() => setIsProjectModal(true)}>
              Create New Project
            </Button>
          </Box>
          {isLoadingProjects ? (
            <Spinner />
          ) : (
            <Grid container spacing={8} style={classes.mainGrid}>
              {projectsList.map((project) => (
                <Grid
                  item
                  md={3.5}
                  xs={12}
                  key={project.project_id}
                  style={classes.projectListItem}
                >
                  <ProjectCard project={project}  handleChangeProject={handleChangeProject}/>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      ) : (
        <>
          <ProjectItem projectId={projectId} handleReturn={returnToProjectList}/>
        </>
      )}
      {isProjectModal && (
        <ProjectModal
          isOpenModal={isProjectModal}
          handleModal={handleModal}
        />
      )}
    </Container>
  );
}

export default ProjectList;
