// Applied to "Custom" fields and anything without a matching entry -
// a moderate, generic middle-of-the-road guess rather than any specific
// crop's real requirement.
const DEFAULT_PROFILE = { waterMmPerSeason: 400, fertilizerKgPer100m2: 3, seedBufferPercent: 0.15, seedUnit: "seeds" };

// Varieties now live server-side (admin-managed) - the caller fetches the
// list once and passes it in here, so this stays a pure sync function
// rather than needing its own async data fetch.
function profileFor(varietyName, varieties) {
  const match = varieties.find((v) => v.name === varietyName);
  return { ...DEFAULT_PROFILE, ...match };
}

// Rough, general horticultural rule-of-thumb figures for planning ahead -
// not a precise agronomic recommendation (actual needs vary with soil,
// climate, and irrigation method). Water/fertilizer are also split into
// "remaining" vs. season total using remainingFraction, so the number
// answers "what do I still need to finish the season" rather than just
// restating the full-season figure once sowing has already happened.
//
// remainingFraction: 1 = nothing consumed yet (not sown, or planning
// ahead), 0 = season effectively over (harvested, or past the harvest
// date), null = can't be estimated (no harvest date set yet, so there's
// no season length to measure progress against) - total-only in that case.
export function estimateMaterials({ variety, areaM2, totalCapacity, remainingFraction = 1, varieties = [] }) {
  if (!areaM2 || !totalCapacity) return null;
  const profile = profileFor(variety, varieties);

  const totalWaterLiters = Math.round(areaM2 * profile.waterMmPerSeason);
  const totalFertilizerKg = Math.round((areaM2 / 100) * profile.fertilizerKgPer100m2 * 10) / 10;

  return {
    seeds: Math.ceil(totalCapacity * (1 + profile.seedBufferPercent)),
    seedUnit: profile.seedUnit,
    totalWaterLiters,
    remainingWaterLiters: remainingFraction == null ? null : Math.round(totalWaterLiters * remainingFraction),
    totalFertilizerKg,
    remainingFertilizerKg:
      remainingFraction == null ? null : Math.round(totalFertilizerKg * remainingFraction * 10) / 10,
  };
}
