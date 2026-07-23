// Typical recommended in-row plant spacing and between-row spacing for
// common vegetables, in meters. General horticultural guideline values -
// a starting point, not a substitute for variety-specific instructions.
//
// waterMmPerSeason / fertilizerKgPer100m2 / seedBufferPercent are the same
// kind of thing: commonly-cited rough averages (season-long water depth,
// balanced-fertilizer rate, and germination-failure buffer), used to size
// the materials estimate in materialsEstimate.js. They vary a lot with
// climate, soil, and irrigation method in real growing conditions - a
// planning aid, not an agronomic recommendation.
const vegetableVarieties = [
  { name: "Tomato", plantSpacing: 0.45, rowSpacing: 0.9, waterMmPerSeason: 500, fertilizerKgPer100m2: 5, seedBufferPercent: 0.1 },
  { name: "Pepper", plantSpacing: 0.4, rowSpacing: 0.6, waterMmPerSeason: 450, fertilizerKgPer100m2: 4, seedBufferPercent: 0.1 },
  { name: "Cucumber", plantSpacing: 0.3, rowSpacing: 1.2, waterMmPerSeason: 500, fertilizerKgPer100m2: 4, seedBufferPercent: 0.15 },
  { name: "Lettuce", plantSpacing: 0.25, rowSpacing: 0.3, waterMmPerSeason: 300, fertilizerKgPer100m2: 2, seedBufferPercent: 0.2 },
  { name: "Carrot", plantSpacing: 0.05, rowSpacing: 0.3, waterMmPerSeason: 350, fertilizerKgPer100m2: 2.5, seedBufferPercent: 0.35 },
  { name: "Onion", plantSpacing: 0.1, rowSpacing: 0.3, waterMmPerSeason: 350, fertilizerKgPer100m2: 3, seedBufferPercent: 0.3 },
  {
    name: "Potato",
    plantSpacing: 0.3,
    rowSpacing: 0.75,
    waterMmPerSeason: 450,
    fertilizerKgPer100m2: 4,
    seedBufferPercent: 0.05,
    seedUnit: "seed potatoes",
  },
  { name: "Squash", plantSpacing: 0.6, rowSpacing: 1.2, waterMmPerSeason: 500, fertilizerKgPer100m2: 4, seedBufferPercent: 0.15 },
  { name: "Broccoli", plantSpacing: 0.45, rowSpacing: 0.6, waterMmPerSeason: 400, fertilizerKgPer100m2: 4, seedBufferPercent: 0.1 },
  { name: "Cabbage", plantSpacing: 0.45, rowSpacing: 0.6, waterMmPerSeason: 400, fertilizerKgPer100m2: 4, seedBufferPercent: 0.1 },
  { name: "Spinach", plantSpacing: 0.1, rowSpacing: 0.3, waterMmPerSeason: 300, fertilizerKgPer100m2: 2.5, seedBufferPercent: 0.25 },
  { name: "Beans (bush)", plantSpacing: 0.15, rowSpacing: 0.6, waterMmPerSeason: 350, fertilizerKgPer100m2: 2, seedBufferPercent: 0.15 },
  { name: "Eggplant", plantSpacing: 0.45, rowSpacing: 0.75, waterMmPerSeason: 500, fertilizerKgPer100m2: 4, seedBufferPercent: 0.1 },
  { name: "Corn", plantSpacing: 0.25, rowSpacing: 0.75, waterMmPerSeason: 450, fertilizerKgPer100m2: 3.5, seedBufferPercent: 0.15 },
  { name: "Watermelon", plantSpacing: 0.9, rowSpacing: 1.8, waterMmPerSeason: 550, fertilizerKgPer100m2: 4, seedBufferPercent: 0.15 },
];

export default vegetableVarieties;
