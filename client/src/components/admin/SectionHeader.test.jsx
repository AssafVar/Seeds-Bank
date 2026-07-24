import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SectionHeader from "./SectionHeader.jsx";

describe("SectionHeader", () => {
  it("renders the title and add-button label", () => {
    render(<SectionHeader title="Workers" buttonLabel="Add worker" onAdd={jest.fn()} />);

    expect(screen.getByText("Workers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add worker" })).toBeInTheDocument();
  });

  it("renders an optional description when provided", () => {
    render(<SectionHeader title="Workers" description="Manage the roster." buttonLabel="Add worker" onAdd={jest.fn()} />);

    expect(screen.getByText("Manage the roster.")).toBeInTheDocument();
  });

  it("omits the description when not provided", () => {
    render(<SectionHeader title="Workers" buttonLabel="Add worker" onAdd={jest.fn()} />);

    expect(screen.queryByText("Manage the roster.")).not.toBeInTheDocument();
  });

  it("calls onAdd when the button is clicked", () => {
    const onAdd = jest.fn();
    render(<SectionHeader title="Workers" buttonLabel="Add worker" onAdd={onAdd} />);

    userEvent.click(screen.getByRole("button", { name: "Add worker" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
