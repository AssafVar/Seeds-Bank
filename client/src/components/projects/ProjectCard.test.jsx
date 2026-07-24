import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProjectCard from "./ProjectCard.jsx";

const project = {
  project_id: "p1",
  project_name: "Tomatoes",
  plant_type: "Vegetable",
  start_date: "2026-01-01",
  last_update: "2026-06-01",
  description: "Heirloom tomato breeding line",
};

describe("ProjectCard", () => {
  it("renders the project's name and details", () => {
    render(<ProjectCard project={project} handleChangeProject={jest.fn()} />);

    expect(screen.getByText("Tomatoes")).toBeInTheDocument();
    expect(screen.getByText(/plant Type: Vegetable/)).toBeInTheDocument();
    expect(screen.getByText(/About the project: Heirloom tomato breeding line/)).toBeInTheDocument();
  });

  it("calls handleChangeProject with the project id when 'Enter Project' is clicked", () => {
    const handleChangeProject = jest.fn();
    render(<ProjectCard project={project} handleChangeProject={handleChangeProject} />);

    userEvent.click(screen.getByRole("button", { name: "Enter Project" }));

    expect(handleChangeProject).toHaveBeenCalledWith("p1");
  });
});
