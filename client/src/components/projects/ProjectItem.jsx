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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Box, Container } from "@mui/system";
import Stack from "@mui/material/Stack";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCurrentProject,
  saveProject,
} from "../../services/serverCalls.js";
import { classes } from "../../styles/projectsStyle.js";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import authContext from "../../contexts/AuthContext.js";
import LinearProgress from "@mui/material/LinearProgress";
import InfoModal from "../modals/InfoModal.jsx";
import {
  addNewLine,
  crossPlants,
  getGenerations,
  getLinePurityMap,
  sortTable,
  StyledTableCell,
  StyledTableRow,
} from "../../libs/projects.js";
import DialogModal from "../dialog/DialogModal.jsx";
import CrossPlantsModal from "../modals/CrossPlantsModal.jsx";
import PlantCard from "./PlantCard.jsx";
import DeleteIcon from "@mui/icons-material/Delete";
import GrassIcon from "@mui/icons-material/Grass";
import VerifiedIcon from "@mui/icons-material/Verified";

const rowItems = [
  "Line",
  "Fruit Color",
  "Fruit Weight",
  "Seed Color",
  "Seed Weight",
  "Generation",
];
const rowHeadlines = [
  "line",
  "fruit_color",
  "fruit_weight",
  "seed_color",
  "seed_weight",
  "generation",
];

