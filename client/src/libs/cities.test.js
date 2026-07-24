import { converToCitiesList } from "./cities";

describe("converToCitiesList", () => {
  it("builds 'City, State, Country' labels from Nominatim-shaped results", () => {
    const results = [
      { address: { city: "Portland", state: "Oregon", country: "United States" } },
    ];

    expect(converToCitiesList(results)).toEqual(["Portland, Oregon, United States"]);
  });

  it("falls back to town/village/municipality/county when city is missing", () => {
    const results = [
      { address: { town: "Ambleside", country: "United Kingdom" } },
      { address: { village: "Grasmere", country: "United Kingdom" } },
      { address: { municipality: "Keswick", country: "United Kingdom" } },
      { address: { county: "Cumbria", country: "United Kingdom" } },
    ];

    expect(converToCitiesList(results)).toEqual([
      "Ambleside, , United Kingdom",
      "Grasmere, , United Kingdom",
      "Keswick, , United Kingdom",
      "Cumbria, , United Kingdom",
    ]);
  });

  it("uses region as a state fallback and defaults state to empty string", () => {
    const results = [{ address: { city: "Kyoto", region: "Kansai", country: "Japan" } }];

    expect(converToCitiesList(results)).toEqual(["Kyoto, Kansai, Japan"]);
  });

  it("skips results missing a city or a country", () => {
    const results = [
      { address: { state: "Texas", country: "United States" } },
      { address: { city: "Austin" } },
    ];

    expect(converToCitiesList(results)).toEqual([]);
  });

  it("de-duplicates identical labels across multiple OSM feature levels", () => {
    const results = [
      { address: { city: "Paris", state: "Ile-de-France", country: "France" } },
      { address: { city: "Paris", state: "Ile-de-France", country: "France" } },
    ];

    expect(converToCitiesList(results)).toEqual(["Paris, Ile-de-France, France"]);
  });

  it("returns an empty array for an empty result set", () => {
    expect(converToCitiesList([])).toEqual([]);
  });
});
