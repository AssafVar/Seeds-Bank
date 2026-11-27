import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, buildAuthValue } from "../../test-utils/renderWithProviders.jsx";
import { counts, foundersLine, line, page, plant, population } from "../../test-utils/pedigreeFixtures.js";
import * as api from "../../services/serverCalls.js";
import ProjectItem from "./ProjectItem.jsx";

jest.mock("../../services/serverCalls.js", () =>
  require("../../test-utils/serverCallsMock").mockServerCalls([
    "createLine", "createPlants", "createPopulation", "deleteLine", "deletePopulation", "deleteProjectPlant",
    "getFields", "getPlant", "getPlantCounts", "getPlants", "getProjectOverview", "previewPlacement",
    "renameLine", "setLineStable", "updatePlantParents", "updatePlantTraits",
  ])
);

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// VarietiesSection has its own dedicated test coverage - stub it here so
// this file can focus on the Plants tab and tab-switching/routing wiring.
jest.mock("./VarietiesSection.jsx", () => ({ userId, projectId }) => (
  <div>Varieties section for {userId}/{projectId}</div>
));

const authValue = buildAuthValue({ activeUser: { userId: "u1" } });
const renderOptions = { authValue, route: "/projects/p1", routePath: "/projects/:projectId" };
const projectHeaders = { project_name: "Tomatoes", project_id: "p1" };

const founderPreview = {
  isSelf: false,
  startsNewLine: false,
  forcedNewLine: false,
  allowedLineChoices: [],
  line: { id: 99, name: "Founders" },
  label: "P",
  suggestedTag: "FD-P-001",
  population: { action: "creates", name: "Spring 2026", plantCount: 0 },
};

const load = (lines = [line(), foundersLine()], plants = [plant()]) => {
  api.getProjectOverview.mockResolvedValue({ projectHeaders, lines });
  api.getPlantCounts.mockResolvedValue(counts());
  api.getPlants.mockResolvedValue(page(plants));
  api.getFields.mockResolvedValue({ items: [{ id: 1, name: "North field" }] });
  api.previewPlacement.mockResolvedValue(founderPreview);
};

