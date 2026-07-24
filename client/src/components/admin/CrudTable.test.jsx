import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrudTable from "./CrudTable.jsx";

const columns = [
  { key: "name", header: "Name" },
  { key: "role", header: "Role", render: (row) => row.role.toUpperCase() },
];

const rows = [
  { id: 1, name: "Alice", role: "picker" },
  { id: 2, name: "Bob", role: "packer" },
];

const baseProps = {
  columns,
  rows,
  getRowId: (row) => row.id,
  getRowLabel: (row) => row.name,
  selectedId: null,
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  deletingId: null,
  emptyText: "No rows yet.",
};

describe("CrudTable", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows the empty-state text when there are no rows", () => {
    render(<CrudTable {...baseProps} rows={[]} />);

    expect(screen.getByText("No rows yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders one row per item, using each column's custom render function when provided", () => {
    render(<CrudTable {...baseProps} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("PICKER")).toBeInTheDocument();
    expect(screen.getByText("PACKER")).toBeInTheDocument();
  });

  it("calls onEdit with the row when its edit icon is clicked", () => {
    render(<CrudTable {...baseProps} />);

    const editButtons = screen.getAllByRole("button", { name: "" }).filter((btn) => btn.querySelector('[data-testid="EditIcon"]'));
    userEvent.click(editButtons[0]);

    expect(baseProps.onEdit).toHaveBeenCalledWith(rows[0]);
  });

  it("gates delete behind a confirmation dialog and only calls onDelete after confirming", () => {
    render(<CrudTable {...baseProps} />);

    const deleteButtons = screen.getAllByTestId("DeleteIcon");
    userEvent.click(deleteButtons[0].closest("button"));

    expect(baseProps.onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete "Alice"? This can\'t be undone.')).toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(baseProps.onDelete).toHaveBeenCalledWith(1);
  });

  it("cancelling the confirm dialog does not call onDelete", () => {
    render(<CrudTable {...baseProps} />);

    userEvent.click(screen.getAllByTestId("DeleteIcon")[0].closest("button"));
    userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(baseProps.onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete "Alice"? This can\'t be undone.')).not.toBeInTheDocument();
  });

  it("shows a spinner and disables the delete button for the row currently being deleted", () => {
    render(<CrudTable {...baseProps} deletingId={2} />);

    const bobRow = screen.getByText("Bob").closest("tr");
    const deleteButton = bobRow.querySelectorAll("button")[1];

    expect(deleteButton).toBeDisabled();
  });
});
