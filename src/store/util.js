import { format } from "timeago.js";
import {
  base64ToBytes,
  bytesToHex,
  bytesToUtf8,
  isPublicKeyHex,
  isScriptHashHex,
  reverseHex,
  scriptHashHexToAddress,
} from "@/utils/neoHelpers";

function numFormat(num) {
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function convertToken(token, decimal) {
  return numFormat(parseFloat((token * Math.pow(10, -decimal)).toFixed(8)));
}

function convertTime(ts, locale) {
  // this.$i18n.locale
  switch (locale) {
    case "cn":
      return format(ts, "zh_CN");
    case "en":
      return format(ts, "en_short");
    default:
      return format(ts);
  }
}

function convertPreciseTime(time) {
  const date = new Date(time);
  const y = date.getFullYear();
  const m = date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
  const d = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
  const h = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
  const mi = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
  const s = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
  return (
    m + "-" + d + "-" + y + " " + h + ":" + mi + ":" + s + " " + "UTC+" + (0 - new Date().getTimezoneOffset() / 60)
  );
}

function convertISOTime(time) {
  const date = new Date(time);
  const y = date.getFullYear();
  const m = date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
  const d = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
  const h = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
  const mi = date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
  const s = date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
  return y + "-" + m + "-" + d + " " + h + ":" + mi + ":" + s;
}

function scriptHashToAddress(hash) {
  if (!hash || typeof hash !== "string") return "";
  return scriptHashHexToAddress(hash) || hash;
}

function responseConverter(_key, val) {
  if (typeof val === "object") {
    if (val["type"] === "ByteString" && typeof val["value"] === "string") {
      const bytes = base64ToBytes(val["value"]);
      const hex = bytesToHex(bytes);
      if (isPublicKeyHex(hex)) {
        val["type"] = "PublicKey";
        val["value"] = "0x" + hex;
      } else if (isScriptHashHex(hex)) {
        const reversed = reverseHex(hex);
        val["type"] = "ScriptHash";
        val["value"] = reversed ? "0x" + reversed : "0x" + hex;
      } else if (/^([0-9a-f]{64})$/i.test(hex)) {
        val["type"] = "ScriptHash";
        val["value"] = "0x" + hex;
      } else {
        const text = bytesToUtf8(bytes);
        if (text && /^[\x20-\x7F]*$/.test(text)) {
          val["type"] = "String";
          val["value"] = text;
        } else {
          val["type"] = "HexString";
          val["value"] = hex;
        }
      }
    } else if (val["type"] === "Buffer" && typeof val["value"] === "string") {
      const bytes = base64ToBytes(val["value"]);
      const hex = bytesToHex(bytes);
      const text = bytesToUtf8(bytes);
      if (text && /^[\x20-\x7F]*$/.test(text)) {
        val["type"] = "String";
        val["value"] = text;
      } else {
        val["type"] = "BigInteger";
        val["value"] = Number.parseInt(hex || "0", 16);
      }
    }
  }
  return val;
}

export { convertToken, convertTime, convertPreciseTime, scriptHashToAddress, responseConverter, convertISOTime };
