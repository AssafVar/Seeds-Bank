import { currentSeasonAndYear, errorInfo, suggestLineName, lineChips, orderLines, originText, traitSummary, visibleLines } from "./pedigree";
import { foundersLine, line, population } from "../test-utils/pedigreeFixtures";

jest.mock("../services/serverCalls", () => ({
  extractErrorMessage: (err, fallback) => err?.response?.data?.message ?? fallback,
}));

describe("visibleLines", () => {
  const roma = line({ id: 1, name: "Roma-A", populations: [population({ id: 10, isLatestGeneration: true }), population({ id: 11, isLatestGeneration: false, label: "F2" })] });
  const cherry = line({ id: 2, name: "Cherry", populations: [population({ id: 20 })] });
  const lines = [foundersLine({ plantCount: 3, populations: [population({ id: 90, label: "P", isLatestGeneration: false })] }), roma, cherry];

  it("puts Founders last and keeps the server order otherwise", () => {
    expect(orderLines(lines).map((l) => l.name)).toEqual(["Roma-A", "Cherry", "Founders"]);
    expect(visibleLines(lines).map((l) => l.name)).toEqual(["Roma-A", "Cherry", "Founders"]);
  });

  it("filters by line id", () => {
    expect(visibleLines(lines, { lineId: 2 }).map((l) => l.name)).toEqual(["Cherry"]);
  });

  it("keeps only the latest generation populations, but all of Founders", () => {
    const result = visibleLines(lines, { latestOnly: true });
    expect(result[0].populations.map((p) => p.id)).toEqual([10]);
    expect(result[2].populations.map((p) => p.id)).toEqual([90]);
  });

  it("hides populations and lines without matches while searching", () => {
    const counts = { total: 1, byLine: {}, byPopulation: { 11: 1 } };
    const result = visibleLines(lines, { q: "red", counts });
    expect(result.map((l) => l.name)).toEqual(["Roma-A"]);
    expect(result[0].populations.map((p) => p.id)).toEqual([11]);
  });
});

describe("originText", () => {
  it.each([
    [{ origin: { kind: "founders", parents: [] } }, "Plants with no parents"],
    [
      { origin: { kind: "cross", parents: [{ lineName: "Roma-A", label: "F3", plantTag: "A1" }, { lineName: "Cherry-7", label: "S2", plantTag: "B1" }] } },
      "Roma-A F3 × Cherry-7 S2",
    ],
    [
      { origin: { kind: "cross", parents: [{ lineName: "Founders", label: "P", plantTag: "Roma VF" }, { lineName: "Founders", label: "P", plantTag: "San Marzano" }] } },
      "Roma VF × San Marzano",
    ],
    [{ origin: { kind: "self", parents: [{ lineName: "Cherry", label: "F1", plantTag: "Cherry Red" }] } }, "Selfed from Cherry Red"],
    [{ origin: { kind: "renamed", parents: [], forkedFrom: { lineName: "Roma-A", label: "F3" } } }, "From Roma-A F3"],
    [{ origin: { kind: "imported", parents: [] } }, "Imported plants"],
    [{ origin: { kind: "manual", parents: [] }, originNote: "Grandma's seeds" }, "Grandma's seeds"],
  ])("describes %j", (partial, expected) => {
    expect(originText(line(partial))).toBe(expected);
  });
});

describe("lineChips", () => {
  const many = Array.from({ length: 15 }, (_, i) => line({ id: i + 1, name: `L${i + 1}`, plantCount: i }));

  it("shows every line when there are 12 or fewer, with counts from the server", () => {
    const { chips, more } = lineChips(many.slice(0, 3), { byLine: { 1: 7 } });
    expect(chips.map((c) => `${c.name}:${c.count}`)).toEqual(["L1:7", "L2:1", "L3:2"]);
    expect(more).toEqual([]);
  });

  it("moves the rest to More lines after 12 and keeps the selected line visible", () => {
    expect(lineChips(many, null).more).toHaveLength(3);
    const { chips, more } = lineChips(many, null, 14);
    expect(chips.some((c) => c.id === 14)).toBe(true);
    expect(more.some((c) => c.id === 14)).toBe(false);
    expect(chips).toHaveLength(12);
  });
});

describe("helpers", () => {
  it("picks the season from the month", () => {
    expect(currentSeasonAndYear(new Date(2026, 0, 5))).toEqual({ season: "Winter", year: 2026 });
    expect(currentSeasonAndYear(new Date(2026, 3, 5)).season).toBe("Spring");
    expect(currentSeasonAndYear(new Date(2026, 6, 5)).season).toBe("Summer");
    expect(currentSeasonAndYear(new Date(2026, 9, 5)).season).toBe("Autumn");
  });

  it("shows a dash for empty traits and adds units", () => {
    expect(traitSummary({ fruitColor: "Red", fruitWeight: "88", seedColor: "", seedWeight: null })).toEqual(["Red", "88 g", "—", "—"]);
  });

  it("reads message, field and code from an error without keeping the body", () => {
    const err = { response: { status: 400, data: { message: "Nope", field: "mother", code: "parent_not_found", extra: "x" } } };
    expect(errorInfo(err, "fallback")).toEqual({ status: 400, message: "Nope", field: "mother", code: "parent_not_found" });
    expect(errorInfo(new Error("boom"), "fallback")).toEqual({ status: null, message: "fallback", field: null, code: null });
  });
});

describe("error and name helpers", () => {
  it("uses the generic text for ASP.NET validation errors without a code", () => {
    const err = { response: { status: 400, data: { title: "One or more validation errors occurred.", errors: { Tag: ["too long"] } } } };
    expect(errorInfo(err, "Could not save the plant. Nothing was changed.").message).toBe("Could not save the plant. Nothing was changed.");
  });

  it("suggests a unique line name from the parents' tags", () => {
    expect(suggestLineName("Roma.1", "San_2", [])).toBe("Roma-1 x San-2");
    expect(suggestLineName("A", "B", ["a x b", "A x B 2"])).toBe("A x B 3");
  });
});
