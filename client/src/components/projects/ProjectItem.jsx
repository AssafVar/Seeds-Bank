import {
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  fetchCurrentProject,
  saveProject,
} from "../../services/serverCalls.js";
import { classes } from "../../styles/projectsStyle.js";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import authContext from "../../contexts/AuthContext.js";
import LinearProgress from "@mui/material/LinearProgress";
import { nanoid } from "nanoid";
import InfoModal from "../modals/InfoModal.jsx";

function ProjectItem({ projectId, handleReturn }) {
  const [projectHeaders, setProjectHeaders] = useState(null);
  const [projectDetails, setProjectDetails] = useState([]);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [isInfoModal, setIsInfoModal] = useState(false);
  const [message, setMessage] = useState({});
  const [modalColor, setModalColor] = useState({});
  const [isOpenDetailsModal, setIsOpenDetailsModal] = useState(false);
  const [generations, setGenerations] = useState([]);
  const [generation, setGeneration] = useState(0);
  const [projectToPresent, setProjectToPresent] = useState([]);

  const { activeUser } = useContext(authContext);
  const inputRef = useRef(null);

  const fetchProject = async () => {
    const response = await fetchCurrentProject(activeUser.userId, projectId);
    setProjectHeaders(response.data.projectHeaders);
    setProjectDetails(response.data.projectDetails);
  };

  const saveDetails = async () => {
    setMessage({ title: "Pending", description: "Saving project details..." });
    setIsInfoModal(true);
    const response = await saveProject(projectHeaders, projectDetails);
    if (response) {
      setMessage({
        title: "Success",
        description: "Database updated successfully",
      });
      setModalColor({ color: "green" });
    } else {
      setMessage({ title: "Fail", description: "Error Updating project" });
      setModalColor({ color: "red" });
    }
    setTimeout(() => {
      setMessage(null);
      setModalColor(null);
      setIsInfoModal(false);
    }, 2000);
  };

  const handleNewLine = (row) => {
    const plantId = nanoid();
    const plantMotherId = row === "new-line" ? "---" : row.plant_id;
    const generation = row === "new-line" ? 0 : row.generation + 1;
    const { project_name, project_id } = projectHeaders;
    const newProjectDetails = [
      ...projectDetails,
      createData(
        project_name,
        "---",
        plantMotherId,
        project_id,
        plantId,
        "---",
        "---",
        "---",
        "---",
        "---",
        generation
      ),
    ];
    setProjectDetails(newProjectDetails);
  };

  const changeCellValue = (index, target) => {
    const { name, value } = target;
    const newProjectDetails = [...projectDetails];
    newProjectDetails[index][name] = value;
    setProjectDetails(newProjectDetails);
    setCurrentTarget(target);
  };

  function createData(
    project_name: string,
    plant_father_id: string,
    plant_mother_id: string,
    project_id: string,
    plant_id: string,
    fruit_color: string,
    fruit_weight: string,
    seed_color: string,
    seed_weight: string,
    photo: string,
    generation: number
  ) {
    return {
      project_name,
      project_id,
      plant_id,
      plant_father_id,
      plant_mother_id,
      fruit_color,
      fruit_weight,
      seed_color,
      seed_weight,
      photo,
      generation,
    };
  }

  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: theme.palette.common.black,
      color: theme.palette.common.white,
      fontSize: "16px",
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14,
    },
  }));

  const StyledTableRow = styled(TableRow)(({ theme }) => ({
    "&:nth-of-type(odd)": {
      backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    "&:last-child td, &:last-child th": {
      border: 0,
    },
  }));

  useEffect(() => {
    if (inputRef.current !== null) {
      inputRef.current = document.getElementById(currentTarget?.id);
      inputRef.current && inputRef.current.focus();
    }
  }, [projectDetails]);

  useEffect(() => {
    const allGenerations = [];
    const generationSet = new Set();
    for (const line of projectDetails) {
      generationSet.add(line.generation);
    }
    for (const generation of generationSet) {
      allGenerations.push(generation);
    }
    allGenerations.sort((a, b) => a - b);
    setGenerations(allGenerations);
  }, [projectHeaders]);

  useEffect(() => {
    const filterGeneration = projectDetails.filter((item) => {
      console.log(generation)
      if (item.generation === "all") {
        return item;
      } else if (item.generation === generation) {
        return item;
      }
    });
    setProjectToPresent(filterGeneration);
  }, [generation]);

  useEffect(() => {
    fetchProject();
  }, []);

  return (
    <>
      {!projectHeaders ? (
        <Container>
          <Box sx={{ width: "100%" }}>
            <br />
            <Typography variant="h4" style={{ margin: "20px" }}>
              Loading...
            </Typography>
            <LinearProgress />
          </Box>
        </Container>
      ) : (
        <Container>
          <Typography variant="h3" style={classes.pageHeadline}>
            project: {projectHeaders.project_name}
          </Typography>
          <Box
            style={{
              display: "flex",
              justifyContent: "space-between",
              margin: "5px 40px",
            }}
          >
            <Button onClick={handleReturn}>Return to the Project List</Button>
            {generations.length > 1 && (
              <FormControl style={{ width: "100px" }}>
                <InputLabel id="generations">Generation</InputLabel>
                <Select
                  labelId="generations-label"
                  id="generations-select"
                  label="Generation"
                  value={+generation}
                >
                  {generations.map((newGeneration) => (
                    <MenuItem
                      key={newGeneration}
                      onClick={() => setGeneration(+newGeneration)}
                      value={+newGeneration}
                    >
                      {+newGeneration}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 700 }} aria-label="customized table">
              <TableHead>
                <TableRow>
                  <Grid
                    container={true}
                    style={{ width: "100%", backgroundColor: "black" }}
                  >
                    <Grid item xs={1} style={classes.tableCellGrid}>
                      <StyledTableCell style={classes.tableCell}>
                        Line{" "}
                      </StyledTableCell>
                    </Grid>
                    <Grid item xs={1.6} style={classes.tableCellGrid}>
                      {" "}
                      <StyledTableCell align="right" style={classes.tableCell}>
                        Fruit Color
                      </StyledTableCell>
                    </Grid>
                    <Grid item xs={1.6} style={classes.tableCellGrid}>
                      <StyledTableCell align="right" style={classes.tableCell}>
                        Fruit Weight
                      </StyledTableCell>
                    </Grid>
                    <Grid item xs={1.6} style={classes.tableCellGrid}>
                      <StyledTableCell align="right" style={classes.tableCell}>
                        Seed Color
                      </StyledTableCell>
                    </Grid>
                    <Grid item xs={1.6} style={classes.tableCellGrid}>
                      <StyledTableCell align="right" style={classes.tableCell}>
                        Seed Weight
                      </StyledTableCell>
                    </Grid>
                    <Grid item xs={1.6} style={classes.tableCellGrid}>
                      <StyledTableCell align="right" style={classes.tableCell}>
                        Generation
                      </StyledTableCell>
                    </Grid>
                    <Grid item xs={3} style={classes.tableCellGrid}>
                      <StyledTableCell align="right" style={classes.tableCell}>
                        More actions
                      </StyledTableCell>
                    </Grid>
                  </Grid>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectToPresent.map((row, index) => (
                  <StyledTableRow
                    style={{
                      display: "flex",
                      justifyContent: "space-around",
                      width: "inherit",
                    }}
                    key={row.plant_id}
                  >
                    <Grid container={true}>
                      <Grid item xs={1} style={classes.tableCellGrid}>
                        <StyledTableCell
                          component="th"
                          scope="row"
                          sx={{
                            border: "none",
                            "& fieldset": { border: "none" },
                          }}
                          style={classes.tableCell}
                        >
                          {index + 1}
                        </StyledTableCell>
                      </Grid>
                      <Grid item xs={1.6} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="fruit_color"
                          id={`fruit_color${index}`}
                          value={row.fruit_color}
                          style={classes.tableCell}
                          onInput={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={1.6} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="fruit_weight"
                          id={`fruit_weight${index}`}
                          value={row.fruit_weight}
                          style={classes.tableCell}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={1.6} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="seed_color"
                          id={`seed_color${index}`}
                          value={row.seed_color}
                          style={classes.tableCell}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={1.6} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="seed_weight"
                          id={`seed_weight${index}`}
                          value={row.seed_weight}
                          style={classes.tableCell}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={1.6} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="generation"
                          id={`generation${index}`}
                          value={row.generation}
                          style={classes.tableCell}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={3} style={classes.tableMoreInfoGrid}>
                        <Button
                          onClick={() => setIsOpenDetailsModal(true)}
                          style={{ color: "black" }}
                        >
                          More Details
                        </Button>
                        <Tooltip title="Add Child">
                          <Button
                            onClick={() => handleNewLine(row)}
                            variant="text"
                            color="secondary"
                          >
                            +
                          </Button>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button onClick={() => handleNewLine("new-line")}>
            Add new variety{" "}
          </Button>
          <Button onClick={saveDetails}>Save Project </Button>
        </Container>
      )}
      <>
        {isInfoModal && (
          <InfoModal
            isInfoModal={isInfoModal}
            handleCloseInfoModal={() => setIsInfoModal(false)}
            message={message}
            modalColor={modalColor}
          />
        )}
      </>
    </>
  );
}

export default ProjectItem;
