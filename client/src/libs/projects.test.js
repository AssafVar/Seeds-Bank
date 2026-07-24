// nanoid v4 ships ESM-only, which CRA's default Jest transform can't parse -
// stub it out so this file exercises projects.js's own logic in isolation.
jest.mock("nanoid", () => ({ nanoid: () => "generated-id" }));

import { getGenerations, createData, addNewLine, getLinePurityMap, crossPlants, sortTable } from "./projects";

const projectHeaders = { project_name: "Tomatoes", project_id: "proj-1" };

describe("getGenerations", () => {
  it("returns the distinct generations present, sorted ascending", () => {
    const details = [{ generation: 2 }, { generation: 0 }, { generation: 1 }, { generation: 0 }];
    expect(getGenerations(details)).toEqual([0, 1, 2]);
  });

  it("returns an empty array for no rows", () => {
    expect(getGenerations([])).toEqual([]);
  });
});

describe("addNewLine", () => {
  it("starts a brand-new line at generation 0 with placeholder parentage", () => {
    const result = addNewLine("new-line", projectHeaders, []);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      line: "---",
      plant_mother_id: "---",
      plant_father_id: "---",
      generation: 0,
      project_id: "proj-1",
      project_name: "Tomatoes",
    });
  });

  it("advances an existing row's line by one generation, tracking it as mother", () => {
    const existingRow = createData("Line A", "Tomatoes", "---", "---", "proj-1", "plant-1", "red", "10g", "black", "1g", "photo.jpg", 1);
    const result = addNewLine(existingRow, projectHeaders, [existingRow]);

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      line: "Line A",
      plant_mother_id: "plant-1",
      plant_father_id: "---",
      generation: 2,
    });
  });
});

describe("crossPlants", () => {
  it("combines two parents' lines and takes the max generation + 1", () => {
    const parentA = createData("Line A", "Tomatoes", "---", "---", "proj-1", "plant-a", "red", "10g", "black", "1g", "photo.jpg", 1);
    const parentB = createData("Line B", "Tomatoes", "---", "---", "proj-1", "plant-b", "yellow", "12g", "brown", "1.2g", "photo.jpg", 3);

    const result = crossPlants(parentA, parentB, projectHeaders, [parentA, parentB]);

    expect(result).toHaveLength(3);
    expect(result[2]).toMatchObject({
      line: "Line A x Line B",
      plant_father_id: "plant-a",
      plant_mother_id: "plant-b",
      generation: 4,
    });
  });
});

describe("getLinePurityMap", () => {
  const withTraits = (overrides) =>
    createData(
      overrides.line,
      "Tomatoes",
      "---",
      "---",
      "proj-1",
      overrides.plant_id,
      overrides.fruit_color ?? "red",
      overrides.fruit_weight ?? "10g",
      overrides.seed_color ?? "black",
      overrides.seed_weight ?? "1g",
      "photo.jpg",
      overrides.generation
    );

  it("marks a line stable once its last two observed generations match on all traits", () => {
    const details = [
      withTraits({ line: "Line A", plant_id: "p1", generation: 1 }),
      withTraits({ line: "Line A", plant_id: "p2", generation: 2 }),
    ];

    expect(getLinePurityMap(details)).toEqual({
      "Line A": { isStable: true, stableGenerations: 2 },
    });
  });

  it("marks a line unstable when recent generations' traits differ", () => {
    const details = [
      withTraits({ line: "Line A", plant_id: "p1", generation: 1, fruit_color: "red" }),
      withTraits({ line: "Line A", plant_id: "p2", generation: 2, fruit_color: "yellow" }),
    ];

    expect(getLinePurityMap(details)).toEqual({
      "Line A": { isStable: false, stableGenerations: 0 },
    });
  });

  it("ignores rows without fully-observed traits (placeholders)", () => {
    const details = [createData("Line A", "Tomatoes", "---", "---", "proj-1", "p1", "---", "---", "---", "---", "photo.jpg", 0)];

    expect(getLinePurityMap(details)).toEqual({});
  });
});

describe("sortTable", () => {
  it("sorts rows ascending by the given numeric field without mutating the input", () => {
    const rows = [{ generation: 2 }, { generation: 0 }, { generation: 1 }];
    const original = [...rows];

    const sorted = sortTable(rows, "generation");

    expect(sorted.map((r) => r.generation)).toEqual([0, 1, 2]);
    expect(rows).toEqual(original);
  });
});