function ProjectItem({ projectId, handleReturn }) {
  const [projectHeaders, setProjectHeaders] = useState(null);
  const [projectDetails, setProjectDetails] = useState([]);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [isInfoModal, setIsInfoModal] = useState(false);
  const [message, setMessage] = useState({});
  const [modalColor, setModalColor] = useState({});
  const [generations, setGenerations] = useState([]);
  const [generation, setGeneration] = useState(0);
  const [projectToPresent, setProjectToPresent] = useState([]);
  const [isOpenDeleteModal, setIsOpenDeleteModal] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState({});
  const [sortBy, setSortBy] = useState("");
  const [plantIdToDelete, setPlantIdToDelete] = useState({});
  const [isOpenCrossModal, setIsOpenCrossModal] = useState(false);

  const { activeUser } = useContext(authContext);
  const inputRef = useRef(null);
  const linePurity = useMemo(() => getLinePurityMap(projectDetails), [projectDetails]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const fetchProject = useCallback(async () => {
    const response = await fetchCurrentProject(activeUser.userId, projectId);
    setProjectHeaders(response.data.projectHeaders);
    setProjectDetails(response.data.projectDetails);
  }, [activeUser, projectId]);

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
    const projectWithNewLine = addNewLine(row, projectHeaders, projectDetails);
    setProjectDetails(projectWithNewLine);
  };

  const changeCellValue = (index, target) => {
    const { name, value } = target;
    const newProjectDetails = [...projectToPresent];
    newProjectDetails[index][name] = value;
    setProjectToPresent(newProjectDetails);
    setCurrentTarget(target);
  };

  const handleCrossPlants = (parentA, parentB) => {
    const projectWithCross = crossPlants(parentA, parentB, projectHeaders, projectDetails);
    setProjectDetails(projectWithCross);
    setIsOpenCrossModal(false);
  };

  const deleteLine = (row) => {
    setDeleteMessage({
      title: "Delete Plant ",
      body: "Are you sure you want to delete this plant?",
    });
    setPlantIdToDelete(row);
    setIsOpenDeleteModal(true);
  };

  useEffect(() => {
    if (inputRef.current !== null) {
      inputRef.current = document.getElementById(currentTarget?.id);
      inputRef.current && inputRef.current.focus();
    }
  }, [projectDetails, currentTarget]);

  useEffect(() => {
    const sortedGenerations = getGenerations(projectDetails);
    setGenerations(sortedGenerations);
  }, [projectHeaders, projectDetails]);

  useEffect(() => {
    const filterGeneration = projectDetails.filter((item) => {
      return item.generation === generation && item;
    });
    setProjectToPresent(filterGeneration);
  }, [generation, projectDetails]);

  useEffect(() => {
    const sortedProject = sortTable(projectToPresent, sortBy);
    setProjectToPresent(sortedProject);
    // projectToPresent intentionally excluded: sortTable always returns a
    // new array, so including it here would re-sort on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

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
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              gap: 1,
              margin: { xs: "5px 10px", sm: "5px 40px" },
            }}
          >
            <Button onClick={handleReturn}>Return to the Project List</Button>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
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
              <FormControl style={{ width: "100px" }}>
                <InputLabel id="sort-by">Sort By</InputLabel>
                <Select
                  labelId="sort-by-label"
                  id="sort-by-select"
                  label="Sort-by"
                  value={sortBy}
                >
                  {rowHeadlines.map((item) => (
                    <MenuItem
                      key={item}
                      onClick={() => setSortBy(item)}
                      value={item}
                    >
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          {isMobile ? (
            <Stack spacing={2}>
              {projectToPresent.map((row, index) => (
                <PlantCard
                  key={row.plant_id}
                  row={row}
                  index={index}
                  isStable={linePurity[row.line]?.isStable}
                  stableGenerations={linePurity[row.line]?.stableGenerations}
                  onFieldChange={(target) => changeCellValue(index, target)}
                  onAddChild={() => handleNewLine(row)}
                  onDelete={() => deleteLine(row)}
                />
              ))}
            </Stack>
          ) : (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 700 }} aria-label="customized table">
              <TableHead>
                <TableRow>
                  <Grid container={true} style={classes.tableRowGrid}>
                    {rowItems.map((rowItem) => (
                      <Grid
                        item
                        xs={9 / rowItems.length}
                        style={classes.tableCellGrid}
                        key={rowItem}
                      >
                        <StyledTableCell style={classes.tableCell}>
                          {rowItem}
                        </StyledTableCell>
                      </Grid>
                    ))}
                    <Grid item xs={3} style={classes.tableCellGrid}>
                      <StyledTableCell style={classes.tableCell}>
                        {"More actions"}
                      </StyledTableCell>
                    </Grid>
                  </Grid>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectToPresent.map((row, index) => (
                  <StyledTableRow style={classes.tableRow} key={row.plant_id}>
                    <Grid container={true}>
                      <Grid
                        item
                        xs={9 / rowItems.length}
                        style={classes.tableCellGrid}
                      >
                        <TextField
                          inputRef={inputRef}
                          sx={classes.sxTableCell}
                          name="line"
                          id={`line${row.plant_id}`}
                          value={row.line}
                          style={classes.tableCell}
                          onInput={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                        {linePurity[row.line]?.isStable && (
                          <Tooltip
                            title={`Stable for ${linePurity[row.line].stableGenerations} generations`}
                          >
                            <VerifiedIcon color="success" fontSize="small" />
                          </Tooltip>
                        )}
                      </Grid>
                      <Grid
                        item
                        xs={9 / rowItems.length}
                        style={classes.tableCellGrid}
                      >
                        <TextField
                          inputRef={inputRef}
                          sx={classes.sxTableCell}
                          name="fruit_color"
                          id={`fruit_color${index}`}
                          value={row.fruit_color}
                          style={classes.tableCell}
                          onInput={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid
                        item
                        xs={9 / rowItems.length}
                        style={classes.tableCellGrid}
                      >
                        <TextField
                          inputRef={inputRef}
                          sx={classes.sxTableCell}
                          name="fruit_weight"
                          id={`fruit_weight${index}`}
                          value={row.fruit_weight}
                          style={classes.tableCell}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid
                        item
                        xs={9 / rowItems.length}
                        style={classes.tableCellGrid}
                      >
                        <TextField
                          inputRef={inputRef}
                          sx={classes.sxTableCell}
                          name="seed_color"
                          id={`seed_color${index}`}
                          value={row.seed_color}
                          style={classes.tableCell}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid
                        item
                        xs={9 / rowItems.length}
                        style={classes.tableCellGrid}
                      >
                        <TextField
                          inputRef={inputRef}
                          sx={classes.sxTableCell}
                          name="seed_weight"
                          id={`seed_weight${index}`}
                          value={row.seed_weight}
                          style={classes.tableCell}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid
                        item
                        xs={9 / rowItems.length}
                        style={classes.tableCellGrid}
                      >
                        <TextField
                          inputRef={inputRef}
                          sx={classes.sxTableCell}
                          name="generation"
                          id={`generation${index}`}
                          value={row.generation}
                          style={classes.tableCell}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={3} style={classes.tableMoreInfoGrid}>
                        <Button color="inherit">
                          More Details
                        </Button>
                        <Tooltip title="Add Child">
                          <Button
                            onClick={() => handleNewLine(row)}
                            variant="text"
                            color="secondary"
                          >
                            <GrassIcon color="success" />
                          </Button>
                        </Tooltip>
                        <Tooltip title="Remove plant">
                          <Button
                            onClick={() => deleteLine(row)}
                            variant="text"
                            color="secondary"
                          >
                            <DeleteIcon color="error" />
                          </Button>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
              mt: 2,
            }}
          >
            <Button
              sx={{ width: { xs: "100%", sm: "auto" } }}
              onClick={() => handleNewLine("new-line")}
            >
              Add new variety
            </Button>
            <Button
              sx={{ width: { xs: "100%", sm: "auto" } }}
              onClick={() => setIsOpenCrossModal(true)}
            >
              Cross Lines
            </Button>
            <Button sx={{ width: { xs: "100%", sm: "auto" } }} onClick={saveDetails}>
              Save Project
            </Button>
          </Box>
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
        {isOpenDeleteModal && (
          <DialogModal
            isOpen={isOpenDeleteModal}
            fetchProject={() => fetchProject()}
            user_id={activeUser.userId}
            handleDialogModal={() => setIsOpenDeleteModal(false)}
            message={deleteMessage}
            plantIdToDelete={plantIdToDelete}
          />
        )}
        {isOpenCrossModal && (
          <CrossPlantsModal
            isOpen={isOpenCrossModal}
            projectDetails={projectDetails}
            onConfirm={handleCrossPlants}
            onClose={() => setIsOpenCrossModal(false)}
          />
        )}
      </>
    </>
  );
}

export default ProjectItem;
