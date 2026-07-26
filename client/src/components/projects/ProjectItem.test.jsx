import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, buildAuthValue } from "../../test-utils/renderWithProviders.jsx";
import { fetchCurrentProject, saveProject } from "../../services/serverCalls.js";
import ProjectItem from "./ProjectItem.jsx";

// nanoid v4 is ESM-only and breaks under CRA's default Jest transform;
// addNewLine/crossPlants (exercised for real below, from libs/projects.js)
// use it to mint new plant ids, so stub it out with a deterministic value.
jest.mock("nanoid", () => ({ nanoid: () => "new-plant-id" }));

jest.mock("../../services/serverCalls.js", () => ({
  fetchCurrentProject: jest.fn(),
  saveProject: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// VarietiesSection has its own dedicated test coverage - stub it here so
// this file can focus on ProjectItem's own Plants-tab logic and
// tab-switching/routing wiring. The Fields tab no longer renders anything
// inline (it navigates to its own route - see FieldsPage.test.jsx).
jest.mock("./VarietiesSection.jsx", () => ({ userId, projectId }) => (
  <div>Varieties section for {userId}/{projectId}</div>
));

const authValue = buildAuthValue({ activeUser: { userId: "u1" } });
const renderOptions = { authValue, route: "/projects/p1", routePath: "/projects/:projectId" };

const projectHeaders = { project_name: "Tomatoes", project_id: "p1" };

function plant(overrides) {
  return {
    line: "Line A",
    project_name: "Tomatoes",
    project_id: "p1",
    plant_id: "plant-1",
    plant_father_id: "---",
    plant_mother_id: "---",
    fruit_color: "red",
    fruit_weight: "10g",
    seed_color: "black",
    seed_weight: "1g",
    photo: "---",
    generation: 0,
    ...overrides,
  };
}

describe("ProjectItem", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows a spinner while the project is loading, then renders its name", async () => {
    fetchCurrentProject.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ProjectItem />, renderOptions);

    expect(screen.queryByText(/project: Tomatoes/)).not.toBeInTheDocument();
  });

  it("renders the project name and one row per plant once loaded", async () => {
    fetchCurrentProject.mockResolvedValue({
      data: { projectHeaders, projectDetails: [plant({ plant_id: "plant-1", line: "Line A" }), plant({ plant_id: "plant-2", line: "Line B" })] },
    });

    renderWithProviders(<ProjectItem />, renderOptions);

    expect(await screen.findByText("project: Tomatoes")).toBeInTheDocument();
    expect(fetchCurrentProject).toHaveBeenCalledWith("u1", "p1");
    expect(await screen.findByDisplayValue("Line A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Line B")).toBeInTheDocument();
  });

  it("navigates to the project list when 'Return to the Project List' is clicked", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [] } });

    renderWithProviders(<ProjectItem />, renderOptions);
    await screen.findByText("project: Tomatoes");

    userEvent.click(screen.getByRole("button", { name: "Return to the Project List" }));

    expect(mockNavigate).toHaveBeenCalledWith("/projects");
  });

  it("updates a plant's line in place when its field is edited", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [plant()] } });

    renderWithProviders(<ProjectItem />, renderOptions);
    const lineInput = await screen.findByDisplayValue("Line A");

    userEvent.type(lineInput, "1");

    expect(lineInput).toHaveValue("Line A1");
  });

  it("adds a new row when 'Add new variety' is clicked", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [plant()] } });

    renderWithProviders(<ProjectItem />, renderOptions);
    await screen.findByDisplayValue("Line A");

    userEvent.click(screen.getByRole("button", { name: "Add new variety" }));

    expect(screen.getAllByDisplayValue("---")).not.toHaveLength(0);
  });

  it("saves the project and shows a success message", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [plant()] } });
    saveProject.mockResolvedValue(true);

    renderWithProviders(<ProjectItem />, renderOptions);
    await screen.findByDisplayValue("Line A");

    userEvent.click(screen.getByRole("button", { name: "Save Project" }));

    expect(screen.getByText("Saving project details...")).toBeInTheDocument();
    expect(await screen.findByText("Database updated successfully")).toBeInTheDocument();
    expect(saveProject).toHaveBeenCalledWith(projectHeaders, [plant()]);
  });

  it("shows a failure message when saving does not succeed", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [plant()] } });
    saveProject.mockResolvedValue(false);

    renderWithProviders(<ProjectItem />, renderOptions);
    await screen.findByDisplayValue("Line A");

    userEvent.click(screen.getByRole("button", { name: "Save Project" }));

    expect(await screen.findByText("Error Updating project")).toBeInTheDocument();
  });

  it("crosses two selected plants into a new combined row", async () => {
    fetchCurrentProject.mockResolvedValue({
      data: { projectHeaders, projectDetails: [plant({ plant_id: "plant-1", line: "Line A" }), plant({ plant_id: "plant-2", line: "Line B" })] },
    });

    renderWithProviders(<ProjectItem />, renderOptions);
    await screen.findByDisplayValue("Line A");

    userEvent.click(screen.getByRole("button", { name: "Cross Lines" }));
    userEvent.click(screen.getByLabelText("Parent A"));
    userEvent.click(await screen.findByRole("option", { name: /Line A/ }));
    userEvent.click(screen.getByLabelText("Parent B"));
    userEvent.click(await screen.findByRole("option", { name: /Line B/ }));
    userEvent.click(screen.getByRole("button", { name: "Cross" }));

    // The cross lands one generation ahead of its parents, so it's outside
    // the current (generation 0) filter - its existence is what makes the
    // Generation selector appear at all (it's hidden while there's only one,
    // and "Generation" alone is ambiguous - it's also a table column header).
    await waitFor(() => expect(screen.queryByText("Cross two lines")).not.toBeInTheDocument());
    await waitFor(() => expect(document.getElementById("generations-select")).toBeInTheDocument());
  });

  it("navigates to the Fields route and switches to the Varieties tab", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [] } });

    renderWithProviders(<ProjectItem />, renderOptions);
    await screen.findByText("project: Tomatoes");

    userEvent.click(screen.getByRole("tab", { name: "Fields" }));
    expect(mockNavigate).toHaveBeenCalledWith("/projects/p1/fields");

    userEvent.click(screen.getByRole("tab", { name: "Varieties" }));
    expect(screen.getByText("Varieties section for u1/p1")).toBeInTheDocument();
  });

  it("opens on the Varieties tab when the ?tab=2 search param is set", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [] } });

    renderWithProviders(<ProjectItem />, { ...renderOptions, route: "/projects/p1?tab=2" });

    expect(await screen.findByText("Varieties section for u1/p1")).toBeInTheDocument();
  });
});
