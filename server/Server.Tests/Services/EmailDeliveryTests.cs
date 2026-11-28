using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SeedsBank.Server.Email;

namespace SeedsBank.Server.Tests.Services;

public class EmailDeliveryTests
{
    private static readonly EmailMessage Message =
        new("breeder@example.test", "Secret line Roma-A", "<p>Roma-A F3 notes</p>", "Roma-A F3 notes");

    private sealed class FakeTransport(int failuresBeforeSuccess) : IEmailTransport
    {
        public int Attempts { get; private set; }
        public List<EmailMessage> Sent { get; } = new();

        public Task SendAsync(EmailMessage message, CancellationToken ct)
        {
            Attempts++;
            if (Attempts <= failuresBeforeSuccess) throw new InvalidOperationException($"smtp refused {message.To}");
            Sent.Add(message);
            return Task.CompletedTask;
        }
    }

    private sealed class CapturingLogger : ILogger<EmailDeliveryService>
    {
        public List<(LogLevel Level, string Text)> Entries { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            lock (Entries) Entries.Add((logLevel, formatter(state, exception) + (exception?.ToString() ?? "")));
        }
    }

    private static async Task<(FakeTransport Transport, CapturingLogger Log)> DeliverAsync(
        int failuresBeforeSuccess, string host = "smtp.example.test")
    {
        var outbox = new EmailOutbox();
        var transport = new FakeTransport(failuresBeforeSuccess);
        var log = new CapturingLogger();
        var service = new EmailDeliveryService(outbox, transport,
            Options.Create(new EmailOptions { Host = host, From = "noreply@example.test" }), log)
        {
            Delay = (_, _) => Task.CompletedTask,
        };

        outbox.Enqueue(Message);
        await service.StartAsync(CancellationToken.None);
        var deadline = DateTime.UtcNow.AddSeconds(5);
        while (DateTime.UtcNow < deadline)
        {
            lock (log.Entries)
            {
                if (log.Entries.Count > 0 && log.Entries[^1].Level is LogLevel.Information or LogLevel.Error
                    || host.Length == 0 && log.Entries.Count > 0) break;
            }
            await Task.Delay(10);
        }
        await service.StopAsync(CancellationToken.None);
        return (transport, log);
    }

    [Fact]
    public async Task A_queued_email_is_sent()
    {
        var (transport, _) = await DeliverAsync(failuresBeforeSuccess: 0);

        Assert.Equal(Message, Assert.Single(transport.Sent));
    }

    [Fact]
    public async Task A_failed_send_is_retried_twice_then_given_up()
    {
        var (recovered, _) = await DeliverAsync(failuresBeforeSuccess: 2);
        Assert.Equal(3, recovered.Attempts);
        Assert.Single(recovered.Sent);

        var (failed, log) = await DeliverAsync(failuresBeforeSuccess: 10);
        Assert.Equal(3, failed.Attempts);
        Assert.Empty(failed.Sent);
        Assert.Contains(log.Entries, e => e.Level == LogLevel.Error);
    }

    [Fact]
    public async Task Without_an_smtp_host_emails_are_dropped_with_a_warning()
    {
        var (transport, log) = await DeliverAsync(failuresBeforeSuccess: 0, host: "");

        Assert.Equal(0, transport.Attempts);
        Assert.Contains(log.Entries, e => e.Level == LogLevel.Warning && e.Text.Contains("Email:Host"));
    }

    [Fact]
    public async Task Logs_never_carry_the_address_subject_body_or_exception_message()
    {
        var (_, log) = await DeliverAsync(failuresBeforeSuccess: 10);

        Assert.NotEmpty(log.Entries);
        foreach (var (_, text) in log.Entries)
        {
            Assert.DoesNotContain("breeder@example.test", text);
            Assert.DoesNotContain("Roma-A", text);
            Assert.DoesNotContain("smtp refused", text);
        }
    }

    [Fact]
    public void A_full_queue_drops_new_emails_instead_of_blocking_the_request()
    {
        var outbox = new EmailOutbox();
        for (var i = 0; i < 1001; i++) outbox.Enqueue(Message);

        Assert.Equal(1000, outbox.Reader.Count);
    }
}
