// Pure helpers for the Plants tab: no network, no React.
import { extractErrorMessage } from "../services/serverCalls";

export const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
export const MAX_LINE_CHIPS = 12;
export const TAG_PATTERN = /^[A-Za-z0-9._-]{1,24}$/;
export const LINE_NAME_PATTERN = /^[\p{L}\p{N} -]{1,40}$/u;
export const TRAIT_KEYS = ["fruitColor", "fruitWeight", "seedColor", "seedWeight"];

export const currentSeasonAndYear = (now = new Date()) => {
  const month = now.getMonth(); // 0 = January
  let season = "Winter";
  if (month >= 2 && month <= 4) season = "Spring";
  else if (month >= 5 && month <= 7) season = "Summer";
  else if (month >= 8 && month <= 10) season = "Autumn";
  return { season, year: now.getFullYear() };
};

// Founders always last; the server order is kept otherwise.
export const orderLines = (lines) => [
  ...lines.filter((l) => !l.isFounders),
  ...lines.filter((l) => l.isFounders),
];

export const pluralPlants = (n) => `${n} ${n === 1 ? "plant" : "plants"}`;

// Lines (with their populations) that pass the filters. While searching, only
// populations with matches stay (counts come from the server).
export const visibleLines = (lines, { lineId = null, latestOnly = false, q = "", counts = null } = {}) => {
  const searching = q.trim() !== "" && counts;
  return orderLines(lines)
    .filter((line) => lineId === null || line.id === lineId)
    .map((line) => {
      let populations = line.populations ?? [];
      if (latestOnly && !line.isFounders) populations = populations.filter((p) => p.isLatestGeneration);
      if (searching) populations = populations.filter((p) => (counts.byPopulation[p.id] ?? 0) > 0);
      return { ...line, populations };
    })
    .filter((line) => !searching || line.populations.length > 0);
};

const parentText = (parent) => {
  const where = parent.lineName === "Founders" && parent.plantTag ? parent.plantTag : parent.lineName;
  return parent.label && parent.label !== "P" && where !== parent.plantTag ? `${where} ${parent.label}` : where;
};

export const originText = (line) => {
  const origin = line?.origin ?? {};
  switch (origin.kind) {
    case "founders":
      return "Plants with no parents";
    case "cross":
      return (origin.parents ?? []).map(parentText).join(" × ") || line.originNote || "";
    case "self": {
      const [parent] = origin.parents ?? [];
      return parent ? `Selfed from ${parent.plantTag ?? parentText(parent)}` : "Selfed";
    }
    case "renamed":
      return origin.forkedFrom ? `From ${origin.forkedFrom.lineName} ${origin.forkedFrom.label}`.trim() : "";
    default:
      return line?.originNote || (origin.kind === "imported" ? "Imported plants" : "");
  }
};

// Chips after "All": at most MAX_LINE_CHIPS shown, the rest in a "More lines" menu.
// The selected line always stays visible.
export const lineChips = (lines, counts, selectedLineId = null) => {
  const all = orderLines(lines).map((l) => ({
    id: l.id,
    name: l.name,
    count: counts?.byLine?.[l.id] ?? l.plantCount ?? 0,
  }));
  if (all.length <= MAX_LINE_CHIPS) return { chips: all, more: [] };
  let chips = all.slice(0, MAX_LINE_CHIPS);
  let more = all.slice(MAX_LINE_CHIPS);
  const picked = more.find((c) => c.id === selectedLineId);
  if (picked) {
    chips = [...chips.slice(0, MAX_LINE_CHIPS - 1), picked];
    more = [...more.filter((c) => c.id !== picked.id), all[MAX_LINE_CHIPS - 1]];
  }
  return { chips, more };
};

export const lineNameMap = (lines) => Object.fromEntries(lines.map((l) => [l.id, l.name]));

export const traitSummary = (plant) =>
  [
    plant.fruitColor,
    plant.fruitWeight ? `${plant.fruitWeight} g` : null,
    plant.seedColor,
    plant.seedWeight ? `${plant.seedWeight} mg` : null,
  ].map((v) => v || "—");

// The server answers {message, field, code}. The message is shown as text only.
export const errorInfo = (err, fallback) => {
  const data = err?.response?.data;
  // ASP.NET validation failures ({ errors }, no code) get the generic text.
  const generic = data && typeof data === "object" && data.errors && !data.code;
  return {
    status: err?.response?.status ?? null,
    message: generic ? fallback : extractErrorMessage(err, fallback),
    field: typeof data?.field === "string" ? data.field : null,
    code: typeof data?.code === "string" ? data.code : null,
  };
};

// Default name for a new line started by a cross: "{mother} x {father}", made
// unique against the existing names. Letters, numbers, dashes and spaces only.
export const suggestLineName = (motherTag, fatherTag, existingNames = []) => {
  const clean = (t) => String(t ?? "").replace(/[^\p{L}\p{N} -]/gu, "-");
  const base = `${clean(motherTag)} x ${clean(fatherTag)}`.slice(0, 36);
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base} ${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return base;
};
