namespace SeedsBank.Server.Storage;

/// <summary>
/// Allow-list of image types, checked by the file's actual bytes (magic numbers) as well as its extension.
/// The Content-Type the browser sent is never trusted: the stored object gets the type detected here.
/// </summary>
public static class ImageTypeValidator
{
    private record ImageType(string ContentType, string[] Extensions, Func<byte[], bool> Matches);

    private static readonly ImageType[] Allowed =
    [
        new("image/jpeg", [".jpg", ".jpeg"], b => StartsWith(b, [0xFF, 0xD8, 0xFF])),
        new("image/png", [".png"], b => StartsWith(b, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])),
        new("image/webp", [".webp"], b => b.Length >= 12 && StartsWith(b, "RIFF"u8) && b.AsSpan(8, 4).SequenceEqual("WEBP"u8)),
        new("image/gif", [".gif"], b => StartsWith(b, "GIF87a"u8) || StartsWith(b, "GIF89a"u8)),
    ];

    /// <summary>The trusted content type and canonical extension, or null when the file is not an allowed image.</summary>
    public static async Task<(string ContentType, string Extension)?> DetectAsync(IFormFile file, CancellationToken ct = default)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var header = new byte[16];
        await using var stream = file.OpenReadStream();
        var read = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, ct);
        var bytes = header[..read];

        var match = Allowed.FirstOrDefault(t => t.Extensions.Contains(ext) && t.Matches(bytes));
        return match is null ? null : (match.ContentType, match.Extensions[0]);
    }

    private static bool StartsWith(byte[] data, ReadOnlySpan<byte> prefix) => data.AsSpan().StartsWith(prefix);
}
