import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import AboutPage from "./AboutPage.jsx";

describe("AboutPage", () => {
  it("renders the page title and all four capability cards", () => {
    renderWithProviders(<AboutPage />);

    expect(screen.getByText("About Us")).toBeInTheDocument();
    expect(screen.getByText("Pedigree & trait tracking")).toBeInTheDocument();
    expect(screen.getByText("Smart breeding pairs")).toBeInTheDocument();
    expect(screen.getByText("Health & performance records")).toBeInTheDocument();
    expect(screen.getByText("Streamlined decisions")).toBeInTheDocument();
  });
});
