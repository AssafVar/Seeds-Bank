import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { page, plant } from "../../test-utils/pedigreeFixtures.js";
import * as api from "../../services/serverCalls.js";
import DeletePlantDialog from "./DeletePlantDialog.jsx";

jest.mock("../../services/serverCalls.js", () => require("../../test-utils/serverCallsMock").mockServerCalls(["getPlants"]));

const parent = plant({ plantId: "pl-1", tag: "RA-F2-004", label: "F2", childCount: 5 });
const child = (n, role = "mother") =>
  plant({
    plantId: `c${n}`,
    tag: `RA-F3-00${n}`,
    mother: { plantId: role === "mother" ? "pl-1" : "x", tag: "t", removed: false },
    father: { plantId: role === "father" ? "pl-1" : "y", tag: "t", removed: false },
  });

const setup = (p = parent) => {
  const onDelete = jest.fn().mockResolvedValue({});
  const onClose = jest.fn();
  renderWithProviders(<DeletePlantDialog plant={p} lineName="Roma-A" userId="u1" projectId="p1" onDelete={onDelete} onClose={onClose} />);
  return { onDelete, onClose };
};

describe("DeletePlantDialog", () => {
  beforeEach(() => jest.resetAllMocks());

  it("is a plain confirmation without children and never offers undo", async () => {
    const { onDelete } = setup(plant({ tag: "RA-1", childCount: 0 }));

    expect(screen.getByRole("heading", { name: "Delete RA-1?" })).toBeInTheDocument();
    expect(screen.getByText("This removes the plant. This cannot be undone.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /undo/i })).not.toBeInTheDocument();
    expect(api.getPlants).not.toHaveBeenCalled();

    userEvent.click(screen.getByRole("button", { name: "Delete plant" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ tag: "RA-1" }), false));
  });

  it("lists the first three children, the rest as 'and k more', and starts focus on Cancel", async () => {
    api.getPlants.mockResolvedValue(page([child(1), child(2, "father"), child(3)], { totalCount: 5, pageSize: 3 }));
    const { onDelete } = setup();

    expect(
      screen.getByText("RA-F2-004 is a parent of 5 plants in Roma-A F2. They are kept and marked Parent removed until you pick a new parent.")
    ).toBeInTheDocument();
    expect(await screen.findByText(/RA-F3-001 · Mother/)).toBeInTheDocument();
    expect(screen.getByText(/RA-F3-002 · Father/)).toBeInTheDocument();
    expect(screen.getByText("and 2 more")).toBeInTheDocument();
    expect(api.getPlants).toHaveBeenCalledWith("u1", "p1", expect.objectContaining({ parentId: "pl-1", pageSize: 3 }));
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    userEvent.click(screen.getByRole("button", { name: "Delete plant" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(expect.anything(), true));
  });

  it("shows a failure as text and stays open, also for a network error without a body", async () => {
    const { onDelete, onClose } = setup(plant({ childCount: 0 }));
    onDelete.mockRejectedValue(new Error("offline"));

    userEvent.click(screen.getByRole("button", { name: "Delete plant" }));

    expect(await screen.findByText("Could not delete the plant. Nothing was changed.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete plant" })).toBeEnabled();
  });

  it("explains a has_children conflict", async () => {
    const { onDelete } = setup(plant({ childCount: 0 }));
    onDelete.mockRejectedValue({ response: { status: 409, data: { message: "x", code: "has_children", childCount: 2 } } });

    userEvent.click(screen.getByRole("button", { name: "Delete plant" }));

    expect(await screen.findByText("This plant now has children. Close this dialog and try again.")).toBeInTheDocument();
  });
});
