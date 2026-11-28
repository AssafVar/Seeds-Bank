using System.Threading.Channels;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace SeedsBank.Server.Email;

public record EmailMessage(string To, string Subject, string Html, string Text);

/// <summary>Queues an email to be sent in the background, so requests never wait for the mail server.</summary>
public interface IEmailOutbox
{
    void Enqueue(EmailMessage message);
}

public class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>SMTP server. Empty = email is off (messages are dropped with a warning).</summary>
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    /// <summary>STARTTLS on submission ports. Off only for the local Mailpit.</summary>
    public bool UseStartTls { get; set; } = true;
    public string User { get; set; } = "";
    public string Password { get; set; } = "";
    public string From { get; set; } = "";
    public string FromName { get; set; } = "Seeds-Bank";
}

/// <summary>
/// In-memory queue. A message still waiting when the app stops is lost, so only queue emails the person can ask for
/// again (e.g. "send the reset link again").
/// </summary>
public class EmailOutbox : IEmailOutbox
{
    private readonly Channel<EmailMessage> _channel = Channel.CreateBounded<EmailMessage>(
        new BoundedChannelOptions(1000) { FullMode = BoundedChannelFullMode.DropWrite });

    public void Enqueue(EmailMessage message) => _channel.Writer.TryWrite(message);

    public ChannelReader<EmailMessage> Reader => _channel.Reader;
}

public interface IEmailTransport
{
    Task SendAsync(EmailMessage message, CancellationToken ct);
}

public class SmtpEmailTransport(Microsoft.Extensions.Options.IOptions<EmailOptions> options) : IEmailTransport
{
    public async Task SendAsync(EmailMessage message, CancellationToken ct)
    {
        var o = options.Value;
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(o.FromName, o.From));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.Subject = message.Subject;
        mime.Body = new BodyBuilder { HtmlBody = message.Html, TextBody = message.Text }.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(o.Host, o.Port, o.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.None, ct);
        if (o.User.Length > 0) await smtp.AuthenticateAsync(o.User, o.Password, ct);
        await smtp.SendAsync(mime, ct);
        await smtp.DisconnectAsync(true, ct);
    }
}

/// <summary>
/// Sends queued emails, retrying a failed send twice. Never logs a subject, body, address, link or exception
/// message (they can hold breeders' data): only fixed text, the attempt count and the exception type.
/// </summary>
public class EmailDeliveryService(EmailOutbox outbox, IEmailTransport transport,
    Microsoft.Extensions.Options.IOptions<EmailOptions> options, ILogger<EmailDeliveryService> log) : BackgroundService
{
    private static readonly TimeSpan[] RetryDelays = [TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(30)];

    /// <summary>The wait between attempts. Tests replace it so the failure path doesn't take 35 seconds.</summary>
    internal Func<TimeSpan, CancellationToken, Task> Delay { get; init; } = Task.Delay;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var message in outbox.Reader.ReadAllAsync(stoppingToken))
            {
                if (options.Value.Host.Length == 0)
                {
                    log.LogWarning("Email is not configured (Email:Host); an email was dropped");
                    continue;
                }
                for (var attempt = 0; ; attempt++)
                {
                    try
                    {
                        await transport.SendAsync(message, stoppingToken);
                        // Proves the log is live; carries no content.
                        log.LogInformation("An email was sent after {Attempts} attempt(s)", attempt + 1);
                        break;
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        if (attempt >= RetryDelays.Length)
                        {
                            log.LogError("An email could not be sent after {Attempts} attempts ({ExceptionType})", attempt + 1, ex.GetType().Name);
                            break;
                        }
                        log.LogWarning("An email send failed (attempt {Attempt}, {ExceptionType}); retrying", attempt + 1, ex.GetType().Name);
                        await Delay(RetryDelays[attempt], stoppingToken);
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Shutting down.
        }
    }
}

public static class EmailExtensions
{
    // Queued and sent in the background over SMTP: Resend in production, Mailpit locally.
    public static IServiceCollection AddEmail(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        services.AddSingleton<EmailOutbox>();
        services.AddSingleton<IEmailOutbox>(sp => sp.GetRequiredService<EmailOutbox>());
        services.AddSingleton<IEmailTransport, SmtpEmailTransport>();
        services.AddHostedService<EmailDeliveryService>();
        return services;
    }
}
