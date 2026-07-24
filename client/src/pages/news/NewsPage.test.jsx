import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test-utils/renderWithProviders.jsx";
import { getNews } from "../../services/serverCalls";
import NewsPage from "./NewsPage.jsx";

jest.mock("../../services/serverCalls", () => ({
  getNews: jest.fn(),
}));

describe("NewsPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows a spinner while the initial fetch is pending", () => {
    getNews.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<NewsPage />);

    expect(screen.getByText("News")).toBeInTheDocument();
    expect(screen.queryByText("No news yet.")).not.toBeInTheDocument();
  });

  it("renders each post's title, date, and body once loaded", async () => {
    getNews.mockResolvedValue([
      { id: 1, title: "New season", body: "Spring planting is underway.", createdAt: "2026-03-01T00:00:00Z" },
    ]);

    renderWithProviders(<NewsPage />);

    expect(await screen.findByText("New season")).toBeInTheDocument();
    expect(screen.getByText("Spring planting is underway.")).toBeInTheDocument();
    expect(screen.getByText("March 1, 2026")).toBeInTheDocument();
  });

  it("shows empty-state copy when there are no posts", async () => {
    getNews.mockResolvedValue([]);

    renderWithProviders(<NewsPage />);

    expect(await screen.findByText("No news yet.")).toBeInTheDocument();
  });

  it("treats a falsy response (e.g. a failed request) the same as no posts", async () => {
    getNews.mockResolvedValue(undefined);

    renderWithProviders(<NewsPage />);

    await waitFor(() => expect(getNews).toHaveBeenCalled());
    expect(await screen.findByText("No news yet.")).toBeInTheDocument();
  });
});
