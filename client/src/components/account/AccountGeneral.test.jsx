import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import authContext from "../../contexts/AuthContext";
import { updateProfile } from "../../services/serverCalls";
import AccountGeneral from "./AccountGeneral.jsx";

jest.mock("../../services/serverCalls", () => ({
  updateProfile: jest.fn(),
}));

function renderWithAuth(activeUser = { userName: "Casey" }, updateActiveUser = jest.fn()) {
  return render(
    <authContext.Provider value={{ activeUser, updateActiveUser }}>
      <AccountGeneral />
    </authContext.Provider>
  );
}

describe("AccountGeneral", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prefills the name field with the active user's current userName", () => {
    renderWithAuth({ userName: "Casey" });

    expect(screen.getByLabelText("Name")).toHaveValue("Casey");
  });

  it("saves the new user name and updates the auth context on success", async () => {
    updateProfile.mockResolvedValue({ userName: "Jordan" });
    const updateActiveUser = jest.fn();
    renderWithAuth({ userName: "Casey" }, updateActiveUser);

    userEvent.clear(screen.getByLabelText("Name"));
    userEvent.type(screen.getByLabelText("Name"), "Jordan");
    userEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(updateProfile).toHaveBeenCalledWith("Jordan");
    expect(updateActiveUser).toHaveBeenCalledWith({ userName: "Jordan" });
  });

  it("shows a failure message when the save does not succeed", async () => {
    updateProfile.mockResolvedValue(null);
    renderWithAuth({ userName: "Casey" });

    userEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(await screen.findByText("Failed to save")).toBeInTheDocument();
  });

  it("shows an error and does not submit when the passwords don't match", async () => {
    renderWithAuth({ userName: "Casey" });

    userEvent.type(screen.getByLabelText("Password"), "secret1");
    userEvent.type(screen.getByLabelText("Confirm password"), "secret2");
    userEvent.click(screen.getAllByRole("button", { name: "Save" })[1]);

    await waitFor(() => expect(screen.getByText("Passwords don't match")).toBeInTheDocument());
  });
});
