import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UndoSnackbar from "./UndoSnackbar.jsx";

const setup = (props) => {
  const handlers = { onUndo: jest.fn(), onDismissUndo: jest.fn(), onDismissNotice: jest.fn() };
  render(<UndoSnackbar {...handlers} {...props} />);
  return handlers;
};

describe("UndoSnackbar", () => {
  it("shows an undoable message with a keyboard-reachable Undo button", () => {
    const { onUndo } = setup({ undo: { label: "Added RA-1." }, notice: "" });

    expect(screen.getByRole("status")).toHaveTextContent("Added RA-1.");
    const button = screen.getByRole("button", { name: "Undo" });
    button.focus();
    expect(button).toHaveFocus();
    userEvent.click(button);
    expect(onUndo).toHaveBeenCalled();
  });

  it("shows a plain notice without an Undo button (delete has no undo)", () => {
    setup({ undo: null, notice: "Deleted RA-1. 2 children kept." });

    expect(screen.getByRole("status")).toHaveTextContent("Deleted RA-1. 2 children kept.");
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  });

  it("shows the undoable message first when both exist (one slot)", () => {
    setup({ undo: { label: "Added RA-1." }, notice: "Population created." });

    expect(screen.getByRole("status")).toHaveTextContent("Added RA-1.");
    expect(screen.queryByText("Population created.")).not.toBeInTheDocument();
  });

  it("renders nothing when there is no message", () => {
    setup({ undo: null, notice: "" });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
