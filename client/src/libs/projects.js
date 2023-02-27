import { styled } from "@mui/material/styles";
import { nanoid } from "nanoid";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";

export const getGenerations = (projectDetails) => {
  const allGenerations = [];
  const generationSet = new Set();
  for (const line of projectDetails) {
    generationSet.add(line.generation);
  }
  for (const generation of generationSet) {
    allGenerations.push(generation);
  }
  allGenerations.sort((a, b) => a - b);

  return allGenerations;
};
export const createData = (
  line: string,
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
) => {
  return {
    line,
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
};

export const addNewLine = (row, projectHeaders, projectDetails) => {
  const plantId = nanoid();
  const plantMotherId = row === "new-line" ? "---" : row.plant_id;
  const line = row === "new-line" ? "---" : row.line;

  const generation = row === "new-line" ? 0 : row.generation + 1;
  const { project_name, project_id } = projectHeaders;
  const newProjectDetails = [
    ...projectDetails,
    createData(
      line,
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
  return newProjectDetails;
};

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontSize: 16,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

export const sortTable = (projectToPresent, sortBy) => {
  const sortedProject = [...projectToPresent];
  const sortedFilters = sortedProject.sort((a, b) => {
    return a[sortBy] - b[sortBy];
  });
  return sortedFilters;
};
