import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import useProjectPedigree, { parseFilterParams } from "./useProjectPedigree";
import * as api from "../services/serverCalls";

jest.mock("../services/serverCalls", () => {
  const names = [
    "createLine", "createPlants", "createPopulation", "deleteLine", "deletePopulation", "deleteProjectPlant",
    "getPlantCounts", "getPlants", "getProjectOverview", "renameLine", "setLineStable", "updatePlantParents", "updatePlantTraits",
  ];
  return Object.fromEntries(names.map((n) => [n, jest.fn()]));
});

const line = (over = {}) => ({ id: 1, name: "Roma-A", isFounders: false, populations: [{ id: 10 }], ...over });
const plant = (over = {}) => ({
  plantId: "p1", tag: "RA-1", populationId: 10, lineId: 1, label: "F2", version: 1,
  mother: { plantId: "m", tag: "M", removed: false }, father: { plantId: "f", tag: "F", removed: false }, ...over,
});
const page = (items, over = {}) => ({ items, page: 1, pageSize: 25, totalCount: items.length, ...over });

const setup = (route = "/") => {
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
  return renderHook(() => useProjectPedigree({ userId: "u1", projectId: "pr1", pageSize: 25 }), { wrapper });
};

beforeEach(() => {
  jest.resetAllMocks();
  api.getProjectOverview.mockResolvedValue({ projectHeaders: { projectName: "P" }, lines: [line()] });
  api.getPlantCounts.mockResolvedValue({ total: 3, lines: [{ lineId: 1, count: 3 }], populations: [{ populationId: 10, count: 3 }] });
  api.getPlants.mockResolvedValue(page([plant()]));
});

describe("parseFilterParams", () => {
  it.each([["line=abc"], ["line=1;drop"], ["line=-3"], ["line=0"], ["line=1.5"], ["line=99999999999"]])(
    "ignores a bad line (%s)",
    (qs) => expect(parseFilterParams(new URLSearchParams(qs)).lineId).toBeNull()
  );
  it("accepts a positive integer and latest=1 only", () => {
    expect(parseFilterParams(new URLSearchParams("line=7&latest=1"))).toEqual({ lineId: 7, latestOnly: true });
    expect(parseFilterParams(new URLSearchParams("latest=2")).latestOnly).toBe(false);
    expect(parseFilterParams(new URLSearchParams("latest=true")).latestOnly).toBe(false);
  });
});

