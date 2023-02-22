import { Button, Typography } from "@mui/material";
import { Box, Container } from "@mui/system";
import React, { useContext, useEffect, useState } from "react";
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
import LinearProgress from '@mui/material/LinearProgress';


function ProjectItem({ projectId, handleReturn }) {

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

  const {activeUser} = useContext(authContext);
  const [projectHeaders, setProjectHeaders] = useState(null);
  const [projectDetails, setProjectDetails] = useState([]);

  const fetchProject = async() => {
    const response = await fetchCurrentProject(activeUser.userId, projectId);
    console.log(response);
    setProjectHeaders(response.data.projectHeaders);
    setProjectDetails(response.data.projectDetails);

  };

  useEffect(() => {
    fetchProject();
  },[]);

  return (
    <Container>
     {!projectHeaders ? <><Box sx={{ width: '100%' }}>
        <br/>
        <Typography variant="h4" style={{margin:"20px"}}>Loading...</Typography>
        <LinearProgress />
      </Box></>
     :<>
       <Typography variant="h3" style={classes.pageHeadline}>
        project: {projectHeaders.project_name}
      </Typography>
      <Button onClick={handleReturn}>Return to the Project List</Button>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 700 }} aria-label="customized table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Line </StyledTableCell>
              <StyledTableCell align="right">Fruit Color</StyledTableCell>
              <StyledTableCell align="right">Fruit size</StyledTableCell>
              <StyledTableCell align="right">Seed color</StyledTableCell>
              <StyledTableCell align="right">Seed Size</StyledTableCell>
              <StyledTableCell align="right">Photo</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projectDetails.map((row, index) => (
              <StyledTableRow key={row.plant_id}>
                <StyledTableCell component="th" scope="row">
                  {index+1}
                </StyledTableCell>
                <StyledTableCell align="right">{row.fruit_color}</StyledTableCell>
                <StyledTableCell align="right">{row.fruit_weigth}</StyledTableCell>
                <StyledTableCell align="right">{row.seed_color}</StyledTableCell>
                <StyledTableCell align="right">{row.seed_weight}</StyledTableCell>
                <StyledTableCell align="right">{row.photo}</StyledTableCell>
              </StyledTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </>
    }
    </Container>
  );
}

export default ProjectItem;
