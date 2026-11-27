import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { line, plant, population } from "../../test-utils/pedigreeFixtures.js";
import PlantsGroupedList from "./PlantsGroupedList.jsx";

jest.mock("../../services/serverCalls.js", () => require("../../test-utils/serverCallsMock").mockServerCalls([]));

const props = (items, totalCount, over = {}) => ({
  lines: [line({ plantCount: totalCount, populations: [population({ plantCount: totalCount })] })],
  counts: { total: totalCount, byLine: {}, byPopulation: {} },
  searching: false,
  expandedLineIds: new Set([1]),
  expandedPopulationIds: new Set([10]),
  plantsByPopulation: { 10: { items, page: 1, totalCount, status: "ready" } },
  pageSize: 20,
  onToggleLine: jest.fn(),
  onTogglePopulation: jest.fn(),
  onGoToPage: jest.fn(),
  onLoadMore: jest.fn(),
  onAction: jest.fn(),
  ...over,
});

const many = (n) => Array.from({ length: n }, (_, i) => plant({ plantId: `p${i}`, tag: `RA-${i}` }));

describe("PlantsGroupedList (phone)", () => {
  it("shows cards, 'Showing 20 of 134' and 'Show 20 more'", () => {
    const p = props(many(20), 134);
    renderWithProviders(<PlantsGroupedList {...p} />);

    expect(screen.getAllByRole("button", { name: /^Plant actions for/ })).toHaveLength(20);
    expect(screen.getByText("Showing 20 of 134")).toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "Show 20 more" }));
    expect(p.onLoadMore).toHaveBeenCalledWith(10);
  });

  it("shows no 'Show more' when every plant is loaded", () => {
    renderWithProviders(<PlantsGroupedList {...props(many(3), 3)} />);

    expect(screen.queryByRole("button", { name: /Show \d+ more/ })).not.toBeInTheDocument();
  });

  it("opens the plant when the card is tapped, and the parent without opening the plant", () => {
    const p = props([plant()], 1);
    renderWithProviders(<PlantsGroupedList {...p} />);

    userEvent.click(screen.getByRole("button", { name: "Mother RA-F2-004, opens plant" }));
    expect(p.onAction).toHaveBeenCalledWith({ type: "open-parent", parentId: "pl-m" });
    expect(p.onAction).not.toHaveBeenCalledWith(expect.objectContaining({ type: "open-plant" }));

    userEvent.click(screen.getByText("Red · 88 g · Tan · 3.1 mg"));
    expect(p.onAction).toHaveBeenCalledWith(expect.objectContaining({ type: "open-plant" }));
  });

  it("shows 'No parents' for a founder and a Parent removed chip for an orphan", () => {
    const founder = plant({ plantId: "f", tag: "FD-1", mother: null, father: null, fruitColor: null, fruitWeight: null, seedColor: null, seedWeight: null });
    const orphan = plant({ plantId: "o", tag: "RA-9", mother: { plantId: null, tag: "X", removed: true } });
    renderWithProviders(<PlantsGroupedList {...props([founder, orphan], 2)} />);

    expect(screen.getByText("No parents")).toBeInTheDocument();
    expect(screen.getByText("— · — · — · —")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Parent removed, edit parents" })).toBeInTheDocument();
  });

  it("uses an h3 per line, an h4 per population and 44px tap targets for chevrons and kebabs", () => {
    renderWithProviders(<PlantsGroupedList {...props([plant()], 1)} />);

    expect(screen.getByRole("heading", { level: 3, name: "Roma-A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Collapse Roma-A/ })).toHaveAttribute("aria-expanded", "true");
  });
});
