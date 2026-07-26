import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getVegetableVarieties, getWorkers } from "../../services/serverCalls";
import ManageSubFieldsPanel from "./ManageSubFieldsPanel.jsx";

jest.mock("../../services/serverCalls", () => ({
  getVegetableVarieties: jest.fn(),
  getWorkers: jest.fn(),
}));

jest.mock("./FieldTimeline.jsx", () => ({ status }) => <div>field-timeline-{status}</div>);
jest.mock("./FieldLaborTab.jsx", () => ({ fieldId }) => <div>field-labor-{fieldId}</div>);

const parentField = {
  id: 10,
  name: "Backyard block",
  vertices: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
};

const subField = {
  id: 1,
  name: "Tomato row",
  variety: "Cherry Tomato",
  sowingStructure: "grid",
  plantSpacing: 0.3,
  rowSpacing: 0.5,
  status: "growing",
  totalCapacity: 20,
  area: 4,
  vertices: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 4 }],
  plantPositions: [],
  isPreviewApproximate: false,
};

function baseProps(overrides = {}) {
  return {
    parentField,
    subFields: [],
    onCreate: jest.fn(),
    onUpdateGeometry: jest.fn(),
    onUpdateProperties: jest.fn(),
    onDelete: jest.fn(),
    onGetWorkLogs: jest.fn(),
    onCreateWorkLog: jest.fn(),
    onDeleteWorkLog: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

// A parent sized so the panel's local-to-pixel scale comes out to an exact
// integer (368px drawable width / 46m = 8px/m) - keeps the pixel deltas used
// to simulate drags below round-tripping to exact meter deltas, with no
// floating-point drift to fight in assertions.
const dragParentField = {
  id: 10,
  name: "Backyard block",
  vertices: [
    { x: 0, y: 0 },
    { x: 46, y: 0 },
    { x: 46, y: 20 },
    { x: 0, y: 20 },
  ],
};

const dragSubField = {
  ...subField,
  vertices: [
    { x: 10, y: 5 },
    { x: 14, y: 5 },
    { x: 14, y: 9 },
  ],
};

beforeEach(() => {
  getVegetableVarieties.mockResolvedValue([]);
  getWorkers.mockResolvedValue([]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("ManageSubFieldsPanel", () => {
  it("shows the add-new form with drawing controls when there are no sub-fields yet", () => {
    render(<ManageSubFieldsPanel {...baseProps()} />);

    expect(screen.getByText("Add a new sub-field")).toBeInTheDocument();
    expect(
      screen.getByText("Click on the boundary preview to place the new sub-field's corners, then Close Shape.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close Shape" })).toBeInTheDocument();
  });

  it("shows a validation error instead of creating a sub-field with no boundary drawn", async () => {
    const onCreate = jest.fn();
    render(<ManageSubFieldsPanel {...baseProps({ onCreate })} />);

    userEvent.type(screen.getByLabelText("Field name"), "Tomato row");
    userEvent.type(screen.getByLabelText("Plant spacing (m)"), "0.3");
    userEvent.type(screen.getByLabelText("Row spacing (m)"), "0.5");
    userEvent.click(screen.getByRole("button", { name: "Add Sub-Field" }));

    expect(await screen.findByText("Draw and close a boundary with at least 3 points")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates a new sub-field with the drawn local vertices", async () => {
    // Same scale trick as dragParentField below (8px/m) - drawn pixel clicks
    // round-trip to exact meter coordinates with no floating-point drift.
    const onCreate = jest.fn().mockResolvedValue({ ...subField, id: 2 });
    const { container } = render(
      <ManageSubFieldsPanel {...baseProps({ parentField: dragParentField, onCreate })} />
    );

    userEvent.type(screen.getByLabelText("Field name"), "Tomato row");
    userEvent.type(screen.getByLabelText("Plant spacing (m)"), "0.3");
    userEvent.type(screen.getByLabelText("Row spacing (m)"), "0.5");

    // The boundary preview svg specifically - MUI's own icons (e.g. the
    // variety Select's dropdown arrow) are also <svg> elements in this tree.
    const svg = container.querySelector('svg[width="400"]');
    fireEvent.click(svg, { clientX: 32, clientY: 32 }); // -> {x: 2, y: 2}
    fireEvent.click(svg, { clientX: 48, clientY: 32 }); // -> {x: 4, y: 2}
    fireEvent.click(svg, { clientX: 48, clientY: 48 }); // -> {x: 4, y: 4}
    userEvent.click(screen.getByRole("button", { name: "Close Shape" }));
    userEvent.click(screen.getByRole("button", { name: "Add Sub-Field" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        name: "Tomato row",
        variety: null,
        shapeType: "polygon",
        parentFieldId: 10,
        vertices: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 4 }],
        sowingStructure: "grid",
        plantSpacing: 0.3,
        rowSpacing: 0.5,
      })
    );
  });

  it("lists existing sub-fields and prefills the form when one is selected", () => {
    render(<ManageSubFieldsPanel {...baseProps({ subFields: [subField] })} />);

    userEvent.click(screen.getByText("Tomato row"));
    expect(screen.getByText("Edit selected sub-field")).toBeInTheDocument();

    // A non-"planning" field opens on the Field Data tab, not Basics.
    userEvent.click(screen.getByRole("tab", { name: "Basics" }));
    expect(screen.getByLabelText("Field name")).toHaveValue("Tomato row");
  });

  it("shows the Field Data and Labor tabs for a selected sub-field", () => {
    render(<ManageSubFieldsPanel {...baseProps({ subFields: [subField] })} />);

    userEvent.click(screen.getByText("Tomato row"));
    userEvent.click(screen.getByRole("tab", { name: "Field Data" }));
    expect(screen.getByText("field-timeline-growing")).toBeInTheDocument();

    userEvent.click(screen.getByRole("tab", { name: "Labor" }));
    expect(screen.getByText("field-labor-1")).toBeInTheDocument();
  });

  it("deletes a sub-field", async () => {
    const onDelete = jest.fn().mockResolvedValue(true);
    render(<ManageSubFieldsPanel {...baseProps({ subFields: [subField], onDelete })} />);

    userEvent.click(screen.getByTitle("Delete"));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(1));
  });

  it("drags a sub-field to reposition it and saves the translated vertices", async () => {
    const onUpdateGeometry = jest.fn().mockResolvedValue({ ...dragSubField });
    const { container } = render(
      <ManageSubFieldsPanel
        {...baseProps({ parentField: dragParentField, subFields: [dragSubField], onUpdateGeometry })}
      />
    );

    const subFieldPolygon = container.querySelectorAll("svg polygon")[1];

    fireEvent.mouseDown(subFieldPolygon, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 116, clientY: 100 });
    fireEvent.mouseUp(window, { clientX: 116, clientY: 100 });

    await waitFor(() =>
      expect(onUpdateGeometry).toHaveBeenCalledWith(1, {
        vertices: [
          { x: 12, y: 5 },
          { x: 16, y: 5 },
          { x: 16, y: 9 },
        ],
      })
    );
  });

  it("reverts a drag when the server rejects the new position as outside the parent boundary", async () => {
    const onUpdateGeometry = jest.fn().mockResolvedValue(null);
    const { container } = render(
      <ManageSubFieldsPanel
        {...baseProps({ parentField: dragParentField, subFields: [dragSubField], onUpdateGeometry })}
      />
    );

    const subFieldPolygon = container.querySelectorAll("svg polygon")[1];
    const originalPoints = subFieldPolygon.getAttribute("points");

    fireEvent.mouseDown(subFieldPolygon, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 116, clientY: 100 });
    fireEvent.mouseUp(window, { clientX: 116, clientY: 100 });

    await waitFor(() =>
      expect(screen.getByText("That position is outside the parent field's boundary.")).toBeInTheDocument()
    );
    expect(subFieldPolygon.getAttribute("points")).toBe(originalPoints);
  });

  it("copies a sub-field and pastes a duplicate with the same shape and spacing", async () => {
    const onCreate = jest.fn().mockResolvedValue({ ...subField, id: 2, name: "Tomato row copy" });
    render(<ManageSubFieldsPanel {...baseProps({ subFields: [subField], onCreate })} />);

    userEvent.click(screen.getByTitle("Copy"));
    userEvent.click(screen.getByRole("button", { name: 'Paste copy of "Tomato row"' }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        name: "Tomato row copy",
        variety: "Cherry Tomato",
        shapeType: "polygon",
        parentFieldId: 10,
        vertices: subField.vertices,
        sowingStructure: "grid",
        plantSpacing: 0.3,
        rowSpacing: 0.5,
      })
    );
  });

  it("reshapes the outer boundary when a corner is dragged while editing it", async () => {
    const onUpdateGeometry = jest.fn().mockResolvedValue({ ...dragParentField });
    const { container } = render(
      <ManageSubFieldsPanel {...baseProps({ parentField: dragParentField, onUpdateGeometry })} />
    );

    userEvent.click(screen.getByRole("button", { name: "Edit outer boundary shape" }));
    expect(screen.getByRole("button", { name: "Done editing boundary" })).toBeInTheDocument();

    const boundaryVertexHandles = container.querySelectorAll("svg circle");
    expect(boundaryVertexHandles).toHaveLength(4);

    fireEvent.mouseDown(boundaryVertexHandles[0], { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 116, clientY: 100 });
    fireEvent.mouseUp(window, { clientX: 116, clientY: 100 });

    await waitFor(() =>
      expect(onUpdateGeometry).toHaveBeenCalledWith(10, {
        vertices: [
          { x: 2, y: 0 },
          { x: 46, y: 0 },
          { x: 46, y: 20 },
          { x: 0, y: 20 },
        ],
      })
    );
  });

  it("reverts a boundary resize when the server rejects it as cutting off a sub-field", async () => {
    const onUpdateGeometry = jest.fn().mockResolvedValue(null);
    const { container } = render(
      <ManageSubFieldsPanel {...baseProps({ parentField: dragParentField, onUpdateGeometry })} />
    );

    userEvent.click(screen.getByRole("button", { name: "Edit outer boundary shape" }));
    const boundaryVertexHandles = container.querySelectorAll("svg circle");
    const originalCx = boundaryVertexHandles[0].getAttribute("cx");

    fireEvent.mouseDown(boundaryVertexHandles[0], { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 116, clientY: 100 });
    fireEvent.mouseUp(window, { clientX: 116, clientY: 100 });

    await waitFor(() =>
      expect(screen.getByText("Resizing would leave an existing sub-field outside this boundary.")).toBeInTheDocument()
    );
    expect(container.querySelectorAll("svg circle")[0].getAttribute("cx")).toBe(originalCx);
  });

  it("exits boundary-editing mode when a sub-field is selected instead", () => {
    render(<ManageSubFieldsPanel {...baseProps({ subFields: [subField] })} />);

    userEvent.click(screen.getByRole("button", { name: "Edit outer boundary shape" }));
    expect(screen.getByRole("button", { name: "Done editing boundary" })).toBeInTheDocument();

    userEvent.click(screen.getByText("Tomato row"));
    expect(screen.getByRole("button", { name: "Edit outer boundary shape" })).toBeInTheDocument();
  });

  it("calls onClose when Close is clicked", () => {
    const onClose = jest.fn();
    render(<ManageSubFieldsPanel {...baseProps({ onClose })} />);

    userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
