// Shared mock factory for tests that replace services/serverCalls (the real
// module pulls in ESM-only nanoid, which CRA's Jest cannot parse).
export const mockServerCalls = (names) => ({
  extractErrorMessage: (err, fallback = "Something went wrong. Please try again.") =>
    err?.response?.data?.message ?? fallback,
  ...Object.fromEntries(names.map((n) => [n, jest.fn()])),
});
