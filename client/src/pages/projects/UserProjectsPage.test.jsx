import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import UserProjectsPage from "./UserProjectsPage.jsx";

// ProjectList (and everything under it - ProjectItem, FieldsList, the
// react-leaflet map drawing widgets) has its own dedicated test coverage.
// UserProjectsPage itself is just a Container wrapper around it.
jest.mock("../../components/projects/ProjectList", () => () => <div>project-list</div>);

describe("UserProjectsPage", () => {
  it("renders the project list", () => {
    renderWithProviders(<UserProjectsPage />);

    expect(screen.getByText("project-list")).toBeInTheDocument();
  });
});
