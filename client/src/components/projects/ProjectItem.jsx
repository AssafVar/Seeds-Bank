import { Button, Grid, TextField, Typography } from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useContext, useEffect, useRef, useState } from "react";
import { fetchCurrentProject } from "../../services/serverCalls.js";
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

function ProjectItem({ projectId, handleReturn }) {
  const { activeUser } = useContext(authContext);
  const [projectHeaders, setProjectHeaders] = useState(null);
  const [projectDetails, setProjectDetails] = useState([]);
  const [currentTarget, setCurrentTarget] = useState(null);
  const inputRef = useRef(null);

  const fetchProject = async () => {
    const response = await fetchCurrentProject(activeUser.userId, projectId);
    setProjectHeaders(response.data.projectHeaders);
    setProjectDetails(response.data.projectDetails);
  };

  const handleNewLine = () => {
    const plantId = nanoid();
    const { project_name, project_id } = projectHeaders;
    const newProjectDetails = [
      ...projectDetails,
      createData(
        project_name,
        null,
        null,
        project_id,
        plantId,
        "",
        "",
        "",
        "",
        ""
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
    plant_father_id: null,
    plant_mother_id: null,
    project_id: string,
    plant_id: string,
    fruit_color: string,
    fruit_weigth: string,
    seed_color: string,
    seed_weight: string,
    photo: string
  ) {
    return {
      project_name,
      project_id,
      plant_id,
      plant_father_id,
      plant_mother_id,
      fruit_color,
      fruit_weigth,
      seed_color,
      seed_weight,
      photo,
    };
  }

  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: theme.palette.common.black,
      color: theme.palette.common.white,
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
    fetchProject();
  }, []);

  return (
    <Container>
      {!projectHeaders ? (
        <>
          <Box sx={{ width: "100%" }}>
            <br />
            <Typography variant="h4" style={{ margin: "20px" }}>
              Loading...
            </Typography>
            <LinearProgress />
          </Box>
        </>
      ) : (
        <>
          <Typography variant="h3" style={classes.pageHeadline}>
            project: {projectHeaders.project_name}
          </Typography>
          <Button onClick={handleReturn}>Return to the Project List</Button>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 700 }} aria-label="customized table">
              <TableHead>
                <TableRow>
                  <Grid
                    container={true}
                    style={{ width: "100%", backgroundColor: "black" }}
                  >
                    <Grid item xs={0.75} style={classes.tableCellGrid}>
                      <StyledTableCell>Line </StyledTableCell>
                    </Grid>
                    <Grid item xs={2.25} style={classes.tableCellGrid}>
                      {" "}
                      <StyledTableCell align="right">
                        Fruit Color
                      </StyledTableCell>
                    </Grid>
                    <Grid item xs={2.25} style={classes.tableCellGrid}>
                      <StyledTableCell align="right">
                        Fruit size
                      </StyledTableCell>
                    </Grid>
                    <Grid item xs={2.25} style={classes.tableCellGrid}>
                      <StyledTableCell align="right">
                        Seed color
                      </StyledTableCell>
                    </Grid>
                    <Grid item xs={2.25} style={classes.tableCellGrid}>
                      <StyledTableCell align="right">Seed Size</StyledTableCell>
                    </Grid>
                    <Grid item xs={2.25} style={classes.tableCellGrid}>
                      <StyledTableCell align="right">Photo</StyledTableCell>
                    </Grid>
                  </Grid>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectDetails.map((row, index) => (
                  <StyledTableRow
                    style={{
                      display: "flex",
                      justifyContent: "space-around",
                      width: "inherit",
                    }}
                    key={row.plant_id}
                  >
                    <Grid container={true}>
                      <Grid item xs={0.75}>
                        <StyledTableCell
                          component="th"
                          scope="row"
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                        >
                          {index + 1}
                        </StyledTableCell>
                      </Grid>
                      <Grid item xs={2.25} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="fruit_color"
                          id={`fruit_color${index}`}
                          value={row.fruit_color}
                          style={{ display: "flex", flex: 1 }}
                          onInput={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={2.25} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="fruit_weigth"
                          id={`fruit_weigth${index}`}
                          value={row.fruit_weigth}
                          style={{
                            display: "flex",
                            flex: 1,
                            alignItems: "center",
                          }}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={2.25} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="seed_color"
                          id={`seed_color${index}`}
                          value={row.seed_color}
                          style={{ display: "flex", flex: 1 }}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={2.25} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="seed_weight"
                          id={`seed_weight${index}`}
                          value={row.seed_weight}
                          style={{ outline: "none" }}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                      <Grid item xs={2.25} style={classes.tableCellGrid}>
                        <TextField
                          inputRef={inputRef}
                          sx={{
                            "& fieldset": { border: "none" },
                          }}
                          name="photo"
                          id={`photo${index}`}
                          value={row.photo}
                          style={{ display: "flex", flex: 1 }}
                          onChange={(e) => changeCellValue(index, e.target)}
                        ></TextField>
                      </Grid>
                    </Grid>
                  </StyledTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button onClick={handleNewLine}>Add new variety </Button>
        </>
      )}
    </Container>
  );
}

export default ProjectItem;
