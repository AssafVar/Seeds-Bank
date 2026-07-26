import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import AccountSettings from "./AccountSettings.jsx";

describe("AccountSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("lists all available themes with the default one selected", () => {
    renderWithProviders(<AccountSettings />);

    expect(screen.getByRole("radio", { name: "Pine" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Sunset" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Ocean" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Berry" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Meadow" })).toBeInTheDocument();
  });

  it("selects a theme and persists it to localStorage", () => {
    renderWithProviders(<AccountSettings />);

    userEvent.click(screen.getByRole("radio", { name: "Ocean" }));

    expect(screen.getByRole("radio", { name: "Ocean" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Pine" })).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem("sb-theme-id")).toBe("ocean");
  });
});
