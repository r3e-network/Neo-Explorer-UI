const { withApiTelemetry } = require("./lib/telemetry");

module.exports.config = {
  runtime: "nodejs",
  maxDuration: 10,
};

const NGD_BASE = "https://monitor.ngd.network/api";
const ALLOWED_NETWORKS = new Set(["N3main", "N3test"]);
const ALLOWED_RESOURCES = new Set(["seeds", "latest"]);
const FETCH_TIMEOUT_MS = 8000;

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`NGD monitor responded ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const network = String(req.query?.network || "").trim();
  const resource = String(req.query?.resource || "").trim();

  if (!ALLOWED_NETWORKS.has(network) || !ALLOWED_RESOURCES.has(resource)) {
    return res.status(400).json({ error: "Unsupported monitor query" });
  }

  const data = await fetchJsonWithTimeout(`${NGD_BASE}/${network}/${resource}`);
  res.setHeader("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
  return res.status(200).json(Array.isArray(data) ? data : []);
}

module.exports = withApiTelemetry("network-monitor", handler);
