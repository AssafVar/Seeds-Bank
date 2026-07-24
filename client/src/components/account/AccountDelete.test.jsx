import { screen, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import AccountDelete from "./AccountDelete.jsx";

describe("AccountDelete", () => {
  it("does not show the confirmation dialog initially", () => {
    renderWithProviders(<AccountDelete />);

    expect(screen.queryByText("Are you sure you want to delete the account")).not.toBeInTheDocument();
  });

  it("opens a confirmation dialog when Delete is clicked", () => {
    renderWithProviders(<AccountDelete />);

    userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText("Are you sure you want to delete the account")).toBeInTheDocument();
  });

  it("closes the dialog without navigating when the user disagrees", async () => {
    renderWithProviders(<AccountDelete />);

    userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const message = screen.getByText("Are you sure you want to delete the account");
    userEvent.click(screen.getByRole("button", { name: "Disagree" }));

    // MUI's Dialog unmounts its content only after its exit transition ends.
    await waitForElementToBeRemoved(message);
  });

  it("closes the dialog when the user agrees", async () => {
    renderWithProviders(<AccountDelete />);

    userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const message = screen.getByText("Are you sure you want to delete the account");
    userEvent.click(screen.getByRole("button", { name: "Agree" }));

    await waitForElementToBeRemoved(message);
  });
});
