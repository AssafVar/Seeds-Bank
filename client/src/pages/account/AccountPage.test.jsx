import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, buildAuthValue } from "../../test-utils/renderWithProviders.jsx";
import AccountPage from "./AccountPage.jsx";

jest.mock("../../services/serverCalls", () => ({
  updateProfile: jest.fn(),
}));

const authValue = buildAuthValue({ activeUser: { userName: "Casey" } });

describe("AccountPage", () => {
  it("greets the active user by name in the header", () => {
    renderWithProviders(<AccountPage />, { authValue });

    expect(screen.getByText("Casey's Account")).toBeInTheDocument();
  });

  it("falls back to 'My Account' when the user has no userName", () => {
    renderWithProviders(<AccountPage />, { authValue: buildAuthValue({ activeUser: {} }) });

    expect(screen.getByText("My Account")).toBeInTheDocument();
  });

  it("shows the General section by default", () => {
    renderWithProviders(<AccountPage />, { authValue });

    expect(screen.getByText("Change account user name")).toBeInTheDocument();
  });

  it("switches to the Profile section when clicked", () => {
    renderWithProviders(<AccountPage />, { authValue });

    userEvent.click(screen.getByRole("button", { name: "Profile" }));

    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.queryByText("Change account user name")).not.toBeInTheDocument();
  });

  it("switches to the Delete Account section when clicked", () => {
    renderWithProviders(<AccountPage />, { authValue });

    userEvent.click(screen.getByRole("button", { name: "Delete Account" }));

    expect(screen.getByText("Delete the account will delete all the account information.")).toBeInTheDocument();
  });
});
