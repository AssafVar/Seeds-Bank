import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { getFields, createField, deleteField, renameField, getVegetableVarieties } from "../../services/serverCalls";
import FieldsList from "./FieldsList.jsx";

jest.mock("../../services/serverCalls", () => ({
  getFields: jest.fn(),
  createField: jest.fn(),
  deleteField: jest.fn(),
  renameField: jest.fn(),
  updateFieldGeometry: jest.fn(),
  updateFieldProperties: jest.fn(),
  getFieldWorkLogs: jest.fn(),
  createFieldWorkLog: jest.fn(),
  deleteFieldWorkLog: jest.fn(),
  getVegetableVarieties: jest.fn(),
}));

// These pull in leaflet-based map drawing, out of scope for a unit test -
// FieldsList's own field CRUD/listing/pagination logic is what's under test
// here. Each stub exposes a button that fires onFinish with a fixed shape,
// so tests can simulate "finished drawing" without a real canvas/map.
jest.mock("./FieldDrawingCanvas.jsx", () => ({ onFinish }) => (
  <button onClick={() => onFinish([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }])}>drawing-canvas-finish</button>
));
jest.mock("./FieldMapDrawing.jsx", () => ({ onFinish }) => (
  <button onClick={() => onFinish([{ lat: 1, lng: 1 }, { lat: 2, lng: 1 }, { lat: 2, lng: 2 }])}>map-drawing-finish</button>
));
jest.mock("./ManageSubFieldsMap.jsx", () => () => <div>manage-sub-fields</div>);
jest.mock("./ManageSubFieldsPanel.jsx", () => () => <div>manage-sub-fields-panel</div>);

const paged = (items, overrides = {}) => ({
  items,
  totalCount: items.length,
  page: 1,
  pageSize: 12,
  totalPages: 1,
  ...overrides,
});

afterEach(() => {
  jest.clearAllMocks();
});

beforeEach(() => {
  getFields.mockResolvedValue(paged([]));
  getVegetableVarieties.mockResolvedValue([]);
});

