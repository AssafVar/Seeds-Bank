import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.jsx";
import { getSiteContent, uploadGalleryImage, deleteGalleryImage } from "../../../services/serverCalls";
import GallerySection from "./GallerySection.jsx";

jest.mock("../../../services/serverCalls", () => ({
  getSiteContent: jest.fn(),
  uploadGalleryImage: jest.fn(),
  deleteGalleryImage: jest.fn(),
  SERVER_BASE_URL: "http://localhost:8080",
}));

describe("GallerySection", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows empty-state copy when there are no photos", async () => {
    getSiteContent.mockResolvedValue({ images: [] });

    renderWithProviders(<GallerySection />);

    expect(await screen.findByText("No photos uploaded yet.")).toBeInTheDocument();
  });

  it("renders existing gallery images", async () => {
    getSiteContent.mockResolvedValue({ images: [{ id: 1, url: "/uploads/a.jpg", caption: "Garden" }] });

    renderWithProviders(<GallerySection />);

    expect(await screen.findByAltText("Garden")).toBeInTheDocument();
  });

  it("keeps Upload disabled until a file is selected", async () => {
    getSiteContent.mockResolvedValue({ images: [] });

    renderWithProviders(<GallerySection />);
    await screen.findByText("No photos uploaded yet.");

    expect(screen.getByRole("button", { name: "Upload" })).toBeDisabled();
  });

  it("uploads a selected file and prepends it to the gallery", async () => {
    getSiteContent.mockResolvedValue({ images: [] });
    uploadGalleryImage.mockResolvedValue({ id: 2, url: "/uploads/b.jpg", caption: "New photo" });

    renderWithProviders(<GallerySection />);
    await screen.findByText("No photos uploaded yet.");

    const file = new File(["fake-bytes"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]');
    userEvent.upload(fileInput, file);
    userEvent.type(screen.getByLabelText("Caption (optional)"), "New photo");
    userEvent.click(screen.getByRole("button", { name: "Upload" }));

    expect(await screen.findByText("Uploaded")).toBeInTheDocument();
    expect(uploadGalleryImage).toHaveBeenCalledWith(file, "New photo");
    expect(await screen.findByAltText("New photo")).toBeInTheDocument();
  });

  it("removes a photo after confirming its deletion", async () => {
    getSiteContent.mockResolvedValue({ images: [{ id: 1, url: "/uploads/a.jpg", caption: "Garden" }] });
    deleteGalleryImage.mockResolvedValue(true);

    renderWithProviders(<GallerySection />);
    await screen.findByAltText("Garden");

    userEvent.click(document.querySelector('[data-testid="DeleteIcon"]').closest("button"));
    userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteGalleryImage).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByAltText("Garden")).not.toBeInTheDocument());
  });
});
