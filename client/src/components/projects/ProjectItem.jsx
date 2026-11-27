import { Alert, Button, Typography } from "@mui/material";
import { Container } from "@mui/system";
import React, { useContext, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import authContext from "../../contexts/AuthContext.js";
import useProjectPedigree from "../../hooks/useProjectPedigree.js";
import { classes } from "../../styles/projectsStyle.js";
import Spinner from "../common/Spinner.jsx";
import PlantsTab from "./PlantsTab.jsx";
import ProjectTabsBar from "./ProjectTabsBar.jsx";
import VarietiesSection from "./VarietiesSection.jsx";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

const DESKTOP_PAGE_SIZE = 25;
const PHONE_PAGE_SIZE = 20;

function ProjectItem() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => (searchParams.get("tab") === "2" ? 2 : 0));
  const [desktopPageSize, setDesktopPageSize] = useState(DESKTOP_PAGE_SIZE);
  const { activeUser } = useContext(authContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const pageSize = isMobile ? PHONE_PAGE_SIZE : desktopPageSize;

  const pedigree = useProjectPedigree({ userId: activeUser.userId, projectId, pageSize });
  const { status, loadError, headers } = pedigree;

  const handleTabChange = (value) => {
    if (value === 1) {
      navigate(`/projects/${projectId}/fields`);
    } else {
      setActiveTab(value);
    }
  };

  if (status === "loading") {
    return (
      <Container>
        <Spinner size={48} minHeight={200} />
      </Container>
    );
  }

  if (status === "error") {
    const noAccess = loadError?.kind === "no-access";
    return (
      <Container>
        <Typography variant="h3" style={classes.pageHeadline}>
          Project
        </Typography>
        <Button onClick={() => navigate("/projects")} sx={{ mt: 1, minHeight: 44 }}>Return to the Project List</Button>
        <ProjectTabsBar value={activeTab} onChange={handleTabChange} />
        <Alert
          severity="error"
          sx={{ mt: 1 }}
          action={
            noAccess ? (
              <Button color="inherit" onClick={() => navigate("/projects")} sx={{ minHeight: 44 }}>
                Back to Projects
              </Button>
            ) : (
              <Button color="inherit" onClick={pedigree.retry} sx={{ minHeight: 44 }}>
                Retry
              </Button>
            )
          }
        >
          {noAccess ? "You do not have access to this project." : "Could not load plants. Check your connection and try again."}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Typography variant="h3" style={classes.pageHeadline}>
        project: {headers?.project_name}
      </Typography>
      <Button onClick={() => navigate("/projects")} sx={{ mt: 1, minHeight: 44 }}>Return to the Project List</Button>
      <ProjectTabsBar value={activeTab} onChange={handleTabChange} />
      {activeTab === 0 && (
        <PlantsTab
          pedigree={pedigree}
          userId={activeUser.userId}
          projectId={projectId}
          pageSize={pageSize}
          onPageSize={setDesktopPageSize}
        />
      )}
      {activeTab === 2 && <VarietiesSection userId={activeUser.userId} projectId={projectId} />}
    </Container>
  );
}

export default ProjectItem;
