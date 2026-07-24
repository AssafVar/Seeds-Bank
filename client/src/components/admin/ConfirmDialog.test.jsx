import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "./ConfirmDialog.jsx";

const baseProps = {
  open: true,
  title: "Delete this row?",
  message: 'Delete "Alice"? This can\'t be undone.',
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
};

describe("ConfirmDialog", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(<ConfirmDialog {...baseProps} open={false} />);

    expect(screen.queryByText("Delete this row?")).not.toBeInTheDocument();
  });

  it("renders the title and message when open", () => {
    render(<ConfirmDialog {...baseProps} />);

    expect(screen.getByText("Delete this row?")).toBeInTheDocument();
    expect(screen.getByText('Delete "Alice"? This can\'t be undone.')).toBeInTheDocument();
  });

  it("defaults the confirm button label to 'Delete'", () => {
    render(<ConfirmDialog {...baseProps} />);

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("uses a custom confirmLabel when provided", () => {
    render(<ConfirmDialog {...baseProps} confirmLabel="Remove" />);

    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    render(<ConfirmDialog {...baseProps} />);

    userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    render(<ConfirmDialog {...baseProps} />);

    userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
  });
});
