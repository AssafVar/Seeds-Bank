import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.jsx";
import {
  getVegetableVarieties,
  createVegetableVariety,
  updateVegetableVariety,
  deleteVegetableVariety,
} from "../../../services/serverCalls";
import VarietiesSection from "./VarietiesSection.jsx";

jest.mock("../../../services/serverCalls", () => ({
  getVegetableVarieties: jest.fn(),
  createVegetableVariety: jest.fn(),
  updateVegetableVariety: jest.fn(),
  deleteVegetableVariety: jest.fn(),
}));

const variety = {
  id: 1,
  name: "Cherry Tomato",
  plantSpacing: 0.3,
  rowSpacing: 0.5,
  waterMmPerSeason: 400,
  fertilizerKgPer100m2: 3,
  seedBufferPercent: 0.15,
  seedUnit: "seeds",
};

describe("VarietiesSection", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the varieties list once loaded", async () => {
    getVegetableVarieties.mockResolvedValue([variety]);

    renderWithProviders(<VarietiesSection />);

    expect(await screen.findByText("Cherry Tomato")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();
  });

  it("shows a validation message instead of creating a variety with a negative number", async () => {
    getVegetableVarieties.mockResolvedValue([]);

    renderWithProviders(<VarietiesSection />);
    await screen.findByText("No varieties yet.");

    userEvent.click(screen.getByRole("button", { name: "New variety" }));
    userEvent.type(screen.getByLabelText("Name"), "Bell Pepper");
    userEvent.type(screen.getByLabelText("Plant spacing (m)"), "-1");
    userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Please fill in a name and non-negative numbers")).toBeInTheDocument();
    expect(createVegetableVariety).not.toHaveBeenCalled();
  });

  it("creates a new variety with the seed buffer converted from a percentage", async () => {
    getVegetableVarieties.mockResolvedValue([]);
    createVegetableVariety.mockResolvedValue({ ...variety, id: 2, name: "Bell Pepper" });

    renderWithProviders(<VarietiesSection />);
    await screen.findByText("No varieties yet.");

    userEvent.click(screen.getByRole("button", { name: "New variety" }));
    userEvent.type(screen.getByLabelText("Name"), "Bell Pepper");
    userEvent.type(screen.getByLabelText("Plant spacing (m)"), "0.4");
    userEvent.type(screen.getByLabelText("Row spacing (m)"), "0.6");
    userEvent.type(screen.getByLabelText("Water (mm/season)"), "350");
    userEvent.type(screen.getByLabelText("Fertilizer (kg/100m²)"), "2");
    userEvent.type(screen.getByLabelText("Seed buffer (%)"), "10");
    userEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(createVegetableVariety).toHaveBeenCalledWith({
        name: "Bell Pepper",
        plantSpacing: 0.4,
        rowSpacing: 0.6,
        waterMmPerSeason: 350,
        fertilizerKgPer100m2: 2,
        seedBufferPercent: 0.1,
        seedUnit: "seeds",
      })
    );
    expect(await screen.findByText("Bell Pepper")).toBeInTheDocument();
  });

  it("prefills the edit form with the existing variety's values", async () => {
    getVegetableVarieties.mockResolvedValue([variety]);

    renderWithProviders(<VarietiesSection />);
    await screen.findByText("Cherry Tomato");

    userEvent.click(document.querySelector('[data-testid="EditIcon"]').closest("button"));

    expect(screen.getByLabelText("Name")).toHaveValue("Cherry Tomato");
    expect(screen.getByLabelText("Seed buffer (%)")).toHaveValue(15);
  });

  it("removes a variety once deleted", async () => {
    getVegetableVarieties.mockResolvedValue([variety]);
    deleteVegetableVariety.mockResolvedValue(true);

    renderWithProviders(<VarietiesSection />);
    await screen.findByText("Cherry Tomato");

    userEvent.click(document.querySelector('[data-testid="DeleteIcon"]').closest("button"));
    userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Cherry Tomato")).not.toBeInTheDocument());
    expect(deleteVegetableVariety).toHaveBeenCalledWith(1);
  });
});
