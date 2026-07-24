import { STATUS_OPTIONS, STATUS_CHIP_COLOR, statusLabel } from "./fieldStatus";

describe("fieldStatus", () => {
  it("exposes the four lifecycle stages in order", () => {
    expect(STATUS_OPTIONS.map((s) => s.value)).toEqual(["planning", "sown", "growing", "harvested"]);
  });

  it("maps every status option to a chip color", () => {
    STATUS_OPTIONS.forEach((option) => {
      expect(STATUS_CHIP_COLOR[option.value]).toBeDefined();
    });
  });

  describe("statusLabel", () => {
    it("returns the matching label for a known status", () => {
      expect(statusLabel("growing")).toBe("Growing");
      expect(statusLabel("harvested")).toBe("Harvested");
    });

    it("defaults to 'Planning' for an unknown or missing status", () => {
      expect(statusLabel("unknown-status")).toBe("Planning");
      expect(statusLabel(undefined)).toBe("Planning");
    });
  });
});
