import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { page, plant } from "../../test-utils/pedigreeFixtures.js";
import * as api from "../../services/serverCalls.js";
import AddPlantDialog from "./AddPlantDialog.jsx";

jest.mock("../../services/serverCalls.js", () =>
  require("../../test-utils/serverCallsMock").mockServerCalls(["getFields", "getPlants", "previewPlacement"])
);

const basePreview = {
  isSelf: false,
  startsNewLine: false,
  forcedNewLine: false,
  allowedLineChoices: [
    { lineId: 1, name: "Roma-A", isNew: false },
    { lineId: null, name: "", isNew: true },
  ],
  line: { id: 1, name: "Roma-A" },
  label: "F4",
  suggestedTag: "RA-F4-001",
  population: { action: "joins", name: "Spring 2026 · North field", plantCount: 10 },
};

const mother = plant({ plantId: "m1", tag: "RA-F2-004" });
const father = plant({ plantId: "f1", tag: "RA-F3-002" });

const bothParents = { mother: { plantId: "m1", tag: "RA-F2-004" }, father: { plantId: "f1", tag: "RA-F3-002" } };

const setup = (props = {}) => {
  const onCreate = jest.fn().mockResolvedValue({ plants: [], line: {} });
  const onClose = jest.fn();
  renderWithProviders(<AddPlantDialog userId="u1" projectId="p1" onCreate={onCreate} onClose={onClose} lineNames={{ 1: "Roma-A" }} {...props} />);
  return { onCreate, onClose };
};

const pick = async (label, tag) => {
  userEvent.click(screen.getByLabelText(label));
  userEvent.click(await screen.findByText(tag, { selector: "[role=option] span" }));
};

