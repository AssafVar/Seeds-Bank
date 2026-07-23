// Shared between FieldsSection's card list and ManageSubFieldsMap's
// sub-field editor so both display the same labels/colors for a field's
// grower-set lifecycle stage.
export const STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "sown", label: "Sown" },
  { value: "growing", label: "Growing" },
  { value: "harvested", label: "Harvested" },
];

export const STATUS_CHIP_COLOR = { planning: "default", sown: "info", growing: "success", harvested: "secondary" };

export const statusLabel = (status) => STATUS_OPTIONS.find((s) => s.value === status)?.label || "Planning";
