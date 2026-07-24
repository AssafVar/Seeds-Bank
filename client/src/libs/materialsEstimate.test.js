import { estimateMaterials } from "./materialsEstimate";

describe("estimateMaterials", () => {
  it("returns null when areaM2 or totalCapacity is missing", () => {
    expect(estimateMaterials({ variety: "Tomato", areaM2: 0, totalCapacity: 10 })).toBeNull();
    expect(estimateMaterials({ variety: "Tomato", areaM2: 10, totalCapacity: 0 })).toBeNull();
    expect(estimateMaterials({ variety: "Tomato", areaM2: undefined, totalCapacity: undefined })).toBeNull();
  });

  it("falls back to the default profile when the variety has no match", () => {
    const result = estimateMaterials({ variety: "Unknown Variety", areaM2: 100, totalCapacity: 20, varieties: [] });

    // DEFAULT_PROFILE: waterMmPerSeason 400, fertilizerKgPer100m2 3, seedBufferPercent 0.15
    expect(result).toEqual({
      seeds: 23, // ceil(20 * 1.15)
      seedUnit: "seeds",
      totalWaterLiters: 40000, // 100 * 400
      remainingWaterLiters: 40000,
      totalFertilizerKg: 3, // (100/100) * 3
      remainingFertilizerKg: 3,
    });
  });

  it("uses a matching variety's profile when provided", () => {
    const varieties = [
      { name: "Chili Pepper", waterMmPerSeason: 300, fertilizerKgPer100m2: 2, seedBufferPercent: 0.2, seedUnit: "grams" },
    ];

    const result = estimateMaterials({ variety: "Chili Pepper", areaM2: 50, totalCapacity: 10, varieties });

    expect(result.seedUnit).toBe("grams");
    expect(result.seeds).toBe(12); // ceil(10 * 1.2)
    expect(result.totalWaterLiters).toBe(15000); // 50 * 300
  });

  it("scales remaining water/fertilizer by remainingFraction", () => {
    const result = estimateMaterials({ variety: "Unknown", areaM2: 100, totalCapacity: 10, remainingFraction: 0.5 });

    expect(result.totalWaterLiters).toBe(40000);
    expect(result.remainingWaterLiters).toBe(20000);
    expect(result.totalFertilizerKg).toBe(3);
    expect(result.remainingFertilizerKg).toBe(1.5);
  });

  it("returns null remaining figures when remainingFraction is null (no harvest date set)", () => {
    const result = estimateMaterials({ variety: "Unknown", areaM2: 100, totalCapacity: 10, remainingFraction: null });

    expect(result.remainingWaterLiters).toBeNull();
    expect(result.remainingFertilizerKg).toBeNull();
    expect(result.totalWaterLiters).toBe(40000);
  });
});
