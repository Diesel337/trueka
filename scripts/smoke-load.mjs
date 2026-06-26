const baseUrl = normalizeBaseUrl(process.env.TRUEKA_BASE_URL ?? "http://localhost:3000");
const durationSeconds = readPositiveInteger("TRUEKA_SMOKE_DURATION_SECONDS", 20);
const concurrency = readPositiveInteger("TRUEKA_SMOKE_CONCURRENCY", 4);
const requestTimeoutMs = readPositiveInteger("TRUEKA_SMOKE_TIMEOUT_MS", 10000);

const paths = [
  "/api/health",
  "/api/ready",
  "/",
  "/items",
];

const results = [];
const failures = [];
const endAt = Date.now() + durationSeconds * 1000;

console.log(`Trueka smoke load: ${baseUrl}`);
console.log(`Duration: ${durationSeconds}s, concurrency: ${concurrency}, timeout: ${requestTimeoutMs}ms`);

await Promise.all(
  Array.from({ length: concurrency }, async (_, workerIndex) => {
    let pathIndex = workerIndex;

    while (Date.now() < endAt) {
      const path = paths[pathIndex % paths.length];
      pathIndex += 1;

      const startedAt = performance.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          redirect: "manual",
          signal: controller.signal,
        });
        const latencyMs = Math.round(performance.now() - startedAt);
        results.push({ latencyMs, status: response.status, path });

        if (response.status >= 500 || response.status === 0) {
          failures.push(`${path} -> ${response.status}`);
        }
      } catch (error) {
        const latencyMs = Math.round(performance.now() - startedAt);
        results.push({ latencyMs, status: 0, path });
        failures.push(`${path} -> ${error instanceof Error ? error.name : "request_failed"}`);
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }),
);

const latencies = results.map((result) => result.latencyMs).sort((a, b) => a - b);
const statusCounts = results.reduce((counts, result) => {
  counts[result.status] = (counts[result.status] ?? 0) + 1;

  return counts;
}, {});

const summary = {
  requests: results.length,
  failures: failures.length,
  statusCounts,
  minMs: percentile(latencies, 0),
  p50Ms: percentile(latencies, 50),
  p95Ms: percentile(latencies, 95),
  maxMs: percentile(latencies, 100),
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) {
  console.log("First failures:");
  failures.slice(0, 10).forEach((failure) => console.log(`- ${failure}`));
  process.exitCode = 1;
}

function normalizeBaseUrl(value) {
  return value.trim().replace(/\/$/, "");
}

function readPositiveInteger(name, fallback) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(sortedValues, value) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.ceil((value / 100) * sortedValues.length) - 1;

  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}
