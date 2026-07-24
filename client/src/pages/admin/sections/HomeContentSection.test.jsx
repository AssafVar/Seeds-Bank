import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../test-utils/renderWithProviders.jsx";
import { getSiteContent, updateSiteContent } from "../../../services/serverCalls";
import HomeContentSection from "./HomeContentSection.jsx";

jest.mock("../../../services/serverCalls", () => ({
  getSiteContent: jest.fn(),
  updateSiteContent: jest.fn(),
}));

describe("HomeContentSection", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("prefills the form with the existing site content", async () => {
    getSiteContent.mockResolvedValue({ description: "About us", contactEmail: "hello@seedsbank.test" });

    renderWithProviders(<HomeContentSection />);

    expect(await screen.findByLabelText("Description")).toHaveValue("About us");
    expect(screen.getByLabelText("Contact email")).toHaveValue("hello@seedsbank.test");
  });

  it("starts with blank fields when there is no site content yet", async () => {
    getSiteContent.mockResolvedValue(null);

    renderWithProviders(<HomeContentSection />);

    expect(await screen.findByLabelText("Description")).toHaveValue("");
  });

  it("saves edited content and shows a success message", async () => {
    getSiteContent.mockResolvedValue({ description: "Old copy" });
    updateSiteContent.mockResolvedValue(true);

    renderWithProviders(<HomeContentSection />);
    const description = await screen.findByLabelText("Description");

    userEvent.clear(description);
    userEvent.type(description, "New copy");
    userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(updateSiteContent).toHaveBeenCalledWith(expect.objectContaining({ description: "New copy" }));
  });

  it("shows a failure message when saving does not succeed", async () => {
    getSiteContent.mockResolvedValue({ description: "Old copy" });
    updateSiteContent.mockResolvedValue(false);

    renderWithProviders(<HomeContentSection />);
    await screen.findByLabelText("Description");

    userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Failed to save")).toBeInTheDocument();
  });
});
