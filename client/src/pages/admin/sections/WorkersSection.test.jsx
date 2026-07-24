import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.jsx";
import { getWorkers, createWorker, updateWorker, deleteWorker } from "../../../services/serverCalls";
import WorkersSection from "./WorkersSection.jsx";

jest.mock("../../../services/serverCalls", () => ({
  getWorkers: jest.fn(),
  createWorker: jest.fn(),
  updateWorker: jest.fn(),
  deleteWorker: jest.fn(),
  extractErrorMessage: jest.fn((err, fallback) => err?.response?.data?.message || fallback),
}));

describe("WorkersSection", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the roster once loaded", async () => {
    getWorkers.mockResolvedValue([{ id: 1, name: "Alice", role: "Picker", hourlyRate: 15 }]);

    renderWithProviders(<WorkersSection />);

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("$15/h")).toBeInTheDocument();
  });

  it("shows a validation message instead of creating a worker with an invalid rate", async () => {
    getWorkers.mockResolvedValue([]);

    renderWithProviders(<WorkersSection />);
    await screen.findByText("No workers yet.");

    userEvent.click(screen.getByRole("button", { name: "New worker" }));
    userEvent.type(screen.getByLabelText("Name"), "Bob");
    userEvent.type(screen.getByLabelText("Hourly rate"), "-5");
    userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Please fill in a name and a non-negative rate")).toBeInTheDocument();
    expect(createWorker).not.toHaveBeenCalled();
  });

  it("creates a new worker and inserts it into the sorted roster", async () => {
    getWorkers.mockResolvedValue([]);
    createWorker.mockResolvedValue({ id: 2, name: "Bob", role: "Packer", hourlyRate: 18 });

    renderWithProviders(<WorkersSection />);
    await screen.findByText("No workers yet.");

    userEvent.click(screen.getByRole("button", { name: "New worker" }));
    userEvent.type(screen.getByLabelText("Name"), "Bob");
    userEvent.type(screen.getByLabelText("Hourly rate"), "18");
    userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(createWorker).toHaveBeenCalledWith({ name: "Bob", role: null, hourlyRate: 18 });
  });

  it("edits an existing worker", async () => {
    getWorkers.mockResolvedValue([{ id: 1, name: "Alice", role: "Picker", hourlyRate: 15 }]);
    updateWorker.mockResolvedValue(true);

    renderWithProviders(<WorkersSection />);
    await screen.findByText("Alice");

    userEvent.click(document.querySelector('[data-testid="EditIcon"]').closest("button"));
    const nameInput = screen.getByLabelText("Name");
    userEvent.clear(nameInput);
    userEvent.type(nameInput, "Alicia");
    userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateWorker).toHaveBeenCalledWith(1, { name: "Alicia", role: "Picker", hourlyRate: 15 }));
  });

  it("keeps the worker in the roster when the delete request fails (e.g. logged hours block it)", async () => {
    getWorkers.mockResolvedValue([{ id: 1, name: "Alice", role: "Picker", hourlyRate: 15 }]);
    deleteWorker.mockRejectedValue({ response: { data: { message: "Worker has logged hours" } } });

    renderWithProviders(<WorkersSection />);
    await screen.findByText("Alice");

    userEvent.click(document.querySelector('[data-testid="DeleteIcon"]').closest("button"));
    userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteWorker).toHaveBeenCalledWith(1));
    expect(screen.getByText("Alice")).toBeInTheDocument();
    // let the catch handler's own setDeletingId(null) settle before the test ends
    await waitFor(() => expect(document.querySelector('[data-testid="DeleteIcon"]')).toBeInTheDocument());
  });
});
