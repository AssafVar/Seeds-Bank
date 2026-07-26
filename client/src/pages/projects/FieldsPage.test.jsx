import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, buildAuthValue } from "../../test-utils/renderWithProviders.jsx";
import { fetchCurrentProject } from "../../services/serverCalls.js";
import FieldsPage from "./FieldsPage.jsx";

jest.mock("../../services/serverCalls.js", () => ({
  fetchCurrentProject: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// FieldsList has its own dedicated test coverage (it pulls in leaflet-based
// map drawing widgets, out of scope here) - stub it so this file can focus
// on FieldsPage's own header/tab-routing wiring.
jest.mock("../../components/projects/FieldsList.jsx", () => ({ userId, projectId }) => (
  <div>Fields list for {userId}/{projectId}</div>
));

const authValue = buildAuthValue({ activeUser: { userId: "u1" } });
const renderOptions = { authValue, route: "/projects/p1/fields", routePath: "/projects/:projectId/fields" };

const projectHeaders = { project_name: "Tomatoes", project_id: "p1" };

describe("FieldsPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows a spinner while the project is loading", async () => {
    fetchCurrentProject.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<FieldsPage />, renderOptions);

    expect(screen.queryByText(/project: Tomatoes/)).not.toBeInTheDocument();
  });

  it("renders the project header, Fields tab active, and the fields list", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [] } });

    renderWithProviders(<FieldsPage />, renderOptions);

    expect(await screen.findByText("project: Tomatoes")).toBeInTheDocument();
    expect(fetchCurrentProject).toHaveBeenCalledWith("u1", "p1");
    expect(screen.getByRole("tab", { name: "Fields", selected: true })).toBeInTheDocument();
    expect(screen.getByText("Fields list for u1/p1")).toBeInTheDocument();
  });

  it("navigates back to the project list", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [] } });

    renderWithProviders(<FieldsPage />, renderOptions);
    await screen.findByText("project: Tomatoes");

    userEvent.click(screen.getByRole("button", { name: "Return to the Project List" }));

    expect(mockNavigate).toHaveBeenCalledWith("/projects");
  });

  it("navigates to the Plants tab on the project route when Plants is clicked", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [] } });

    renderWithProviders(<FieldsPage />, renderOptions);
    await screen.findByText("project: Tomatoes");

    userEvent.click(screen.getByRole("tab", { name: "Plants" }));

    expect(mockNavigate).toHaveBeenCalledWith("/projects/p1?tab=0");
  });

  it("navigates to the Varieties tab on the project route when Varieties is clicked", async () => {
    fetchCurrentProject.mockResolvedValue({ data: { projectHeaders, projectDetails: [] } });

    renderWithProviders(<FieldsPage />, renderOptions);
    await screen.findByText("project: Tomatoes");

    userEvent.click(screen.getByRole("tab", { name: "Varieties" }));

    expect(mockNavigate).toHaveBeenCalledWith("/projects/p1?tab=2");
  });
});