describe("ProjectItem", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows a spinner while the project is loading, then renders its name", async () => {
    api.getProjectOverview.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ProjectItem />, renderOptions);

    expect(screen.queryByText(/project: Tomatoes/)).not.toBeInTheDocument();
  });

  it("renders the project name, the line, its population and one row per plant", async () => {
    load();

    renderWithProviders(<ProjectItem />, renderOptions);

    expect(await screen.findByText("project: Tomatoes")).toBeInTheDocument();
    expect(api.getProjectOverview).toHaveBeenCalledWith("u1", "p1");
    expect(await screen.findByRole("heading", { level: 3, name: "Roma-A" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 4, name: "Spring 2026 · North field" })).toBeInTheDocument();
    expect(await screen.findByText("RA-F3-001")).toBeInTheDocument();
    expect(screen.getByText("Roma VF × San Marzano")).toBeInTheDocument();
    expect(screen.getByText("2 plants in 1 line")).toBeInTheDocument();
  });

  it("navigates to the project list when 'Return to the Project List' is clicked", async () => {
    load();

    renderWithProviders(<ProjectItem />, renderOptions);
    await screen.findByText("project: Tomatoes");

    userEvent.click(screen.getByRole("button", { name: "Return to the Project List" }));

    expect(mockNavigate).toHaveBeenCalledWith("/projects");
  });

  it("edits a trait inline: sends all four traits plus the version and shows the saved plant", async () => {
    load();
    api.updatePlantTraits.mockResolvedValue(plant({ fruitColor: "Yellow", version: 2 }));

    renderWithProviders(<ProjectItem />, renderOptions);
    userEvent.click(await screen.findByRole("button", { name: "Edit Fruit color of RA-F3-001" }));
    const input = screen.getByLabelText("Fruit color of RA-F3-001");
    userEvent.clear(input);
    userEvent.type(input, "Yellow{enter}");

    await waitFor(() =>
      expect(api.updatePlantTraits).toHaveBeenCalledWith("u1", "p1", "pl-1", {
        fruitColor: "Yellow", fruitWeight: "88", seedColor: "Tan", seedWeight: "3.1", version: 1,
      })
    );
    expect(await screen.findByRole("button", { name: "Edit Fruit color of RA-F3-001" })).toHaveTextContent("Yellow");
  });

  it("keeps the old value when Esc cancels an inline edit", async () => {
    load();

    renderWithProviders(<ProjectItem />, renderOptions);
    userEvent.click(await screen.findByRole("button", { name: "Edit Seed color of RA-F3-001" }));
    userEvent.type(screen.getByLabelText("Seed color of RA-F3-001"), "zzz{esc}");

    expect(api.updatePlantTraits).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit Seed color of RA-F3-001" })).toHaveTextContent("Tan");
  });

  it("opens the Add plant dialog, asks the server for the placement and adds a founder", async () => {
    load();
    api.createPlants.mockResolvedValue({ plants: [plant({ plantId: "pl-9", tag: "FD-P-001", lineId: 99, populationId: 90 })], line: foundersLine({ plantCount: 1, populations: [population({ id: 90, label: "P", plantCount: 1 })] }) });

    renderWithProviders(<ProjectItem />, renderOptions);
    userEvent.click(await screen.findByRole("button", { name: "Add plant" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Add plant" })).toBeInTheDocument();
    expect(await within(dialog).findByText("Creates population Spring 2026")).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText(/^Tag/)).toHaveValue("FD-P-001"));
    userEvent.click(within(dialog).getByRole("button", { name: "Add plant" }));

    await waitFor(() => expect(api.createPlants).toHaveBeenCalled());
    expect(api.createPlants.mock.calls[0][2]).toMatchObject({ tag: "FD-P-001", startNewLine: false, count: 1, season: expect.any(String) });
    expect(api.createPlants.mock.calls[0][2].motherPlantId).toBeUndefined();
    expect(await screen.findByText("Added FD-P-001.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("keeps the dialog and shows the failure when saving the plant fails", async () => {
    load();
    api.createPlants.mockRejectedValue({ response: { status: 500, data: { message: "internal detail" } } });

    renderWithProviders(<ProjectItem />, renderOptions);
    userEvent.click(await screen.findByRole("button", { name: "Add plant" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getByLabelText(/^Tag/)).toHaveValue("FD-P-001"));
    userEvent.click(within(dialog).getByRole("button", { name: "Add plant" }));

    expect(await within(dialog).findByText("Could not save the plant. Nothing was changed.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Tag/)).toHaveValue("FD-P-001");
  });

  it("opens Cross plants with Mother and Father fields", async () => {
    load([line({ plantCount: 2 }), foundersLine()]);

    renderWithProviders(<ProjectItem />, renderOptions);
    userEvent.click(await screen.findByRole("button", { name: "Cross plants" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Cross plants" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Mother")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Father")).toBeInTheDocument();
  });

  it("shows the empty state with both first actions and a disabled Cross plants", async () => {
    load([foundersLine()], []);
    api.getPlantCounts.mockResolvedValue(counts({ total: 0, lines: [], populations: [] }));

    renderWithProviders(<ProjectItem />, renderOptions);

    expect(await screen.findByRole("heading", { name: "No lines yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create first line" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add founder plants" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cross plants" })).toBeDisabled();
    expect(screen.queryByLabelText("Search tag or trait")).not.toBeInTheDocument();
    expect(screen.getByText("No plants yet")).toBeInTheDocument();
  });

  it.each([[403], [404]])("shows the no-access message for a %i without echoing the body", async (status) => {
    const spies = ["log", "warn", "error"].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
    api.getProjectOverview.mockRejectedValue({ response: { status, data: { message: "secret server detail" } } });

    renderWithProviders(<ProjectItem />, renderOptions);

    expect(await screen.findByText("You do not have access to this project.")).toBeInTheDocument();
    expect(screen.queryByText(/secret server detail/)).not.toBeInTheDocument();
    spies.forEach((spy) => {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("secret server detail");
      spy.mockRestore();
    });
  });

  it("shows a retry when loading fails, and loads again", async () => {
    load();
    api.getProjectOverview.mockRejectedValueOnce(new Error("offline"));

    renderWithProviders(<ProjectItem />, renderOptions);
    expect(await screen.findByText("Could not load plants. Check your connection and try again.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Plants" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Return to the Project List" })).toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("project: Tomatoes")).toBeInTheDocument();
  });

  it("navigates to the Fields route and switches to the Varieties tab", async () => {
    load();

    renderWithProviders(<ProjectItem />, renderOptions);
    await screen.findByText("project: Tomatoes");

    userEvent.click(screen.getByRole("tab", { name: "Fields" }));
    expect(mockNavigate).toHaveBeenCalledWith("/projects/p1/fields");

    userEvent.click(screen.getByRole("tab", { name: "Varieties" }));
    expect(screen.getByText("Varieties section for u1/p1")).toBeInTheDocument();
  });

  it("opens on the Varieties tab when the ?tab=2 search param is set", async () => {
    load();

    renderWithProviders(<ProjectItem />, { ...renderOptions, route: "/projects/p1?tab=2" });

    expect(await screen.findByText("Varieties section for u1/p1")).toBeInTheDocument();
  });
});

describe("ProjectItem security (client)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("ClientDoesNotRenderHtml: tags, line names, origins and traits render as text", async () => {
    const evilTag = "<img src=x onerror=alert(1)>";
    const evilLine = "<script>alert(2)</script>";
    const evilTrait = "<b onmouseover=alert(3)>Red</b>";
    load(
      [line({ name: evilLine, originNote: "<i>origin</i>", origin: { kind: "manual", parents: [] } }), foundersLine()],
      [plant({ tag: evilTag, fruitColor: evilTrait, mother: null, father: null })]
    );

    const { container } = renderWithProviders(<ProjectItem />, renderOptions);

    expect(await screen.findByText(evilTag)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: evilLine })).toBeInTheDocument();
    expect(screen.getByText("<i>origin</i>")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Edit Fruit color of ${evilTag}` })).toHaveTextContent(evilTrait);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("i")).toBeNull();
  });

  it.each([["?line=abc"], ["?line=1;drop"], ["?line=-3"], ["?latest=2"], ["?latest=true"]])(
    "ignores the bad URL parameter %s and does not send it to the server",
    async (query) => {
      load();

      renderWithProviders(<ProjectItem />, { ...renderOptions, route: `/projects/p1${query}` });
      await screen.findByText("project: Tomatoes");

      await waitFor(() => expect(api.getPlantCounts).toHaveBeenCalled());
      const params = api.getPlantCounts.mock.calls[0][2];
      expect(params.lineId ?? null).toBeNull();
      expect(params.latestOnly).toBeUndefined();
      expect(screen.getByRole("heading", { level: 3, name: "Roma-A" })).toBeInTheDocument();
    }
  );

  it("passes a valid ?line=1&latest=1 to the server as parameters, not in a path", async () => {
    load();

    renderWithProviders(<ProjectItem />, { ...renderOptions, route: "/projects/p1?line=1&latest=1" });
    await screen.findByText("project: Tomatoes");

    await waitFor(() => expect(api.getPlantCounts).toHaveBeenCalledWith("u1", "p1", expect.objectContaining({ lineId: 1, latestOnly: true })));
  });

  it("shows a server message as text and logs no response body when saving a trait fails", async () => {
    const spies = ["log", "warn", "error"].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
    load();
    api.updatePlantTraits.mockRejectedValue({ response: { status: 409, data: { message: "This plant was changed elsewhere. Reload to see the latest.<b>x</b>" } } });

    const { container } = renderWithProviders(<ProjectItem />, renderOptions);
    userEvent.click(await screen.findByRole("button", { name: "Edit Fruit color of RA-F3-001" }));
    userEvent.type(screen.getByLabelText("Fruit color of RA-F3-001"), "x{enter}");

    expect(await screen.findByText(/This plant was changed elsewhere/)).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
    spies.forEach((spy) => {
      expect(JSON.stringify(spy.mock.calls)).not.toContain("changed elsewhere");
      spy.mockRestore();
    });
  });
});
