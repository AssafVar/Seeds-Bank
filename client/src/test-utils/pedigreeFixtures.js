// Builders for the shapes the breeding endpoints return (camelCase DTOs).
export const population = (over = {}) => ({
  id: 10,
  kind: "F",
  generation: 3,
  label: "F3",
  name: "Spring 2026 · North field",
  season: "Spring",
  year: 2026,
  fieldId: 1,
  fieldName: "North field",
  plantCount: 2,
  isLatestGeneration: true,
  ...over,
});

export const line = (over = {}) => ({
  id: 1,
  name: "Roma-A",
  code: "RA",
  isFounders: false,
  isStable: false,
  stableMarkedAt: null,
  looksStable: false,
  stabilityState: "none",
  successorLineId: null,
  forks: [],
  originNote: null,
  origin: { kind: "cross", parents: [{ role: "mother", lineName: "Founders", label: "P", plantTag: "Roma VF" }, { role: "father", lineName: "Founders", label: "P", plantTag: "San Marzano" }] },
  plantCount: 2,
  populations: [population()],
  ...over,
});

export const foundersLine = (over = {}) =>
  line({
    id: 99,
    name: "Founders",
    code: "FD",
    isFounders: true,
    origin: { kind: "founders", parents: [] },
    plantCount: 0,
    populations: [],
    ...over,
  });

export const plant = (over = {}) => ({
  plantId: "pl-1",
  tag: "RA-F3-001",
  projectId: "p1",
  lineId: 1,
  populationId: 10,
  kind: "F",
  generation: 3,
  label: "F3",
  mother: { plantId: "pl-m", tag: "RA-F2-004", removed: false },
  father: { plantId: "pl-f", tag: "RA-F2-005", removed: false },
  isSelf: false,
  fruitColor: "Red",
  fruitWeight: "88",
  seedColor: "Tan",
  seedWeight: "3.1",
  childCount: 0,
  version: 1,
  ...over,
});

export const page = (items, over = {}) => ({ items, page: 1, pageSize: 25, totalCount: items.length, ...over });

export const counts = (over = {}) => ({
  total: 2,
  lines: [{ lineId: 1, count: 2 }],
  populations: [{ populationId: 10, count: 2 }],
  ...over,
});
