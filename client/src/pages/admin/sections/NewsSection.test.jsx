import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.jsx";
import { getNews, createNewsPost, updateNewsPost, deleteNewsPost } from "../../../services/serverCalls";
import NewsSection from "./NewsSection.jsx";

jest.mock("../../../services/serverCalls", () => ({
  getNews: jest.fn(),
  createNewsPost: jest.fn(),
  updateNewsPost: jest.fn(),
  deleteNewsPost: jest.fn(),
}));

describe("NewsSection", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders published posts", async () => {
    getNews.mockResolvedValue([{ id: 1, title: "New season", body: "Spring planting is underway." }]);

    renderWithProviders(<NewsSection />);

    expect(await screen.findByText("New season")).toBeInTheDocument();
  });

  it("disables Publish until both title and body are filled in", async () => {
    getNews.mockResolvedValue([]);

    renderWithProviders(<NewsSection />);
    await screen.findByText("No posts yet.");

    userEvent.click(screen.getByRole("button", { name: "New post" }));

    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();

    userEvent.type(screen.getByLabelText("Title"), "Hello");
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();

    userEvent.type(screen.getByLabelText("Body"), "World");
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  it("publishes a new post and prepends it to the list", async () => {
    getNews.mockResolvedValue([]);
    createNewsPost.mockResolvedValue({ id: 2, title: "Update", body: "Details here" });

    renderWithProviders(<NewsSection />);
    await screen.findByText("No posts yet.");

    userEvent.click(screen.getByRole("button", { name: "New post" }));
    userEvent.type(screen.getByLabelText("Title"), "Update");
    userEvent.type(screen.getByLabelText("Body"), "Details here");
    userEvent.click(screen.getByRole("button", { name: "Publish" }));

    expect(await screen.findByText("Update")).toBeInTheDocument();
    expect(createNewsPost).toHaveBeenCalledWith("Update", "Details here");
  });

  it("edits an existing post", async () => {
    getNews.mockResolvedValue([{ id: 1, title: "New season", body: "Spring planting is underway." }]);
    updateNewsPost.mockResolvedValue(true);

    renderWithProviders(<NewsSection />);
    await screen.findByText("New season");

    userEvent.click(document.querySelector('[data-testid="EditIcon"]').closest("button"));
    const titleInput = screen.getByLabelText("Title");
    userEvent.clear(titleInput);
    userEvent.type(titleInput, "Season update");
    userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateNewsPost).toHaveBeenCalledWith(1, "Season update", "Spring planting is underway.")
    );
  });

  it("removes a post once deleted", async () => {
    getNews.mockResolvedValue([{ id: 1, title: "New season", body: "Spring planting is underway." }]);
    deleteNewsPost.mockResolvedValue(true);

    renderWithProviders(<NewsSection />);
    await screen.findByText("New season");

    userEvent.click(document.querySelector('[data-testid="DeleteIcon"]').closest("button"));
    userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("New season")).not.toBeInTheDocument());
    expect(deleteNewsPost).toHaveBeenCalledWith(1);
  });
});
