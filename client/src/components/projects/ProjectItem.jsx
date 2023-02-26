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
  getGenerations,
  StyledTableCell,
  StyledTableRow,
} from "../../libs/projects.js";
import DialogModal from "../dialog/DialogModal.jsx";


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
  const [isOpenDetailsModal, setIsOpenDetailsModal] = useState(false);
  const [generations, setGenerations] = useState([]);
  const [generation, setGeneration] = useState(0);
  const [projectToPresent, setProjectToPresent] = useState([]);
  const [isOpenDeleteModal, setIsOpenDeleteModal] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteTitle, setDeleteTitle] = useState("");
  const [sortBy, setSortBy] = useState("");

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
    const projectWithNewLine = addNewLine(row, projectHeaders, projectDetails);
    setProjectDetails(projectWithNewLine);
  };

  const changeCellValue = (index, target) => {
    const { name, value } = target;
    const newProjectDetails = [...projectDetails];
    newProjectDetails[index][name] = value;
    setProjectDetails(newProjectDetails);
    setCurrentTarget(target);
  };

  const handleDialogModal = () =>{
    setIsOpenDeleteModal(false);
  };

  const deleteLine = (row) => {
    setDeleteMessage("Are you sure you want to delete this plant?");
    setDeleteTitle("Delete Plant ");
    setIsOpenDeleteModal(true);
    
  };

  const sortTable = (columnToSort) => {
    setSortBy(columnToSort);
    const sortedFilters = projectToPresent.sort((a, b) =>{
      return a[columnToSort] - b[columnToSort];
    });
    setProjectToPresent(sortedFilters);
    setSortBy(columnToSort);
  }
  useEffect(() => {
    if (inputRef.current !== null) {
      inputRef.current = document.getElementById(currentTarget?.id);
      inputRef.current && inputRef.current.focus();
    }
  }, [projectDetails]);

  useEffect(() => {
    const sortedGenerations = getGenerations(projectDetails);
    setGenerations(sortedGenerations);
  }, [projectHeaders]);

  useEffect(() => {
    const filterGeneration = projectDetails.filter((item) => {
      return item.generation === generation && item;
    });
    setProjectToPresent(filterGeneration);
  }, [generation, projectDetails]);

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
              <FormControl style={{ width: "100px" }}>
                <InputLabel id="generations">Sort By</InputLabel>
                <Select
                  labelId="sort-by-label"
                  id="sort-by-select"
                  label="Sort-by"
                  value={sortBy}
                >
                  {rowHeadlines.map((sortBy) => (
                    <MenuItem
                      key={sortBy}
                      onClick={() => sortTable(sortBy)}
                      value={sortBy}
                    >
                      {sortBy}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
          </Box>
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
                          style={classes.tableCell}
                          onInput={(e) => changeCellValue(index, e.target)}
                        >
                        </TextField>
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
                          <Tooltip title="Remove plant">
                          <Button
                            onClick={() => deleteLine(row)}
                            variant="text"
                            color="secondary"
                          >
                            -
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
        {isOpenDeleteModal && <DialogModal isOpen={isOpenDeleteModal}
         handleDialogModal={handleDialogModal} title={deleteTitle} message={deleteMessage}/>}
      </>
    </>
  );
}

export default ProjectItem;