describe("AddPlantDialog", () => {
  // The parent picker and the placement preview are debounced. Fake timers make
  // waitFor/findBy advance that debounce itself, so nothing depends on how fast
  // the machine is.
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    api.getFields.mockResolvedValue({ items: [{ id: 1, name: "North field" }] });
    api.getPlants.mockResolvedValue(page([mother, father]));
    api.previewPlacement.mockResolvedValue(basePreview);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // First on purpose: it is the cheap test, so the one-off MUI start-up cost lands here.
  it("says Creates population for a new population", async () => {
    api.previewPlacement.mockResolvedValue({ ...basePreview, population: { action: "creates", name: "Spring 2026", plantCount: 0 } });
    setup();

    expect(await screen.findByText("Creates population Spring 2026")).toBeInTheDocument();
  });

  it("shows the population line, the generation and the suggested tag from the server preview", async () => {
    setup({ preset: bothParents });


    expect(await screen.findByText("Joins population Spring 2026 · North field (10 plants)")).toBeInTheDocument();
    expect(screen.getByText("Generation F4 (worked out from the parents)")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/^Tag/)).toHaveValue("RA-F4-001"));
    expect(screen.getByRole("radio", { name: "Add to Roma-A" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Start a new line" })).not.toBeChecked();
    await waitFor(() =>
      expect(api.previewPlacement).toHaveBeenLastCalledWith("u1", "p1", expect.objectContaining({ motherPlantId: "m1", fatherPlantId: "f1" }))
    );
  });

  it("forces a new line, with the helper text, when the parents come from different lines", async () => {
    api.previewPlacement.mockResolvedValue({
      ...basePreview,
      forcedNewLine: true,
      startsNewLine: true,
      allowedLineChoices: [{ lineId: null, name: "", isNew: true }],
      label: "F1",
    });
    setup({ preset: bothParents });


    expect(await screen.findByText("These parents come from different lines, so this starts a new line.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Start a new line" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Start a new line" })).toBeChecked();
    expect(screen.getByLabelText(/Line name/)).toHaveValue("RA-F2-004 x RA-F3-002");
  });

  it("always sends the prefilled new line name for a cross that starts a new line", async () => {
    api.previewPlacement.mockResolvedValue({ ...basePreview, forcedNewLine: true, startsNewLine: true, allowedLineChoices: [{ lineId: null, name: "", isNew: true }], label: "F1" });
    const { onCreate } = setup({ preset: bothParents });
    await waitFor(() => expect(screen.getByLabelText(/^Tag/)).toHaveValue("RA-F4-001"));

    userEvent.click(screen.getByRole("button", { name: "Add plant" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ startNewLine: true, newLineName: "RA-F2-004 x RA-F3-002" })));
  });

  it("defaults to a sibling line returned by the preview for a founder cross, and sends its id", async () => {
    api.previewPlacement.mockResolvedValue({
      ...basePreview,
      forcedNewLine: false,
      startsNewLine: false,
      allowedLineChoices: [
        { lineId: 5, name: "Roma x San", isNew: false },
        { lineId: null, name: "", isNew: true },
      ],
      line: { id: 5, name: "Roma x San" },
      label: "F1",
    });
    const { onCreate } = setup({ preset: bothParents });

    expect(await screen.findByRole("radio", { name: "Add to Roma x San" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Start a new line" })).toBeEnabled();
    expect(screen.queryByLabelText(/Line name/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/^Tag/)).toHaveValue("RA-F4-001"));
    userEvent.click(screen.getByRole("button", { name: "Add plant" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ lineId: 5, startNewLine: false })));
    expect(onCreate.mock.calls[0][0].newLineName).toBeUndefined();
  });

  it("asks for both parents when only one is picked, and does not save", async () => {
    const { onCreate } = setup();
    await pick("Mother", "RA-F2-004");
    await waitFor(() => expect(screen.getByLabelText(/^Tag/)).not.toHaveValue(""));
    userEvent.type(screen.getByLabelText(/^Tag/), "{selectall}RA-X-1");

    userEvent.click(screen.getByRole("button", { name: "Add plant" }));

    expect(await screen.findByText("Pick both parents, or leave both empty for a founder.")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("shows the server's descendant error under the Mother field and keeps the dialog open", async () => {
    const { onCreate, onClose } = setup({ preset: bothParents });
    onCreate.mockRejectedValue({
      response: { status: 400, data: { message: "RA-F4-009 is a descendant of this plant, so it cannot be its parent.", field: "mother", code: "descendant_parent" } },
    });
    await waitFor(() => expect(screen.getByLabelText(/^Tag/)).toHaveValue("RA-F4-001"));

    userEvent.click(screen.getByRole("button", { name: "Add plant" }));

    expect(await screen.findByText("RA-F4-009 is a descendant of this plant, so it cannot be its parent.")).toBeInTheDocument();
    expect(screen.getByLabelText("Mother")).toHaveAttribute("aria-invalid", "true");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("the Self checkbox copies the mother into the father and disables the father field", async () => {
    setup();
    await pick("Mother", "RA-F2-004");

    userEvent.click(screen.getByRole("checkbox", { name: "Same plant is both parents (self)" }));

    expect(screen.getByLabelText("Father")).toBeDisabled();
    expect(screen.getByLabelText("Father")).toHaveValue("RA-F2-004");
    await waitFor(() => expect(api.previewPlacement).toHaveBeenLastCalledWith("u1", "p1", expect.objectContaining({ motherPlantId: "m1", fatherPlantId: "m1" })));
  });

  it("Self this plant opens with the plant as both parents", async () => {
    setup({ mode: "self", preset: { mother: { plantId: "m1", tag: "RA-F2-004" }, father: { plantId: "m1", tag: "RA-F2-004" } } });

    expect(screen.getByRole("heading", { name: "Self this plant" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Same plant is both parents (self)" })).toBeChecked();
    expect(screen.getByLabelText("Mother")).toHaveValue("RA-F2-004");
  });

  it("closes straight away when nothing was typed", async () => {
    const { onClose } = setup();

    userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("asks 'Discard this plant?' when there is input, and Keep editing stays", async () => {
    const { onClose } = setup();
    userEvent.type(screen.getByLabelText("Seed color"), "Tan");

    userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const confirm = await screen.findByRole("dialog", { name: "Discard this plant?" });
    userEvent.click(within(confirm).getByRole("button", { name: "Keep editing" }));

    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Discard this plant?" })).not.toBeInTheDocument());

    userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    userEvent.click(within(await screen.findByRole("dialog", { name: "Discard this plant?" })).getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("Save and add another keeps season, place and line and clears the tag and traits", async () => {
    const { onCreate, onClose } = setup({ mode: "founder" });
    api.previewPlacement.mockResolvedValue({ ...basePreview, allowedLineChoices: [], line: { id: 99, name: "Founders" }, label: "P", suggestedTag: "FD-P-001" });
    await waitFor(() => expect(screen.getByLabelText(/^Tag/)).toHaveValue("FD-P-001"));
    userEvent.type(screen.getByLabelText("Fruit color"), "Red");
    userEvent.click(screen.getByLabelText("Season"));
    userEvent.click(await screen.findByRole("option", { name: "Autumn" }));

    api.previewPlacement.mockResolvedValue({ ...basePreview, allowedLineChoices: [], line: { id: 99, name: "Founders" }, label: "P", suggestedTag: "FD-P-002" });
    userEvent.click(screen.getByRole("button", { name: "Save and add another" }));

    expect(await screen.findByText("Added FD-P-001.")).toBeInTheDocument();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ tag: "FD-P-001", fruitColor: "Red", season: "Autumn" }));
    await waitFor(() => expect(screen.getByLabelText(/^Tag/)).toHaveValue("FD-P-002"));
    expect(screen.getByLabelText("Fruit color")).toHaveValue("");
    expect(screen.getByLabelText("Season")).toHaveTextContent("Autumn");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("founder mode shows the fixed Founders line and no parent fields", async () => {
    setup({ mode: "founder" });

    expect(screen.getByText(/Founders · P/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Mother")).not.toBeInTheDocument();
  });

  it("rejects an invalid tag before calling the server", async () => {
    const { onCreate } = setup({ mode: "founder" });
    api.previewPlacement.mockResolvedValue({ ...basePreview, allowedLineChoices: [], suggestedTag: "FD-1" });
    await waitFor(() => expect(screen.getByLabelText(/^Tag/)).toHaveValue("FD-1"));
    userEvent.clear(screen.getByLabelText(/^Tag/));
    userEvent.type(screen.getByLabelText(/^Tag/), "bad tag!");

    userEvent.click(screen.getByRole("button", { name: "Add plant" }));

    expect(await screen.findByText(/Tags use letters, numbers/)).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });
});
