import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { fetchCities, getCoords, getTempDataAPI } from "../../services/serverCalls";
import LocationInfo from "./LocationInfo.jsx";

jest.mock("../../services/serverCalls", () => ({
  fetchCities: jest.fn(),
  getCoords: jest.fn(),
  getTempDataAPI: jest.fn(),
}));

// The real chart/carousel pull in chart.js canvas rendering and a
// third-party carousel, neither of which jsdom needs to actually exercise
// here - this test is about LocationInfo's data wiring, not their rendering.
jest.mock("../lineChart/LineChartTemp", () => ({ chartData }) => (
  <div data-testid="chart">{chartData.location.city}</div>
));
jest.mock("react-material-ui-carousel", () => ({ children }) => <div>{children}</div>);

async function selectCity(label) {
  const input = screen.getByPlaceholderText("Search...");
  userEvent.type(input, "Aus");

  const option = await screen.findByRole("option", { name: label });
  userEvent.click(option);
}

describe("LocationInfo", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps 'Get Location Info' disabled until a city is chosen from the search results", async () => {
    fetchCities.mockResolvedValue(["Austin, Texas, UnitedStates"]);

    renderWithProviders(<LocationInfo />);

    expect(screen.getByRole("button", { name: "Get Location Info" })).toBeDisabled();

    await selectCity("Austin, Texas, UnitedStates");

    expect(screen.getByRole("button", { name: "Get Location Info" })).toBeEnabled();
  });

  it("fetches coordinates and temperature data for the selected city, then renders a chart", async () => {
    fetchCities.mockResolvedValue(["Austin, Texas, UnitedStates"]);
    getCoords.mockResolvedValue({ lat: "30.27", lon: "-97.74" });
    getTempDataAPI.mockResolvedValue({
      data: {
        hourly: {
          time: ["2026-07-24T00:00"],
          temperature_2m: [25],
          precipitation: [0],
          vapor_pressure_deficit: [1.2],
        },
      },
    });

    renderWithProviders(<LocationInfo />);
    await selectCity("Austin, Texas, UnitedStates");

    userEvent.click(screen.getByRole("button", { name: "Get Location Info" }));

    await waitFor(() => expect(getCoords).toHaveBeenCalledWith({ city: "Austin", state: "Texas", country: "UnitedStates" }));
    expect(await screen.findByTestId("chart")).toHaveTextContent("Austin");
  });

  it("removes a chart when its 'Delete Chart' button is clicked", async () => {
    fetchCities.mockResolvedValue(["Austin, Texas, UnitedStates"]);
    getCoords.mockResolvedValue({ lat: "30.27", lon: "-97.74" });
    getTempDataAPI.mockResolvedValue({
      data: { hourly: { time: [], temperature_2m: [], precipitation: [], vapor_pressure_deficit: [] } },
    });

    renderWithProviders(<LocationInfo />);
    await selectCity("Austin, Texas, UnitedStates");
    userEvent.click(screen.getByRole("button", { name: "Get Location Info" }));

    await screen.findByTestId("chart");
    userEvent.click(screen.getByRole("button", { name: "Delete Chart" }));

    await waitFor(() => expect(screen.queryByTestId("chart")).not.toBeInTheDocument());
  });
});
