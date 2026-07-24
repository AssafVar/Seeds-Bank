import { render } from "@testing-library/react";
import Spinner, { InlineSpinner } from "./Spinner.jsx";

describe("Spinner", () => {
  it("renders without crashing with default props", () => {
    const { container } = render(<Spinner />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it("passes through extra props (e.g. data-testid) to the wrapper", () => {
    const { getByTestId } = render(<Spinner data-testid="page-spinner" />);

    expect(getByTestId("page-spinner")).toBeInTheDocument();
  });
});

describe("InlineSpinner", () => {
  it("renders without crashing with default props", () => {
    const { container } = render(<InlineSpinner />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it("passes through extra props (e.g. data-testid) to the element", () => {
    const { getByTestId } = render(<InlineSpinner data-testid="inline-spinner" />);

    expect(getByTestId("inline-spinner")).toBeInTheDocument();
  });
});
