const mockApi = {
  get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(),
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
};
jest.mock("axios", () => ({ __esModule: true, default: { create: () => mockApi, get: jest.fn() } }));
jest.mock("nanoid", () => ({ nanoid: () => "id" }));

const calls = require("./serverCalls");

const base = "/projects/u%2F1/p%201";
beforeEach(() => {
  Object.values(mockApi).forEach((f) => typeof f?.mockReset === "function" && f.mockReset());
  mockApi.get.mockResolvedValue({ data: { ok: true } });
  mockApi.post.mockResolvedValue({ data: { ok: true } });
  mockApi.put.mockResolvedValue({ data: { ok: true } });
  mockApi.delete.mockResolvedValue({ data: { ok: true } });
});

describe("breeding serverCalls", () => {
  it("getProjectOverview encodes the path ids and returns data", async () => {
    await expect(calls.getProjectOverview("u/1", "p 1")).resolves.toEqual({ ok: true });
    expect(mockApi.get).toHaveBeenCalledWith(base);
  });

  it("getPlants sends filters as params and drops empty values", async () => {
    await calls.getPlants("u/1", "p 1", { lineId: 3, q: "", parentId: undefined, populationId: 4, page: 2, pageSize: 25 });
    expect(mockApi.get).toHaveBeenCalledWith(`${base}/plants`, { params: { lineId: 3, populationId: 4, page: 2, pageSize: 25 } });
  });

  it("keeps hostile q out of the URL", async () => {
    await calls.getPlants("u", "p", { q: "a&lineId=9#x" });
    expect(mockApi.get.mock.calls[0][0]).toBe("/projects/u/p/plants");
    expect(mockApi.get.mock.calls[0][1].params.q).toBe("a&lineId=9#x");
  });

  it("counts, get, preview use the right routes", async () => {
    await calls.getPlantCounts("u", "p", { q: "x", latestOnly: true });
    expect(mockApi.get).toHaveBeenLastCalledWith("/projects/u/p/plants/counts", { params: { q: "x", latestOnly: true } });
    await calls.getPlant("u", "p", "a/b");
    expect(mockApi.get).toHaveBeenLastCalledWith("/projects/u/p/plants/a%2Fb");
    await calls.previewPlacement("u", "p", { motherPlantId: "m", year: 2026 });
    expect(mockApi.get).toHaveBeenLastCalledWith("/projects/u/p/plants/preview", { params: { motherPlantId: "m", year: 2026 } });
  });

  it("writes use the right verb, route and body", async () => {
    await calls.createPlants("u", "p", { count: 1 });
    expect(mockApi.post).toHaveBeenLastCalledWith("/projects/u/p/plants", { count: 1 });
    await calls.updatePlantTraits("u", "p", "x y", { version: 1 });
    expect(mockApi.put).toHaveBeenLastCalledWith("/projects/u/p/plants/x%20y", { version: 1 });
    await calls.updatePlantParents("u", "p", "x", { version: 1 });
    expect(mockApi.put).toHaveBeenLastCalledWith("/projects/u/p/plants/x/parents", { version: 1 });
    await calls.createLine("u", "p", { name: "A" });
    expect(mockApi.post).toHaveBeenLastCalledWith("/projects/u/p/lines", { name: "A" });
    await calls.renameLine("u", "p", 3, { newName: "B" });
    expect(mockApi.post).toHaveBeenLastCalledWith("/projects/u/p/lines/3/rename", { newName: "B" });
    await calls.setLineStable("u", "p", 3, true);
    expect(mockApi.put).toHaveBeenLastCalledWith("/projects/u/p/lines/3/stable", { isStable: true });
    await calls.createPopulation("u", "p", { lineId: 1 });
    expect(mockApi.post).toHaveBeenLastCalledWith("/projects/u/p/populations", { lineId: 1 });
  });

  it("deletes pass confirm only when asked", async () => {
    await calls.deleteProjectPlant("u", "p", "x");
    expect(mockApi.delete).toHaveBeenLastCalledWith("/projects/u/p/plants/x", { params: undefined });
    await calls.deleteProjectPlant("u", "p", "x", true);
    expect(mockApi.delete).toHaveBeenLastCalledWith("/projects/u/p/plants/x", { params: { confirm: true } });
    await calls.deleteLine("u", "p", 3);
    expect(mockApi.delete).toHaveBeenLastCalledWith("/projects/u/p/lines/3");
    await calls.deletePopulation("u", "p", 4);
    expect(mockApi.delete).toHaveBeenLastCalledWith("/projects/u/p/populations/4");
  });

  it.each([
    ["getProjectOverview", ["u", "p"], "get"],
    ["getPlants", ["u", "p"], "get"],
    ["createPlants", ["u", "p", {}], "post"],
    ["updatePlantParents", ["u", "p", "x", {}], "put"],
    ["deleteProjectPlant", ["u", "p", "x"], "delete"],
    ["createLine", ["u", "p", {}], "post"],
    ["renameLine", ["u", "p", 1, {}], "post"],
    ["deleteLine", ["u", "p", 1], "delete"],
    ["createPopulation", ["u", "p", {}], "post"],
    ["deletePopulation", ["u", "p", 1], "delete"],
  ])("%s rethrows errors and does not log", async (name, args, verb) => {
    const err = { response: { status: 409, data: { message: "m", code: "has_children" } } };
    mockApi[verb].mockRejectedValue(err);
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    await expect(calls[name](...args)).rejects.toBe(err);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
