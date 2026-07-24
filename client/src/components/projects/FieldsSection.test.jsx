import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { getFields, getVegetableVarieties, createField, deleteField } from "../../services/serverCalls";
import FieldsSection from "./FieldsSection.jsx";

jest.mock("../../services/serverCalls", () => ({
  getFields: jest.fn(),
  getVegetableVarieties: jest.fn(),
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
jest.mock("./FieldDrawingCanvas.jsx", () => () => <div>drawing-canvas</div>);
jest.mock("./FieldMapDrawing.jsx", () => () => <div>map-drawing</div>);
jest.mock("./ManageSubFieldsMap.jsx", () => () => <div>manage-sub-fields</div>);

beforeEach(() => {
  getVegetableVarieties.mockResolvedValue([]);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("FieldsSection", () => {
  it("shows empty-state copy when the project has no fields", async () => {
    getFields.mockResolvedValue([]);

    renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);

    expect(await screen.findByText("No fields yet. Add one to plan a planting layout.")).toBeInTheDocument();
  });

  it("lists standalone fields as cards", async () => {
    getFields.mockResolvedValue([
      { id: 1, name: "North plot", plantSpacing: 0.3, rowSpacing: 0.5, shapeType: "rectangle", landWidth: 10, landLength: 5, totalCapacity: 100, parentFieldId: null },
    ]);

    renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);

    expect(await screen.findByText("North plot")).toBeInTheDocument();
    expect(screen.getByText(/10m × 5m land/)).toBeInTheDocument();
  });

  it("creates a new rectangular field and prepends it to the list", async () => {
    getFields.mockResolvedValue([]);
    createField.mockResolvedValue({
      id: 2, name: "South plot", plantSpacing: 0.3, rowSpacing: 0.5, shapeType: "rectangle", landWidth: 8, landLength: 4, totalCapacity: 50, parentFieldId: null,
    });

    renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);
    await screen.findByText("No fields yet. Add one to plan a planting layout.");

    userEvent.click(screen.getByRole("button", { name: "Add Field" }));
    userEvent.type(screen.getByLabelText("Field name"), "South plot");
    userEvent.type(screen.getByLabelText("Land width (m)"), "8");
    userEvent.type(screen.getByLabelText("Land length (m)"), "4");
    userEvent.type(screen.getByLabelText("Plant spacing (m)"), "0.3");
    userEvent.type(screen.getByLabelText("Row spacing (m)"), "0.5");
    userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(createField).toHaveBeenCalledWith("u1", "p1", {
        name: "South plot",
        variety: null,
        shapeType: "rectangle",
        landWidth: 8,
        landLength: 4,
        sowingStructure: "grid",
        plantSpacing: 0.3,
        rowSpacing: 0.5,
      })
    );
    expect(await screen.findByText("South plot")).toBeInTheDocument();
  });

  it("shows a validation error instead of submitting when required fields are missing", async () => {
    getFields.mockResolvedValue([]);

    renderWithProviders(<FieldsSection userId="u1" projectId="p1" />);
    await screen.findByText("No fields yet. Add one to plan a planting layout.");

    userEvent.click(screen.getByRole("button", { name: "Add Field" }));
    userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Please fill in a name and positive spacing values")).toBeInTheDocument();
    expect(createField).not.toHaveBeenCalled();
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
});
