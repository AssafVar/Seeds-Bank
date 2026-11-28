using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Util;
using Microsoft.Extensions.Options;

namespace SeedsBank.Server.Storage;

public static class StorageExtensions
{
    // File storage: SeaweedFS locally, Cloudflare R2 (or any S3) in production.
    public static IServiceCollection AddFileStorage(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<StorageOptions>(configuration.GetSection(StorageOptions.SectionName));
        services.AddSingleton<IAmazonS3>(sp =>
        {
            var o = sp.GetRequiredService<IOptions<StorageOptions>>().Value;
            return new AmazonS3Client(
                new BasicAWSCredentials(o.AccessKey, o.SecretKey),
                new AmazonS3Config
                {
                    ServiceURL = o.ServiceUrl,
                    AuthenticationRegion = o.Region,
                    ForcePathStyle = true,
                    // Local S3 servers and R2 don't support all of the SDK's default checksum headers.
                    RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                    ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
                });
        });
        services.AddSingleton<IFileStorage, S3FileStorage>();
        return services;
    }

    // Local storage starts empty. In production the bucket is created once, by hand, as private.
    public static async Task CreateBucketIfMissingAsync(this WebApplication app)
    {
        var o = app.Services.GetRequiredService<IOptions<StorageOptions>>().Value;
        if (!o.CreateBucketIfMissing) return;

        var s3 = app.Services.GetRequiredService<IAmazonS3>();
        if (!await AmazonS3Util.DoesS3BucketExistV2Async(s3, o.Bucket))
        {
            await s3.PutBucketAsync(o.Bucket);
        }
    }
}
