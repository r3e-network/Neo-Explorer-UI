const { withApiTelemetry } = require("./lib/telemetry");

module.exports.config = {
  runtime: "nodejs",
};

const PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=neo,gas&vs_currencies=usd&include_24hr_change=true";
const CACHE_CONTROL = "s-maxage=60, stale-while-revalidate=300";
const UPSTREAM_TIMEOUT_MS = 5000;
const UNAVAILABLE_PRICE_PAYLOAD = {
  neo: { usd: null, usd_24h_change: null },
  gas: { usd: null, usd_24h_change: null },
  pricingUnavailable: true,
};

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(payload));
}

function buildFetchOptions() {
  const headers = {
    Accept: "application/json",
  };

  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return {
      headers,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    };
  }

  return { headers };
}

async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const upstream = await fetch(PRICE_URL, buildFetchOptions());
    if (!upstream.ok) {
      return sendJson(res, 200, UNAVAILABLE_PRICE_PAYLOAD, {
        "Cache-Control": "no-store",
      });
    }

    const payload = await upstream.json();
    return sendJson(res, 200, payload, {
      "Cache-Control": CACHE_CONTROL,
    });
  } catch {
    return sendJson(res, 200, UNAVAILABLE_PRICE_PAYLOAD, {
      "Cache-Control": "no-store",
    });
  }
}

module.exports = withApiTelemetry("prices", handler);
module.exports.config = {
  runtime: "nodejs",
};
