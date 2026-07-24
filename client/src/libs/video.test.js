import { getEmbedUrl } from "./video";

describe("getEmbedUrl", () => {
  it("converts a youtube.com watch URL to an embed URL", () => {
    expect(getEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("converts a youtu.be short URL to an embed URL", () => {
    expect(getEmbedUrl("https://youtu.be/abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("converts a vimeo.com URL to an embed URL", () => {
    expect(getEmbedUrl("https://vimeo.com/12345")).toBe("https://player.vimeo.com/video/12345");
  });

  it("strips a leading www. before matching the host", () => {
    expect(getEmbedUrl("https://www.vimeo.com/12345")).toBe("https://player.vimeo.com/video/12345");
  });

  it("returns the original URL for a youtube.com link with no v parameter", () => {
    expect(getEmbedUrl("https://www.youtube.com/somepage")).toBe("https://www.youtube.com/somepage");
  });

  it("returns the original URL for an unrecognized host", () => {
    expect(getEmbedUrl("https://example.com/video/1")).toBe("https://example.com/video/1");
  });

  it("returns the original (invalid) string when it isn't a parseable URL", () => {
    expect(getEmbedUrl("not-a-url")).toBe("not-a-url");
  });
});
