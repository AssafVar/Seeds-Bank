// Builds "City, State, Country" labels from Nominatim search results,
// de-duplicating (Nominatim often returns the same place at multiple
// OSM feature levels).
export const converToCitiesList = (results) => {
    const seen = new Set();
    const citiesList = [];
    for (const result of results) {
        const address = result.address || {};
        const city = address.city || address.town || address.village || address.municipality || address.county;
        const country = address.country;
        if (!city || !country) {
            continue;
        }
        const state = address.state || address.region || "";
        const label = `${city}, ${state}, ${country}`;
        if (!seen.has(label)) {
            seen.add(label);
            citiesList.push(label);
        }
    }
    return citiesList;
};