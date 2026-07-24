import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FieldDrawingCanvas from "./FieldDrawingCanvas.jsx";

// jsdom doesn't lay out real pixel positions - stub getBoundingClientRect so
// clicks at known clientX/clientY translate to predictable local coordinates.
beforeEach(() => {
  jest.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, right: 400, bottom: 280, width: 400, height: 280, x: 0, y: 0, toJSON: () => {},
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function getSvg(container) {
  return container.querySelector("svg");
}

// Canvas is 400px wide, so typing a view width in meters gives a round
// px/meter scale for easy assertions (400/20 = 20px/m, 400/400 = 1px/m).
function setViewWidth(meters) {
  const input = screen.getByLabelText("View width (meters)");
  userEvent.clear(input);
  if (String(meters) !== "") {
    userEvent.type(input, String(meters));
  }
}

describe("FieldDrawingCanvas (freestanding, no reference boundary)", () => {
  it("defaults to an 80m-wide view", () => {
    render(<FieldDrawingCanvas onFinish={jest.fn()} />);

    expect(screen.getByLabelText("View width (meters)")).toHaveValue(80);
    expect(screen.getByText("Shows ~80m × 56m")).toBeInTheDocument();
  });

  it("closes a shape and reports its vertices scaled to a user-chosen view width", () => {
    const onFinish = jest.fn();
    const { container } = render(<FieldDrawingCanvas onFinish={onFinish} />);
    setViewWidth(20); // 400px / 20m = 20px/meter
    const svg = getSvg(container);

    fireEvent.click(svg, { clientX: 20, clientY: 0 });
    fireEvent.click(svg, { clientX: 40, clientY: 0 });
    fireEvent.click(svg, { clientX: 40, clientY: 20 });
    fireEvent.click(screen.getByRole("button", { name: "Close Shape" }));

    expect(onFinish).toHaveBeenLastCalledWith([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
    ]);
  });

  it("calls onFinish(null) when cleared", () => {
    const onFinish = jest.fn();
    const { container } = render(<FieldDrawingCanvas onFinish={onFinish} />);
    const svg = getSvg(container);

    fireEvent.click(svg, { clientX: 0, clientY: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onFinish).toHaveBeenLastCalledWith(null);
  });

  it("disables Close Shape until at least 3 points are placed", () => {
    const { container } = render(<FieldDrawingCanvas onFinish={jest.fn()} />);
    setViewWidth(20);
    const svg = getSvg(container);

    expect(screen.getByRole("button", { name: "Close Shape" })).toBeDisabled();

    fireEvent.click(svg, { clientX: 0, clientY: 0 });
    fireEvent.click(svg, { clientX: 20, clientY: 0 });
    expect(screen.getByRole("button", { name: "Close Shape" })).toBeDisabled();

    fireEvent.click(svg, { clientX: 20, clientY: 20 });
    expect(screen.getByRole("button", { name: "Close Shape" })).toBeEnabled();
  });

  it("supports a much wider view for fields spanning hundreds of meters", () => {
    const onFinish = jest.fn();
    const { container } = render(<FieldDrawingCanvas onFinish={onFinish} />);
    setViewWidth(400); // 400px / 400m = 1px/meter
    const svg = getSvg(container);

    fireEvent.click(svg, { clientX: 50, clientY: 0 });
    fireEvent.click(svg, { clientX: 200, clientY: 0 });
    fireEvent.click(svg, { clientX: 200, clientY: 120 });
    fireEvent.click(screen.getByRole("button", { name: "Close Shape" }));

    expect(onFinish).toHaveBeenLastCalledWith([
      { x: 50, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 120 },
    ]);
  });

  it("keeps a shape's real-world coordinates unchanged when the view width changes mid-draw", () => {
    const onFinish = jest.fn();
    const { container } = render(<FieldDrawingCanvas onFinish={onFinish} />);
    setViewWidth(20);
    const svg = getSvg(container);

    fireEvent.click(svg, { clientX: 20, clientY: 0 });
    fireEvent.click(svg, { clientX: 40, clientY: 0 });

    // Widen the view, then finish the shape - the two already-placed points
    // must still read as 1m and 2m, not be reinterpreted under the new scale.
    setViewWidth(400);
    fireEvent.click(svg, { clientX: 40, clientY: 40 });
    fireEvent.click(screen.getByRole("button", { name: "Close Shape" }));

    expect(onFinish).toHaveBeenLastCalledWith([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 40, y: 40 },
    ]);
  });

  it("ignores an invalid view width and falls back to the default", () => {
    render(<FieldDrawingCanvas onFinish={jest.fn()} />);
    setViewWidth("");

    expect(screen.getByText("Shows ~80m × 56m")).toBeInTheDocument();
  });
});

describe("FieldDrawingCanvas (referenceVertices mode)", () => {
  // A 10x10 parent square anchored at (0,0) in its own local coordinate space.
  const referenceVertices = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it("converts clicks back into the parent's local coordinate space, ignoring view width", () => {
    const onFinish = jest.fn();
    const { container } = render(<FieldDrawingCanvas onFinish={onFinish} referenceVertices={referenceVertices} />);
    const svg = getSvg(container);

    expect(screen.queryByLabelText("View width (meters)")).not.toBeInTheDocument();

    // fit: minX=0, minY=0, scale = min((400-32)/10, (280-32)/10) = 24.8; padding = 16.
    fireEvent.click(svg, { clientX: 16, clientY: 16 });
    fireEvent.click(svg, { clientX: 264, clientY: 16 });
    fireEvent.click(svg, { clientX: 264, clientY: 264 });
    fireEvent.click(screen.getByRole("button", { name: "Close Shape" }));

    const [finalVertices] = onFinish.mock.calls.at(-1);
    expect(finalVertices[0].x).toBeCloseTo(0, 1);
    expect(finalVertices[0].y).toBeCloseTo(0, 1);
    expect(finalVertices[1].x).toBeCloseTo(10, 1);
    expect(finalVertices[1].y).toBeCloseTo(0, 1);
    expect(finalVertices[2].x).toBeCloseTo(10, 1);
    expect(finalVertices[2].y).toBeCloseTo(10, 1);
  });
});
