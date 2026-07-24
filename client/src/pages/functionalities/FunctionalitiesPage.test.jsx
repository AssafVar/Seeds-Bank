import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import FunctionalitiesPage from "./FunctionalitiesPage.jsx";

describe("FunctionalitiesPage", () => {
  it("renders the page title and every functionality's title", () => {
    renderWithProviders(<FunctionalitiesPage />);

    expect(screen.getByText("Why Seeds Bank")).toBeInTheDocument();
    expect(screen.getByText("Project & plant tracking")).toBeInTheDocument();
    expect(screen.getByText("Purity detection")).toBeInTheDocument();
    expect(screen.getByText("Crossing tool")).toBeInTheDocument();
    expect(screen.getByText("Climate explorer")).toBeInTheDocument();
    expect(screen.getByText("Works on any device")).toBeInTheDocument();
  });

  it("expands the first item by default and shows its description", () => {
    renderWithProviders(<FunctionalitiesPage />);

    expect(screen.getByText(/Create a breeding project and log every plant/)).toBeVisible();
  });

  it("expands a collapsed item's description when its summary is clicked", () => {
    renderWithProviders(<FunctionalitiesPage />);

    userEvent.click(screen.getByText("Purity detection"));

    expect(screen.getByText(/automatically flagged as stable/)).toBeVisible();
  });
});
