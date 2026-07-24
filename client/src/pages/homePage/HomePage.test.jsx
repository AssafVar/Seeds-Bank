import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, buildAuthValue } from "../../test-utils/renderWithProviders.jsx";
import { getSiteContent } from "../../services/serverCalls";
import HomePage from "./HomePage.jsx";

jest.mock("../../services/serverCalls", () => ({
  getSiteContent: jest.fn(),
  SERVER_BASE_URL: "http://localhost:8080",
}));

describe("HomePage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("greets an anonymous visitor by default", async () => {
    getSiteContent.mockResolvedValue(null);

    renderWithProviders(<HomePage />);

    expect(screen.getByText("Welcome new member")).toBeInTheDocument();
    await waitFor(() => expect(getSiteContent).toHaveBeenCalled());
  });

  it("greets a logged-in user by name", async () => {
    getSiteContent.mockResolvedValue(null);

    renderWithProviders(<HomePage />, { authValue: buildAuthValue({ activeUser: { userName: "Casey" } }) });

    expect(screen.getByText("Welcome Casey")).toBeInTheDocument();
    await waitFor(() => expect(getSiteContent).toHaveBeenCalled());
  });

  it("renders the site content sections once the fetch resolves", async () => {
    getSiteContent.mockResolvedValue({
      description: "A community seed bank.",
      contactEmail: "hello@seedsbank.test",
      images: [{ id: 1, url: "/uploads/a.jpg", caption: "Garden" }],
      videoUrl: "https://youtu.be/abc123",
    });

    renderWithProviders(<HomePage />);

    expect(await screen.findByText("A community seed bank.")).toBeInTheDocument();
    expect(screen.getByText("Email: hello@seedsbank.test")).toBeInTheDocument();
    expect(screen.getByAltText("Garden")).toBeInTheDocument();
  });

  it("falls back to empty-state copy in each section when site content has no data", async () => {
    getSiteContent.mockResolvedValue(null);

    renderWithProviders(<HomePage />);

    expect(await screen.findByText("Contact info coming soon.")).toBeInTheDocument();
    expect(screen.getByText("No photos yet.")).toBeInTheDocument();
    expect(screen.getByText("No video yet.")).toBeInTheDocument();
  });
});
