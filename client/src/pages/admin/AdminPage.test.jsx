import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import AdminPage from "./AdminPage.jsx";

// Each section has its own dedicated test coverage - stub them here so this
// file can focus purely on AdminPage's sidebar-switching behavior.
jest.mock("./sections/HomeContentSection.jsx", () => () => <div>home-content-section</div>);
jest.mock("./sections/GallerySection.jsx", () => () => <div>gallery-section</div>);
jest.mock("./sections/NewsSection.jsx", () => () => <div>news-section</div>);
jest.mock("./sections/VarietiesSection.jsx", () => () => <div>varieties-section</div>);
jest.mock("./sections/WorkersSection.jsx", () => () => <div>workers-section</div>);

describe("AdminPage", () => {
  it("shows the Home page content section by default", () => {
    renderWithProviders(<AdminPage />);

    expect(screen.getByText("home-content-section")).toBeInTheDocument();
  });

  it.each([
    ["Picture gallery", "gallery-section"],
    ["News posts", "news-section"],
    ["Vegetable varieties", "varieties-section"],
    ["Workers", "workers-section"],
  ])("switches to the %s section when clicked", (label, expectedText) => {
    renderWithProviders(<AdminPage />);

    userEvent.click(screen.getByRole("button", { name: label }));

    expect(screen.getByText(expectedText)).toBeInTheDocument();
    expect(screen.queryByText("home-content-section")).not.toBeInTheDocument();
  });
});
