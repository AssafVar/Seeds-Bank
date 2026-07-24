import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FormDialog from "./FormDialog.jsx";

const baseProps = {
  open: true,
  onClose: jest.fn(),
  title: "Add worker",
  message: "",
  onSave: jest.fn(),
  saveLabel: "Save",
  saving: false,
  saveDisabled: false,
  children: <input aria-label="Worker name" />,
};

describe("FormDialog", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(<FormDialog {...baseProps} open={false} />);

    expect(screen.queryByText("Add worker")).not.toBeInTheDocument();
  });

  it("renders the title, children, and message when open", () => {
    render(<FormDialog {...baseProps} message="All fields required." />);

    expect(screen.getByText("Add worker")).toBeInTheDocument();
    expect(screen.getByLabelText("Worker name")).toBeInTheDocument();
    expect(screen.getByText("All fields required.")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    render(<FormDialog {...baseProps} />);

    userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSave when the save button is clicked", () => {
    render(<FormDialog {...baseProps} />);

    userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(baseProps.onSave).toHaveBeenCalledTimes(1);
  });

  it("disables the save button when saveDisabled is true", () => {
    render(<FormDialog {...baseProps} saveDisabled />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows a spinner instead of the save label while saving", () => {
    render(<FormDialog {...baseProps} saving />);

    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });
});
