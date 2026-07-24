import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, buildAuthValue } from "../../test-utils/renderWithProviders.jsx";
import { getUserProjectsList, createNewProject } from "../../services/serverCalls.js";
import ProjectList from "./ProjectList.jsx";

jest.mock("../../services/serverCalls.js", () => ({
  getUserProjectsList: jest.fn(),
  createNewProject: jest.fn(),
}));

// ProjectItem has its own extensive test coverage - stub it here so this
// file can focus on ProjectList's own job: fetching/listing projects and
// switching between the list and a selected project.
jest.mock("./ProjectItem.jsx", () => ({ projectId, handleReturn }) => (
  <div>
    <span>Viewing project {projectId}</span>
    <button onClick={handleReturn}>Return</button>
  </div>
));

const authValue = buildAuthValue({ activeUser: { userId: "u1" } });

const projects = [
  { project_id: "p1", project_name: "Tomatoes", plant_type: "Vegetable" },
  { project_id: "p2", project_name: "Peppers", plant_type: "Vegetable" },
];

describe("ProjectList", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("loads and renders the active user's projects", async () => {
    getUserProjectsList.mockResolvedValue({ data: projects });

    renderWithProviders(<ProjectList />, { authValue });

    expect(getUserProjectsList).toHaveBeenCalledWith("u1");
    expect(await screen.findByText("Tomatoes")).toBeInTheDocument();
    expect(screen.getByText("Peppers")).toBeInTheDocument();
  });

  it("opens the create-project modal and creates a project, then refetches the list", async () => {
    getUserProjectsList.mockResolvedValue({ data: [] });
    createNewProject.mockResolvedValue({ data: {} });

    renderWithProviders(<ProjectList />, { authValue });
    await waitFor(() => expect(getUserProjectsList).toHaveBeenCalledTimes(1));

    userEvent.click(screen.getByRole("button", { name: "Create New Project" }));

    expect(screen.getByText("Create New Project", { selector: "h2" })).toBeInTheDocument();

    userEvent.type(screen.getByLabelText("Project Name *"), "Cucumbers");
    userEvent.type(screen.getByLabelText("Plant Type *"), "Vegetable");
    userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createNewProject).toHaveBeenCalledWith("u1", "Cucumbers", "Vegetable"));
    await waitFor(() => expect(getUserProjectsList).toHaveBeenCalledTimes(2));
  });

  it("switches to the selected project and back to the list", async () => {
    getUserProjectsList.mockResolvedValue({ data: projects });

    renderWithProviders(<ProjectList />, { authValue });

    userEvent.click((await screen.findAllByRole("button", { name: "Enter Project" }))[0]);

    expect(screen.getByText("Viewing project p1")).toBeInTheDocument();
    expect(screen.queryByText("Projects List")).not.toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: "Return" }));

    expect(await screen.findByText("Projects List")).toBeInTheDocument();
  });
});
