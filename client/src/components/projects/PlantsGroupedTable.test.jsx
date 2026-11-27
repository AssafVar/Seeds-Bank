import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { foundersLine, line, plant, population } from "../../test-utils/pedigreeFixtures.js";
import PlantsGroupedTable from "./PlantsGroupedTable.jsx";

jest.mock("../../services/serverCalls.js", () => require("../../test-utils/serverCallsMock").mockServerCalls([]));

const baseProps = (over = {}) => ({
  lines: [],
  counts: { total: 0, byLine: {}, byPopulation: {} },
  searching: false,
  expandedLineIds: new Set(),
  expandedPopulationIds: new Set(),
  plantsByPopulation: {},
  pageSize: 25,
  onToggleLine: jest.fn(),
  onTogglePopulation: jest.fn(),
  onGoToPage: jest.fn(),
  onPageSize: jest.fn(),
  onAction: jest.fn(),
  onSaveTrait: jest.fn(),
  ...over,
});

const open = (lines, plants = {}) =>
  baseProps({
    lines,
    expandedLineIds: new Set(lines.map((l) => l.id)),
    expandedPopulationIds: new Set(lines.flatMap((l) => l.populations.map((p) => p.id))),
    plantsByPopulation: plants,
  });

describe("PlantsGroupedTable", () => {
  it.each([
    [{ stabilityState: "stable", isStable: true }, "Stable"],
    [{ stabilityState: "looksStable", looksStable: true }, "Looks stable"],
    [{ stabilityState: "segregating" }, "Segregating"],
  ])("shows the %j status chip with text", (state, text) => {
    renderWithProviders(<PlantsGroupedTable {...baseProps({ lines: [line(state)] })} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("shows no status chip when the line has too few generations", () => {
    renderWithProviders(<PlantsGroupedTable {...baseProps({ lines: [line({ stabilityState: "none" })] })} />);

    ["Stable", "Looks stable", "Segregating"].forEach((t) => expect(screen.queryByText(t)).not.toBeInTheDocument());
  });

  it("renders line, population and plant rows with headings and a Parent removed chip", () => {
    const orphan = plant({ plantId: "o", tag: "RA-F3-009", mother: { plantId: null, tag: "GONE", removed: true } });
    const ok = plant({ plantId: "k", tag: "RA-F3-001" });
    renderWithProviders(<PlantsGroupedTable {...open([line(), foundersLine()], { 10: { items: [ok, orphan], page: 1, totalCount: 2, status: "ready" } })} />);

    expect(screen.getByRole("heading", { level: 3, name: "Roma-A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Spring 2026 · North field" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /RA-F3-001/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parent removed, edit parents" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mother RA-F2-004, opens plant" })).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Roma-A", "Founders"]);
  });

  it("gives the chevron aria-expanded and labels the kebab with the plant tag", () => {
    const props = open([line()], { 10: { items: [plant()], page: 1, totalCount: 1, status: "ready" } });
    renderWithProviders(<PlantsGroupedTable {...props} />);

    expect(screen.getByRole("button", { name: /^Collapse Roma-A/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Plant actions for RA-F3-001" })).toBeInTheDocument();
  });

  it("shows 'No plants yet', and Delete empty population, for a population with 0 plants", () => {
    const empty = population({ id: 11, plantCount: 0, label: null, name: "Autumn 2026" });
    const props = open([line({ plantCount: 0, populations: [empty] })], { 11: { items: [], page: 1, totalCount: 0, status: "ready" } });
    renderWithProviders(<PlantsGroupedTable {...props} />);

    expect(screen.getByText("No plants yet.")).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Population actions for Autumn 2026" }));
    userEvent.click(screen.getByRole("menuitem", { name: "Delete empty population" }));
    expect(props.onAction).toHaveBeenCalledWith(expect.objectContaining({ type: "delete-population" }));
  });

  it("offers Add plant to this line on an empty line and no Continue item for Founders", () => {
    const props = baseProps({ lines: [line({ plantCount: 0, populations: [] }), foundersLine()] });
    renderWithProviders(<PlantsGroupedTable {...props} />);

    expect(screen.getByRole("button", { name: "Add plant to this line" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Line actions for Founders" })).not.toBeInTheDocument();
  });

  it("limits populations to 5 with a 'Show k older populations' button", () => {
    const pops = Array.from({ length: 7 }, (_, i) => population({ id: 100 + i, name: `Pop ${i}`, plantCount: 1 }));
    renderWithProviders(<PlantsGroupedTable {...open([line({ populations: pops })])} />);

    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(5);
    userEvent.click(screen.getByRole("button", { name: "Show 2 older populations" }));
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(7);
  });

  it("pages a big population with TablePagination", () => {
    const props = open([line({ plantCount: 60, populations: [population({ plantCount: 60 })] })], {
      10: { items: [plant()], page: 1, totalCount: 60, status: "ready" },
    });
    renderWithProviders(<PlantsGroupedTable {...props} />);

    userEvent.click(screen.getByRole("button", { name: /next page/i }));

    expect(props.onGoToPage).toHaveBeenCalledWith(10, 2);
  });

  it("shows a retry for a population that failed to load", () => {
    const props = open([line()], { 10: { items: [], page: 1, totalCount: 0, status: "error" } });
    renderWithProviders(<PlantsGroupedTable {...props} />);

    userEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Retry" }));

    expect(props.onGoToPage).toHaveBeenCalledWith(10, 1);
  });
});
