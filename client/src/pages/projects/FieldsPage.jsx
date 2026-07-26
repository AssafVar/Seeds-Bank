import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Container } from "@mui/system";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import authContext from "../../contexts/AuthContext.js";
import { fetchCurrentProject } from "../../services/serverCalls.js";
import { classes } from "../../styles/projectsStyle.js";
import ProjectTabsBar from "../../components/projects/ProjectTabsBar.jsx";
import FieldsList from "../../components/projects/FieldsList.jsx";
import Spinner from "../../components/common/Spinner.jsx";

function FieldsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { activeUser } = useContext(authContext);
  const [projectHeaders, setProjectHeaders] = useState(null);

  const fetchProject = useCallback(async () => {
    const response = await fetchCurrentProject(activeUser.userId, projectId);
    setProjectHeaders(response.data.projectHeaders);
  }, [activeUser, projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleTabChange = (value) => {
    if (value !== 1) {
      navigate(`/projects/${projectId}?tab=${value}`);
    }
  };

  return (
    <Container>
      {!projectHeaders ? (
        <Spinner size={48} minHeight={200} />
      ) : (
        <>
          <Typography variant="h3" style={classes.pageHeadline}>
            project: {projectHeaders.project_name}
          </Typography>
          <Button onClick={() => navigate("/projects")} sx={{ mt: 1 }}>
            Return to the Project List
          </Button>
          <ProjectTabsBar value={1} onChange={handleTabChange} />
          <FieldsList userId={activeUser.userId} projectId={projectId} />
        </>
      )}
    </Container>
  );
}

export default FieldsPage;