describe("FieldsList", () => {
  it("shows empty-state copy when the project has no fields", async () => {
    getFields.mockResolvedValue(paged([]));

    renderWithProviders(<FieldsList userId="u1" projectId="p1" />);

    expect(await screen.findByText("No fields yet. Add one to plan a planting layout.")).toBeInTheDocument();
  });

  // Standalone fields with their own spacing can no longer be created (every
  // new field is a boundary-only container) but pre-existing ones should
  // still display correctly.
  it("lists a legacy standalone field", async () => {
    getFields.mockResolvedValue(
      paged([
        { id: 1, name: "North plot", plantSpacing: 0.3, rowSpacing: 0.5, shapeType: "rectangle", area: 50, totalCapacity: 100, parentFieldId: null },
      ])
    );

    renderWithProviders(<FieldsList userId="u1" projectId="p1" />);

    expect(await screen.findByText("North plot")).toBeInTheDocument();
    expect(screen.getByText(/50\.0m² · 100 plants/)).toBeInTheDocument();
  });

  it("expands a container to show its sub-fields, and selecting one shows its detail panel", async () => {
    getFields.mockResolvedValue(
      paged([
        { id: 1, name: "Big block", plantSpacing: null, area: 200, totalCapacity: 0, parentFieldId: null },
        { id: 2, name: "Sub plot A", plantSpacing: 0.5, rowSpacing: 0.5, status: "growing", variety: "Tomato", area: 20, totalCapacity: 40, parentFieldId: 1 },
      ])
    );

    renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
    await screen.findByText("Big block");

    expect(screen.queryByText("Sub plot A")).not.toBeInTheDocument();

    userEvent.click(screen.getByText("Big block"));

    expect(await screen.findByText("Sub plot A")).toBeInTheDocument();
    expect(screen.queryByText("Timeline")).not.toBeInTheDocument();

    userEvent.click(screen.getByText("Sub plot A"));

    expect(await screen.findByText("Timeline")).toBeInTheDocument();
  });

  it("shows a container's total sub-field capacity and status breakdown without expanding", async () => {
    getFields.mockResolvedValue(
      paged([
        { id: 1, name: "Big block", plantSpacing: null, area: 200, totalCapacity: 0, parentFieldId: null },
        { id: 2, name: "Sub plot A", plantSpacing: 0.5, rowSpacing: 0.5, status: "growing", area: 20, totalCapacity: 40, parentFieldId: 1 },
        { id: 3, name: "Sub plot B", plantSpacing: 0.5, rowSpacing: 0.5, status: "growing", area: 20, totalCapacity: 30, parentFieldId: 1 },
        { id: 4, name: "Sub plot C", plantSpacing: 0.5, rowSpacing: 0.5, status: "harvested", area: 20, totalCapacity: 10, parentFieldId: 1 },
      ])
    );

    renderWithProviders(<FieldsList userId="u1" projectId="p1" />);

    expect(await screen.findByText("80 plants total")).toBeInTheDocument();
    expect(screen.getByText("2 growing")).toBeInTheDocument();
    expect(screen.getByText("1 harvested")).toBeInTheDocument();
  });

  it("renames a top-level field via the inline edit control", async () => {
    getFields.mockResolvedValueOnce(
      paged([{ id: 1, name: "Big block", plantSpacing: null, area: 200, totalCapacity: 0, parentFieldId: null }])
    );
    renameField.mockResolvedValue({ id: 1, name: "North block", plantSpacing: null, area: 200, totalCapacity: 0, parentFieldId: null });

    renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
    await screen.findByText("Big block");

    userEvent.click(screen.getByRole("button", { name: "Rename Big block" }));
    const input = screen.getByDisplayValue("Big block");
    userEvent.clear(input);
    userEvent.type(input, "North block");
    userEvent.keyboard("{Enter}");

    await waitFor(() => expect(renameField).toHaveBeenCalledWith("u1", "p1", 1, "North block"));
    expect(await screen.findByText("North block")).toBeInTheDocument();
  });

  it("does not submit a rename when the value is unchanged", async () => {
    getFields.mockResolvedValue(
      paged([{ id: 1, name: "Big block", plantSpacing: null, area: 200, totalCapacity: 0, parentFieldId: null }])
    );

    renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
    await screen.findByText("Big block");

    userEvent.click(screen.getByRole("button", { name: "Rename Big block" }));
    userEvent.keyboard("{Enter}");

    await waitFor(() => expect(screen.queryByDisplayValue("Big block")).not.toBeInTheDocument());
    expect(renameField).not.toHaveBeenCalled();
  });

  it("removes a top-level field from the list once it's deleted", async () => {
    getFields.mockResolvedValueOnce(
      paged([
        { id: 1, name: "North plot", plantSpacing: 0.3, rowSpacing: 0.5, shapeType: "rectangle", area: 50, totalCapacity: 100, parentFieldId: null },
      ])
    );
    deleteField.mockResolvedValue(true);
    getFields.mockResolvedValueOnce(paged([]));

    renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
    await screen.findByText("North plot");

    userEvent.click(screen.getByRole("button", { name: "Delete North plot" }));

    await waitFor(() => expect(deleteField).toHaveBeenCalledWith("u1", "p1", 1));
    await waitFor(() => expect(screen.queryByText("North plot")).not.toBeInTheDocument());
  });

  it("shows pagination controls only when there is more than one page", async () => {
    getFields.mockResolvedValue(
      paged([{ id: 1, name: "Field A", plantSpacing: null, area: 10, totalCapacity: 0, parentFieldId: null }], {
        totalPages: 3,
      })
    );

    renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
    await screen.findByText("Field A");

    expect(screen.getByRole("button", { name: "Go to page 2" })).toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: "Go to page 2" }));

    await waitFor(() => expect(getFields).toHaveBeenLastCalledWith("u1", "p1", 2, 12));
  });

  describe("Add Field", () => {
    it("shows only one Add Field button", async () => {
      getFields.mockResolvedValue(paged([]));

      renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
      await screen.findByText("No fields yet. Add one to plan a planting layout.");

      expect(screen.getAllByRole("button", { name: "Add Field" })).toHaveLength(1);
    });

    it("defaults to positioning on a map and switches to drawing without a map", async () => {
      getFields.mockResolvedValue(paged([]));

      renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
      await screen.findByText("No fields yet. Add one to plan a planting layout.");

      userEvent.click(screen.getByRole("button", { name: "Add Field" }));

      expect(screen.getByRole("button", { name: "map-drawing-finish" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "drawing-canvas-finish" })).not.toBeInTheDocument();

      userEvent.click(screen.getByRole("button", { name: "Draw without a map" }));

      expect(screen.getByRole("button", { name: "drawing-canvas-finish" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "map-drawing-finish" })).not.toBeInTheDocument();
    });

    it("shows a validation error instead of submitting with no name or boundary", async () => {
      getFields.mockResolvedValue(paged([]));

      renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
      await screen.findByText("No fields yet. Add one to plan a planting layout.");

      userEvent.click(screen.getByRole("button", { name: "Add Field" }));
      userEvent.click(screen.getByRole("button", { name: "Create" }));

      expect(await screen.findByText("Please enter a name")).toBeInTheDocument();
      expect(createField).not.toHaveBeenCalled();
    });

    it("creates a GPS field with geoVertices when positioned on a map", async () => {
      getFields.mockResolvedValueOnce(paged([]));
      createField.mockResolvedValue({ id: 1, name: "Big block", plantSpacing: null, parentFieldId: null, area: 100, vertices: [], geoVertices: [{ lat: 1, lng: 1 }] });
      getFields.mockResolvedValueOnce(
        paged([{ id: 1, name: "Big block", plantSpacing: null, parentFieldId: null, area: 100, totalCapacity: 0 }])
      );

      renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
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
      getFields.mockResolvedValueOnce(paged([]));
      createField.mockResolvedValue({ id: 1, name: "Backyard block", plantSpacing: null, parentFieldId: null, area: 100, vertices: [], geoVertices: null });
      getFields.mockResolvedValueOnce(
        paged([{ id: 1, name: "Backyard block", plantSpacing: null, parentFieldId: null, area: 100, totalCapacity: 0 }])
      );

      renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
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
      getFields.mockResolvedValue(paged([]));

      renderWithProviders(<FieldsList userId="u1" projectId="p1" />);
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
