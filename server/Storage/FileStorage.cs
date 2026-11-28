using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;

namespace SeedsBank.Server.Storage;

/// <summary>Private object storage. Swap providers (SeaweedFS, Cloudflare R2, S3) through configuration only.</summary>
public interface IFileStorage
{
    Task UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default);

    /// <summary>Short-lived signed URL the browser can show inline (e.g. in an &lt;img&gt;).</summary>
    Task<string> GetReadUrlAsync(string key, TimeSpan lifetime);

    Task DeleteAsync(string key, CancellationToken ct = default);
}

public class StorageOptions
{
    public const string SectionName = "Storage";

    public string ServiceUrl { get; set; } = "";
    public string Bucket { get; set; } = "";
    public string AccessKey { get; set; } = "";
    public string SecretKey { get; set; } = "";

    /// <summary>"us-east-1" for local SeaweedFS, "auto" for Cloudflare R2.</summary>
    public string Region { get; set; } = "us-east-1";

    /// <summary>Origin browsers load stored files from (scheme://host[:port]); added to the CSP's img-src.</summary>
    public string? PublicOrigin { get; set; }

    /// <summary>Development only: create the bucket on startup. Production buckets are created once, by hand, as private.</summary>
    public bool CreateBucketIfMissing { get; set; }
}

public class S3FileStorage(IAmazonS3 s3, IOptions<StorageOptions> storageOptions) : IFileStorage
{
    private readonly StorageOptions options = storageOptions.Value;

    public async Task UploadAsync(string key, Stream content, string contentType, CancellationToken ct = default)
    {
        await s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = options.Bucket,
            Key = key,
            InputStream = content,
            ContentType = contentType,
        }, ct);
    }

    public Task<string> GetReadUrlAsync(string key, TimeSpan lifetime)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = options.Bucket,
            Key = key,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.Add(lifetime),
            // The SDK signs https:// URLs by default; follow the configured endpoint (plain http for local dev).
            Protocol = options.ServiceUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ? Protocol.HTTP : Protocol.HTTPS,
        };
        return s3.GetPreSignedURLAsync(request);
    }

    public async Task DeleteAsync(string key, CancellationToken ct = default) =>
        await s3.DeleteObjectAsync(options.Bucket, key, ct);
}
