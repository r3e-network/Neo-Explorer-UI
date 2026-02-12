import { rpc } from "@/services/api";

const SCALAR_TYPES = new Set([
  "Signature",
  "Boolean",
  "Integer",
  "Hash160",
  "Hash256",
  "ByteArray",
  "PublicKey",
  "String",
  "InteropInterface",
  "Any",
]);

const TYPE_MAP = {
  signature: "Signature",
  boolean: "Boolean",
  integer: "Integer",
  hash160: "Hash160",
  hash256: "Hash256",
  bytearray: "ByteArray",
  bytestring: "ByteArray",
  publickey: "PublicKey",
  string: "String",
  array: "Array",
  map: "Map",
  interopinterface: "InteropInterface",
  any: "Any",
};

function normalizeType(type = "") {
  const value = String(type || "").trim();
  if (!value) return "String";

  return TYPE_MAP[value.toLowerCase()] || value;
}

function inferParamType(value) {
  if (value === null || value === undefined) {
    return { type: "Any" };
  }

  if (typeof value === "boolean") {
    return { type: "Boolean", value };
  }

  if (typeof value === "number") {
    return { type: "Integer", value: Number.isFinite(value) ? String(Math.trunc(value)) : "0" };
  }

  if (typeof value === "string") {
    return { type: "String", value };
  }

  if (Array.isArray(value)) {
    return { type: "Array", value: value.map((item) => inferParamType(item)) };
  }

  if (typeof value === "object") {
    return {
      type: "Map",
      value: Object.entries(value).map(([key, itemValue]) => ({
        key: { type: "String", value: String(key) },
        value: inferParamType(itemValue),
      })),
    };
  }

  return { type: "String", value: String(value) };
}

function parseJson(value, expectedType) {
  try {
    const parsed = JSON.parse(String(value || ""));

    if (expectedType === "Array") {
      if (!Array.isArray(parsed)) throw new Error("must be a JSON array");
      return parsed.map((item) => inferParamType(item));
    }

    if (expectedType === "Map") {
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => {
          if (!entry || typeof entry !== "object" || !("key" in entry) || !("value" in entry)) {
            throw new Error("must be an array of { key, value } objects");
          }
          return {
            key: inferParamType(entry.key),
            value: inferParamType(entry.value),
          };
        });
      }

      if (!parsed || typeof parsed !== "object") {
        throw new Error("must be a JSON object");
      }

      return Object.entries(parsed).map(([key, itemValue]) => ({
        key: { type: "String", value: String(key) },
        value: inferParamType(itemValue),
      }));
    }

    return parsed;
  } catch (err) {
    throw new Error(`Invalid ${expectedType} parameter JSON: ${err.message || String(err)}`);
  }
}

export function buildContractParam(type, rawValue) {
  const normalizedType = normalizeType(type);

  if (normalizedType === "Array") {
    return { type: "Array", value: parseJson(rawValue, "Array") };
  }

  if (normalizedType === "Map") {
    return { type: "Map", value: parseJson(rawValue, "Map") };
  }

  if (normalizedType === "Any") {
    return { type: "Any" };
  }

  if (!SCALAR_TYPES.has(normalizedType)) {
    throw new Error(`Unsupported contract param type: ${normalizedType}`);
  }

  if (normalizedType === "Boolean") {
    const rawText = String(rawValue || "").trim().toLowerCase();
    if (rawText === "true" || rawText === "1") return { type: "Boolean", value: true };
    if (rawText === "false" || rawText === "0") return { type: "Boolean", value: false };
    throw new Error("Boolean parameter must be true/false/1/0");
  }

  if (normalizedType === "Integer") {
    const text = String(rawValue || "").trim();
    if (!/^-?\d+$/.test(text)) {
      throw new Error("Integer parameter must be a whole number");
    }
    return { type: "Integer", value: text };
  }

  const value = rawValue === undefined || rawValue === null ? "" : String(rawValue);
  return { type: normalizedType, value };
}

export async function invokeContractFunction(contractHash, methodName, rawParams = []) {
  const contractParams = rawParams.map((item) => buildContractParam(item?.type, item?.value));
  return rpc("invokefunction", [contractHash, methodName, contractParams]);
}
