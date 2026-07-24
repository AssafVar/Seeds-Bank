import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { getFields, createField, deleteField } from "../../services/serverCalls";
import FieldsSection from "./FieldsSection.jsx";

jest.mock("../../services/serverCalls", () => ({
  getFields: jest.fn(),
  createField: jest.fn(),
  deleteField: jest.fn(),
  updateFieldGeometry: jest.fn(),
  updateFieldProperties: jest.fn(),
  getFieldWorkLogs: jest.fn(),
  createFieldWorkLog: jest.fn(),
  deleteFieldWorkLog: jest.fn(),
}));

// These pull in leaflet-based map drawing, out of scope for a unit test -
// FieldsSection's own field CRUD/listing logic is what's under test here.
// Each stub exposes a button that fires onFinish with a fixed shape, so
// tests can simulate "finished drawing" without a real canvas/map.
jest.mock("./FieldDrawingCanvas.jsx", () => ({ onFinish }) => (
  <button onClick={() => onFinish([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])}>drawing-canvas-finish</button>
));
jest.mock("./FieldMapDrawing.jsx", () => ({ onFinish }) => (
  <button onClick={() => onFinish([{ lat: 1, lng: 1 }, { lat: 2, lng: 1 }, { lat: 2, lng: 2 }])}>map-drawing-finish</button>
));
jest.mock("./ManageSubFieldsMap.jsx", () => () => <div>manage-sub-fields</div>);
jest.mock("./ManageSubFieldsPanel.jsx", () => () => <div>manage-sub-fields-panel</div>);

afterEach(() => {
  jest.clearAllMocks();
});

describe("FieldsSection", () => {
  it("shows empty-state copy when the project has no fields", async () => {
    getFields.mockResolvedValue([]);

    renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);

    expect(await screen.findByText("No fields yet. Add one to plan a planting layout.")).toBeInTheDocument();
  });

  // Standalone fields with their own spacing can no longer be created (every
  // new field is a boundary-only container) but pre-existing ones should
  // still display correctly.
  it("lists legacy standalone fields as cards", async () => {
    getFields.mockResolvedValue([
      { id: 1, name: "North plot", plantSpacing: 0.3, rowSpacing: 0.5, shapeType: "rectangle", landWidth: 10, landLength: 5, totalCapacity: 100, parentFieldId: null },
    ]);

    renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);

    expect(await screen.findByText("North plot")).toBeInTheDocument();
    expect(screen.getByText(/10m × 5m land/)).toBeInTheDocument();
  });

  it("removes a field from the list once it's deleted", async () => {
    getFields.mockResolvedValue([
      { id: 1, name: "North plot", plantSpacing: 0.3, rowSpacing: 0.5, shapeType: "rectangle", landWidth: 10, landLength: 5, totalCapacity: 100, parentFieldId: null },
    ]);
    deleteField.mockResolvedValue(true);

    renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);
    await screen.findByText("North plot");

    userEvent.click(screen.getByRole("button", { name: "" }));

    await waitFor(() => expect(deleteField).toHaveBeenCalledWith("u1", "p1", 1));
    await waitFor(() => expect(screen.queryByText("North plot")).not.toBeInTheDocument());
  });

  describe("Add Field", () => {
    it("shows only one Add Field button", async () => {
      getFields.mockResolvedValue([]);

      renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);
      await screen.findByText("No fields yet. Add one to plan a planting layout.");

      expect(screen.getAllByRole("button", { name: "Add Field" })).toHaveLength(1);
    });

    it("defaults to positioning on a map and switches to drawing without a map", async () => {
      getFields.mockResolvedValue([]);

      renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);
      await screen.findByText("No fields yet. Add one to plan a planting layout.");

      userEvent.click(screen.getByRole("button", { name: "Add Field" }));

      expect(screen.getByRole("button", { name: "map-drawing-finish" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "drawing-canvas-finish" })).not.toBeInTheDocument();

      userEvent.click(screen.getByRole("button", { name: "Draw without a map" }));

      expect(screen.getByRole("button", { name: "drawing-canvas-finish" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "map-drawing-finish" })).not.toBeInTheDocument();
    });

    it("shows a validation error instead of submitting with no name or boundary", async () => {
      getFields.mockResolvedValue([]);

      renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);
      await screen.findByText("No fields yet. Add one to plan a planting layout.");

      userEvent.click(screen.getByRole("button", { name: "Add Field" }));
      userEvent.click(screen.getByRole("button", { name: "Create" }));

      expect(await screen.findByText("Please enter a name")).toBeInTheDocument();
      expect(createField).not.toHaveBeenCalled();
    });

    it("creates a GPS field with geoVertices when positioned on a map", async () => {
      getFields.mockResolvedValue([]);
      createField.mockResolvedValue({ id: 1, name: "Big block", plantSpacing: null, parentFieldId: null, area: 100, vertices: [], geoVertices: [{ lat: 1, lng: 1 }] });

      renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);
      await screen.findByText("No fields yet. Add one to plan a planting layout.");

      userEvent.click(screen.getByRole("button", { name: "Add Field" }));
      userEvent.type(screen.getByLabelText("Field name"), "Big block");
      userEvent.click(screen.getByRole("button", { name: "map-drawing-finish" }));
      userEvent.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() =>
        expect(createField).toHaveBeenCalledWith("u1", "p1", {
          name: "Big block",
          shapeType: "polygon",
          geoVertices: [{ lat: 1, lng: 1 }, { lat: 2, lng: 1 }, { lat: 2, lng: 2 }],
        })
      );
      expect(await screen.findByText("Big block")).toBeInTheDocument();
    });

    it("creates a map-less field with vertices when drawn without a map", async () => {
      getFields.mockResolvedValue([]);
      createField.mockResolvedValue({ id: 1, name: "Backyard block", plantSpacing: null, parentFieldId: null, area: 100, vertices: [], geoVertices: null });

      renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);
      await screen.findByText("No fields yet. Add one to plan a planting layout.");

      userEvent.click(screen.getByRole("button", { name: "Add Field" }));
      userEvent.click(screen.getByRole("button", { name: "Draw without a map" }));
      userEvent.type(screen.getByLabelText("Field name"), "Backyard block");
      userEvent.click(screen.getByRole("button", { name: "drawing-canvas-finish" }));
      userEvent.click(screen.getByRole("button", { name: "Create" }));

      await waitFor(() =>
        expect(createField).toHaveBeenCalledWith("u1", "p1", {
          name: "Backyard block",
          shapeType: "polygon",
          vertices: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }],
        })
      );
      expect(await screen.findByText("Backyard block")).toBeInTheDocument();
    });

    it("switching boundary mode discards a shape drawn in the other mode", async () => {
      getFields.mockResolvedValue([]);

      renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);
      await screen.findByText("No fields yet. Add one to plan a planting layout.");

      userEvent.click(screen.getByRole("button", { name: "Add Field" }));
      userEvent.click(screen.getByRole("button", { name: "map-drawing-finish" }));
      userEvent.click(screen.getByRole("button", { name: "Draw without a map" }));
      userEvent.type(screen.getByLabelText("Field name"), "Backyard block");
      userEvent.click(screen.getByRole("button", { name: "Create" }));

      expect(await screen.findByText("Draw and close a boundary with at least 3 points")).toBeInTheDocument();
      expect(createField).not.toHaveBeenCalled();
    });
  });
});
