import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { line } from "../../test-utils/pedigreeFixtures.js";
import ContinueLineDialog from "./ContinueLineDialog.jsx";

jest.mock("../../services/serverCalls.js", () => require("../../test-utils/serverCallsMock").mockServerCalls([]));

const roma = line({ name: "Roma-A", plantCount: 33 });

const setup = (props = {}) => {
  const onSubmit = jest.fn().mockResolvedValue({});
  const onClose = jest.fn();
  renderWithProviders(<ContinueLineDialog line={roma} existingNames={["Roma-A", "Cherry"]} onSubmit={onSubmit} onClose={onClose} {...props} />);
  return { onSubmit, onClose };
};

describe("ContinueLineDialog", () => {
  it("shows the before and after preview and the three reassurances", () => {
    setup();
    userEvent.type(screen.getByLabelText(/New line name/), "Roma-Classic");

    expect(screen.getByRole("heading", { name: "Continue Roma-A as a new line" })).toBeInTheDocument();
    expect(screen.getByText("Roma-A · 33 plants · unchanged")).toBeInTheDocument();
    expect(screen.getByText("Roma-Classic · 0 plants · from Roma-A F3")).toBeInTheDocument();
    expect(screen.getByText("Roma-A stays as it is, with all its plants and tags.")).toBeInTheDocument();
    expect(screen.getByText("Plant tags never change.")).toBeInTheDocument();
  });

  it("closes without asking when no name was typed", () => {
    const { onClose } = setup();

    userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("asks before discarding a typed name", async () => {
    const { onClose } = setup();
    userEvent.type(screen.getByLabelText(/New line name/), "Roma-Classic");

    userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    const confirm = await screen.findByRole("dialog", { name: "Discard changes?" });
    expect(onClose).not.toHaveBeenCalled();
    userEvent.click(within(confirm).getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables Create for a name that already exists and explains why", () => {
    setup();

    userEvent.type(screen.getByLabelText(/New line name/), "cherry");

    expect(screen.getByRole("button", { name: "Create new line" })).toBeDisabled();
    expect(screen.getByText("A line named cherry already exists in this project.")).toBeInTheDocument();
  });

  it("submits the trimmed name and closes", async () => {
    const { onSubmit, onClose } = setup();
    userEvent.type(screen.getByLabelText(/New line name/), "  Roma-Classic ");

    userEvent.click(screen.getByRole("button", { name: "Create new line" }));

    await screen.findByRole("dialog");
    expect(onSubmit).toHaveBeenCalledWith(roma, { newName: "Roma-Classic" });
    await waitForClose(onClose);
  });

  it("shows a server name conflict under the field", async () => {
    const { onSubmit, onClose } = setup();
    onSubmit.mockRejectedValue({ response: { status: 409, data: { message: "A line named Roma-X already exists in this project.", field: "lineName", code: "line_name_taken" } } });
    userEvent.type(screen.getByLabelText(/New line name/), "Roma-X");

    userEvent.click(screen.getByRole("button", { name: "Create new line" }));

    expect(await screen.findByText("A line named Roma-X already exists in this project.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

async function waitForClose(onClose) {
  await waitFor(() => expect(onClose).toHaveBeenCalled());
}