describe("useProjectPedigree", () => {
  it("loads the overview and counts", async () => {
    const { result } = setup();
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.headers).toEqual({ projectName: "P" });
    await waitFor(() => expect(result.current.counts.total).toBe(3));
    expect(result.current.counts.byPopulation[10]).toBe(3);
  });

  it.each([[403], [404]])("maps %i to a no-access state without the body", async (code) => {
    api.getProjectOverview.mockRejectedValue({ response: { status: code, data: { message: "secret detail" } } });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.loadError).toEqual({ kind: "no-access", status: code });
    expect(JSON.stringify(result.current.loadError)).not.toContain("secret");
  });

  it("shows a generic failed state for a network error", async () => {
    api.getProjectOverview.mockRejectedValue(new Error("boom"));
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.loadError.kind).toBe("failed");
  });

  it("handles an empty project", async () => {
    api.getProjectOverview.mockResolvedValue({ projectHeaders: {}, lines: [] });
    api.getPlantCounts.mockResolvedValue({ total: 0, lines: [], populations: [] });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.lines).toEqual([]);
  });

  it("reads filters from the URL and sends them as params", async () => {
    const { result } = setup("/?line=1&latest=1");
    await waitFor(() => expect(api.getPlantCounts).toHaveBeenCalled());
    expect(result.current.filters).toMatchObject({ lineId: 1, latestOnly: true });
    expect(api.getPlantCounts).toHaveBeenCalledWith("u1", "pr1", { q: "", lineId: 1, latestOnly: true });
  });

  it("ignores hostile URL params", async () => {
    const { result } = setup("/?line=abc&latest=2");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.filters).toMatchObject({ lineId: null, latestOnly: false });
  });

  it("syncs filter changes to the URL state and refetches counts", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.counts.total).toBe(3));
    act(() => result.current.setLineFilter(1));
    act(() => result.current.setLatestOnly(true));
    await waitFor(() => expect(result.current.filters).toMatchObject({ lineId: 1, latestOnly: true }));
    await waitFor(() =>
      expect(api.getPlantCounts).toHaveBeenLastCalledWith("u1", "pr1", { q: "", lineId: 1, latestOnly: true })
    );
    act(() => result.current.clearFilters());
    await waitFor(() => expect(result.current.filters).toMatchObject({ lineId: null, latestOnly: false }));
  });

  it("debounces search, caps q at 100 chars and auto-expands matching populations", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.counts.total).toBe(3));
    api.getPlantCounts.mockClear();
    act(() => result.current.setSearchText("ro"));
    act(() => result.current.setSearchText("rom"));
    expect(api.getPlantCounts).not.toHaveBeenCalled();
    await waitFor(() => expect(api.getPlantCounts).toHaveBeenCalledTimes(1));
    expect(api.getPlantCounts).toHaveBeenCalledWith("u1", "pr1", { q: "rom", lineId: null, latestOnly: undefined });
    await waitFor(() => expect(result.current.expandedPopulationIds.has(10)).toBe(true));
    await waitFor(() => expect(api.getPlants).toHaveBeenCalledWith("u1", "pr1", expect.objectContaining({ populationId: 10, q: "rom" })));
    act(() => result.current.setSearchText("x".repeat(150)));
    expect(result.current.filters.q).toHaveLength(100);
  });

  it("expands a population, loads page 1 and collapses again", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.togglePopulation(10));
    expect(result.current.expandedPopulationIds.has(10)).toBe(true);
    await waitFor(() => expect(result.current.plantsByPopulation[10]?.status).toBe("ready"));
    expect(api.getPlants).toHaveBeenCalledWith("u1", "pr1", { populationId: 10, q: "", page: 1, pageSize: 25 });
    act(() => result.current.togglePopulation(10));
    expect(result.current.expandedPopulationIds.has(10)).toBe(false);
  });

  it("toggles line expansion", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.toggleLine(1));
    expect(result.current.expandedLineIds.has(1)).toBe(true);
    act(() => result.current.toggleLine(1));
    expect(result.current.expandedLineIds.has(1)).toBe(false);
  });

  it("goToPage replaces and loadMore appends items", async () => {
    api.getPlants
      .mockResolvedValueOnce(page([plant()], { totalCount: 3 }))
      .mockResolvedValueOnce(page([plant({ plantId: "p2", tag: "RA-2" })], { page: 2, totalCount: 3 }))
      .mockResolvedValueOnce(page([plant({ plantId: "p3", tag: "RA-3" })], { page: 3, totalCount: 3 }));
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.togglePopulation(10));
    await waitFor(() => expect(result.current.plantsByPopulation[10]?.status).toBe("ready"));
    await act(() => result.current.loadMore(10));
    expect(result.current.plantsByPopulation[10].items.map((i) => i.tag)).toEqual(["RA-1", "RA-2"]);
    await act(() => result.current.goToPage(10, 3));
    expect(result.current.plantsByPopulation[10].items.map((i) => i.tag)).toEqual(["RA-3"]);
  });

  it("marks a population page as error when the load fails", async () => {
    api.getPlants.mockRejectedValue(new Error("x"));
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.togglePopulation(10));
    await waitFor(() => expect(result.current.plantsByPopulation[10]?.status).toBe("error"));
  });

  it("create refreshes overview and counts, reloads page 1 of the touched population, and undo deletes the plant", async () => {
    const created = plant({ plantId: "new", tag: "RA-9", populationId: 11 });
    api.createPlants.mockResolvedValue({ plants: [created], line: line({ plantCount: 1 }) });
    api.deleteProjectPlant.mockResolvedValue({ childrenAffected: 0 });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    api.getProjectOverview.mockClear();
    api.getPlantCounts.mockClear();
    api.getPlants.mockClear();
    await act(() => result.current.createPlants({ count: 1 }));
    expect(api.createPlants).toHaveBeenCalledWith("u1", "pr1", { count: 1 });
    expect(api.getProjectOverview).toHaveBeenCalledTimes(1);
    expect(api.getPlantCounts).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.getPlants).toHaveBeenCalledWith("u1", "pr1", expect.objectContaining({ populationId: 11, page: 1 })));
    expect(result.current.expandedPopulationIds.has(11)).toBe(true);
    expect(result.current.undo.label).toBe("Added RA-9.");
    await act(() => result.current.runUndo());
    expect(api.deleteProjectPlant).toHaveBeenCalledWith("u1", "pr1", "new");
    expect(result.current.undo).toBeNull();
  });

  it("rethrows a 400 from create so the caller can show the message", async () => {
    const err = { response: { status: 400, data: { message: "bad", field: "motherPlantId", code: "x" } } };
    api.createPlants.mockRejectedValue(err);
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await expect(act(() => result.current.createPlants({}))).rejects.toBe(err);
    expect(result.current.undo).toBeNull();
  });

  it("edits parents: refreshes, reloads old and new populations, builds the previous-label message, undo restores old parents", async () => {
    const before = plant({ populationId: 10, version: 4 });
    const after = plant({ populationId: 12, label: "F3", version: 5 });
    api.updatePlantParents.mockResolvedValue({ plant: after, previousLabel: "F2", previousLineId: 1, previousPopulationId: 10, descendantCount: 0, line: line() });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.togglePopulation(10));
    act(() => result.current.togglePopulation(12));
    api.getPlants.mockClear();
    api.getProjectOverview.mockClear();
    await act(() => result.current.updateParents(before, { motherPlantId: "a", fatherPlantId: "b", startNewLine: false, version: 4 }));
    expect(api.getProjectOverview).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.getPlants).toHaveBeenCalledTimes(2));
    expect(result.current.undo.label).toBe("RA-1 is now F3 (was F2).");
    await act(() => result.current.runUndo());
    expect(api.updatePlantParents).toHaveBeenLastCalledWith("u1", "pr1", "p1", {
      motherPlantId: "m", fatherPlantId: "f", lineId: 1, startNewLine: false, version: 5,
    });
  });

  it("offers no parents undo when an old parent was removed", async () => {
    const before = plant({ mother: { plantId: null, tag: "gone", removed: true } });
    api.updatePlantParents.mockResolvedValue({ plant: plant({ version: 2 }), previousLabel: "F2", previousLineId: 1, line: line() });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(() => result.current.updateParents(before, { version: 1 }));
    expect(result.current.undo).toBeNull();
  });

  it("on a 409 for traits reloads the population page and rethrows", async () => {
    const err = { response: { status: 409, data: { message: "changed elsewhere" } } };
    api.updatePlantTraits.mockRejectedValue(err);
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    api.getPlants.mockClear();
    await expect(act(() => result.current.updateTraits("p1", 10, { version: 1 }))).rejects.toBe(err);
    await waitFor(() => expect(api.getPlants).toHaveBeenCalledWith("u1", "pr1", expect.objectContaining({ populationId: 10 })));
  });

  it("replaces the plant after a trait edit and refetches the overview", async () => {
    const updated = plant({ fruitColor: "red", version: 2 });
    api.updatePlantTraits.mockResolvedValue(updated);
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.togglePopulation(10));
    await waitFor(() => expect(result.current.plantsByPopulation[10]?.status).toBe("ready"));
    act(() => result.current.setDraft("p1", { fruitColor: "red" }));
    expect(result.current.drafts.p1).toEqual({ fruitColor: "red" });
    api.getProjectOverview.mockClear();
    await act(() => result.current.updateTraits("p1", 10, { fruitColor: "red", version: 1 }));
    expect(result.current.plantsByPopulation[10].items[0].fruitColor).toBe("red");
    expect(result.current.drafts.p1).toBeUndefined();
    expect(api.getProjectOverview).toHaveBeenCalledTimes(1);
  });

  it("delete reloads every expanded population", async () => {
    api.deleteProjectPlant.mockResolvedValue({ childrenAffected: 2 });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.togglePopulation(10));
    act(() => result.current.togglePopulation(11));
    api.getPlants.mockClear();
    api.getProjectOverview.mockClear();
    await act(() => result.current.deletePlant("p1", true));
    expect(api.deleteProjectPlant).toHaveBeenCalledWith("u1", "pr1", "p1", true);
    expect(api.getProjectOverview).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.getPlants).toHaveBeenCalledTimes(2));
    expect(result.current.undo).toBeNull();
  });

  it("rename patches both lines and undo deletes the new line", async () => {
    api.renameLine.mockResolvedValue({ oldLine: line({ successorLineId: 2 }), newLine: line({ id: 2, name: "Roma-Classic" }) });
    api.deleteLine.mockResolvedValue();
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(() => result.current.renameLine(1, { newName: "Roma-Classic" }));
    expect(result.current.lines.map((l) => l.name)).toEqual(["Roma-A", "Roma-Classic"]);
    expect(result.current.lines[0].successorLineId).toBe(2);
    expect(result.current.undo.label).toBe("Created Roma-Classic from Roma-A.");
    await act(() => result.current.runUndo());
    expect(api.deleteLine).toHaveBeenCalledWith("u1", "pr1", 2);
  });

  it("mark stable patches the line and undo toggles back; undo items queue", async () => {
    api.setLineStable.mockResolvedValueOnce(line({ isStable: true })).mockResolvedValueOnce(line({ isStable: false }));
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(() => result.current.markStable(1, true));
    expect(result.current.lines[0].isStable).toBe(true);
    api.setLineStable.mockResolvedValueOnce(line({ isStable: false }));
    await act(() => result.current.markStable(1, false));
    expect(result.current.undo.label).toBe("Roma-A marked stable.");
    await act(() => result.current.runUndo());
    expect(api.setLineStable).toHaveBeenCalledWith("u1", "pr1", 1, false);
    expect(result.current.undo.label).toBe("Roma-A marked not stable.");
    act(() => result.current.dismissUndo());
    expect(result.current.undo).toBeNull();
  });

  it("create line, create population and delete population refresh the overview", async () => {
    api.createLine.mockResolvedValue(line({ id: 5, name: "New" }));
    api.createPopulation.mockResolvedValue({ id: 30 });
    api.deletePopulation.mockResolvedValue();
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    api.getProjectOverview.mockClear();
    api.getProjectOverview.mockResolvedValue({ projectHeaders: {}, lines: [line(), line({ id: 5, name: "New" })] });
    await act(() => result.current.createLine({ name: "New" }));
    expect(result.current.lines.some((l) => l.id === 5)).toBe(true);
    await act(() => result.current.createPopulation({ lineId: 1, season: "Spring", year: 2026 }));
    await act(() => result.current.deletePopulation(30));
    expect(api.deletePopulation).toHaveBeenCalledWith("u1", "pr1", 30);
    expect(api.getProjectOverview.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("prefers previousMotherPlantId and previousFatherPlantId for the parents undo", async () => {
    api.updatePlantParents.mockResolvedValue({
      plant: plant({ label: "F3", version: 2 }), previousLabel: "F2", previousLineId: 1,
      previousMotherPlantId: "old-m", previousFatherPlantId: "old-f", line: line(),
    });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(() => result.current.updateParents(plant({ mother: { plantId: null, tag: "gone", removed: true } }), { version: 1 }));
    await act(() => result.current.runUndo());
    expect(api.updatePlantParents).toHaveBeenLastCalledWith("u1", "pr1", "p1", expect.objectContaining({ motherPlantId: "old-m", fatherPlantId: "old-f", version: 2 }));
  });

  it("offers undo for a new empty line that deletes it again", async () => {
    api.createLine.mockResolvedValue(line({ id: 7, name: "Fresh" }));
    api.deleteLine.mockResolvedValue();
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(() => result.current.createLine({ name: "Fresh" }));
    expect(result.current.undo.label).toBe("Created Fresh.");
    await act(() => result.current.runUndo());
    expect(api.deleteLine).toHaveBeenCalledWith("u1", "pr1", 7);
  });

  it("expandAll opens the given lines and loads their populations that have plants, collapseAll closes them", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    api.getPlants.mockClear();
    act(() => result.current.expandAll([line({ populations: [{ id: 10, plantCount: 2 }, { id: 11, plantCount: 0 }] })]));
    expect(result.current.expandedLineIds.has(1)).toBe(true);
    expect(result.current.expandedPopulationIds.has(10)).toBe(true);
    expect(result.current.expandedPopulationIds.has(11)).toBe(false);
    await waitFor(() => expect(api.getPlants).toHaveBeenCalledTimes(1));
    act(() => result.current.collapseAll());
    expect(result.current.expandedLineIds.size).toBe(0);
  });

  it("retry loads the overview again after a failure", async () => {
    api.getProjectOverview.mockRejectedValueOnce(new Error("offline"));
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("error"));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("does not log to the console", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    api.getPlants.mockRejectedValue({ response: { status: 500, data: { message: "body" } } });
    const { result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    act(() => result.current.togglePopulation(10));
    await waitFor(() => expect(result.current.plantsByPopulation[10]?.status).toBe("error"));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
