import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { fetchCities } from "../../services/serverCalls";
import ClimatePage from "./ClimatePage.jsx";

jest.mock("../../services/serverCalls", () => ({
  fetchCities: jest.fn().mockResolvedValue([]),
  getCoords: jest.fn(),
  getTempDataAPI: jest.fn(),
}));

describe("ClimatePage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the page headline and the location search UI", async () => {
    renderWithProviders(<ClimatePage />);

    expect(screen.getByText("Climate")).toBeInTheDocument();
    expect(screen.getByText("Search a location to explore its climate")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();

    // SearchCities fetches its initial (empty-query) options on mount -
    // wait for that to settle so it doesn't leak an unawaited act() warning.
    await waitFor(() => expect(fetchCities).toHaveBeenCalled());
  });

  it("disables 'Get Location Info' until a city has been selected", async () => {
    renderWithProviders(<ClimatePage />);

    expect(screen.getByRole("button", { name: "Get Location Info" })).toBeDisabled();

    await waitFor(() => expect(fetchCities).toHaveBeenCalled());
  });
});
