/**
 * Safe markdown-subset tokenizer for untrusted assistant output.
 *
 * SECURITY CONTRACT
 * -----------------
 * Model output is partly attacker-controlled: it summarises on-chain data such as
 * token names and NNS domains that anyone can set. This module therefore never
 * produces an HTML string. It emits a plain-data block/inline AST (objects with
 * string/boolean/array fields only — no functions, no markup) which
 * `AgentRichText.vue` renders through Vue's `h()`. Every character of model output
 * lands in a DOM text node or in an attribute value that Vue escapes, so there is
 * no HTML parsing stage and therefore no injection surface.
 *
 * Consequences that are intentional and must not be "fixed":
 *  - Raw HTML in the source (`<script>`, `<img onerror=…>`, `<div onclick=…>`) is
 *    emitted as literal text and rendered visibly. It is never interpreted.
 *  - Markdown links (`[label](href)`) are NOT supported: they are literal text.
 *    Bare URLs are NOT linkified. The only links this pipeline can produce are
 *    internal router paths built from the frozen `ENTITY_ROUTES` table below.
 *  - Unknown, unbalanced or unclosed markers degrade to literal text. The parser
 *    is total: it never throws and always returns an array.
 *
 * Supported subset: `#`/`##`/`###` headings, blank-line separated paragraphs,
 * single-level `-`/`*`/`1.` lists, fenced and inline code, `**strong**`,
 * `*em*`/`_em_`. Everything else is literal text.
 */

/**
 * Route templates for entities detected in assistant prose.
 *
 * `null` means "there is no unambiguous target for this chain" — the renderer then
 * shows plain selectable text instead of a link. In an explorer, no link beats a
 * wrong link. Paths are verified against `src/router/index.js`; note the canonical
 * N3 transaction route is `/transaction-info/:txhash` (`/transaction` is a redirect
 * to the transaction list and must never be produced here).
 *
 * @type {Readonly<Record<string, Readonly<Record<'n3'|'neox'|'both', string|null>>>>}
 */
export const ENTITY_ROUTES = Object.freeze({
  n3Address: Object.freeze({
    n3: "/account-profile/{v}",
    neox: null,
    both: "/account-profile/{v}",
  }),
  evmAddress: Object.freeze({
    n3: null,
    neox: "/x/address/{v}",
    both: null,
  }),
  hash32: Object.freeze({
    n3: "/transaction-info/{v}",
    neox: "/x/tx/{v}",
    both: null,
  }),
  blockHeight: Object.freeze({
    n3: "/block-info/{v}",
    neox: "/x/block-info/{v}",
    both: null,
  }),
});

/** Guards against pathological nesting in adversarial input (stack safety). */
const MAX_INLINE_DEPTH = 6;

const FENCE_RE = /^ {0,3}```(.*)$/;
const CLOSING_FENCE_RE = /^ {0,3}```\s*$/;
const HEADING_RE = /^ {0,3}(#{1,3})\s+(.+)$/;
const UNORDERED_RE = /^ {0,3}[-*]\s+(.*)$/;
const ORDERED_RE = /^ {0,3}\d{1,9}[.)]\s+(.*)$/;

/**
 * Entity scanner. Order matters: the 64-hex form is tried before the 40-hex form
 * so a transaction hash is never mis-read as an address. The `block` keyword is
 * spelled out case-by-case instead of using the `i` flag, because N3 addresses
 * must keep their leading uppercase `N`.
 */
const ENTITY_SOURCE = [
  "\\b0x[0-9a-fA-F]{64}\\b",
  "\\b0x[0-9a-fA-F]{40}\\b",
  "\\bN[A-Za-z0-9]{33}\\b",
  "\\b[Bb][Ll][Oo][Cc][Kk]\\s+#?\\d{1,9}\\b",
].join("|");

const WORD_CHAR_RE = /[A-Za-z0-9]/;

function normalize(text) {
  if (typeof text !== "string" || !text) return "";
  return text.replace(/\r\n?/g, "\n");
}

function sanitizeLang(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#._-]/g, "")
    .slice(0, 24);
}

function classifyEntity(raw) {
  if (raw.charAt(0) === "0") return raw.length === 66 ? "hash32" : "evmAddress";
  if (raw.charAt(0) === "N") return "n3Address";
  return "blockHeight";
}

/**
 * Splits a literal text run into text and entity inline nodes.
 * Never runs over `code` nodes — code is always literal.
 *
 * @param {string} value
 * @returns {Array<{type:'text',value:string}|{type:'entity',kind:string,value:string}>}
 */
function splitEntities(value) {
  if (!value) return [];
  const scanner = new RegExp(ENTITY_SOURCE, "g");
  const out = [];
  let last = 0;
  let match = scanner.exec(value);

  while (match !== null) {
    const raw = match[0];
    if (match.index > last) {
      out.push({ type: "text", value: value.slice(last, match.index) });
    }
    const kind = classifyEntity(raw);
    if (kind === "blockHeight") {
      // Keep the "block #" prefix as prose and link only the number.
      const digits = raw.replace(/^\D+/, "");
      const prefix = raw.slice(0, raw.length - digits.length);
      if (prefix) out.push({ type: "text", value: prefix });
      out.push({ type: "entity", kind, value: digits });
    } else {
      out.push({ type: "entity", kind, value: raw });
    }
    last = match.index + raw.length;
    if (scanner.lastIndex <= match.index) scanner.lastIndex = match.index + 1;
    match = scanner.exec(value);
  }

  if (last === 0) return [{ type: "text", value }];
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

/**
 * Tokenizes emphasis and code spans. Unbalanced markers stay literal.
 *
 * @param {string} str
 * @param {number} depth
 * @returns {Array<object>}
 */
function parseInline(str, depth) {
  if (!str) return [];
  if (depth >= MAX_INLINE_DEPTH) return [{ type: "text", value: str }];

  const out = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    if (buffer) {
      out.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  while (i < str.length) {
    const ch = str[i];

    if (ch === "`") {
      const end = str.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ type: "code", value: str.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }

    if (ch === "*" && str[i + 1] === "*") {
      const end = str.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ type: "strong", children: parseInline(str.slice(i + 2, end), depth + 1) });
        i = end + 2;
        continue;
      }
      buffer += "**";
      i += 2;
      continue;
    }

    if (ch === "*" || ch === "_") {
      const end = str.indexOf(ch, i + 1);
      const openerOk = !/\s/.test(str[i + 1] || " ");
      // `_` must not split identifiers such as snake_case_name.
      const boundaryOk =
        ch !== "_" ||
        ((i === 0 || !WORD_CHAR_RE.test(str[i - 1])) &&
          (end + 1 >= str.length || !WORD_CHAR_RE.test(str[end + 1])));
      if (end > i + 1 && openerOk && boundaryOk) {
        flush();
        out.push({ type: "em", children: parseInline(str.slice(i + 1, end), depth + 1) });
        i = end + 1;
        continue;
      }
      buffer += ch;
      i += 1;
      continue;
    }

    buffer += ch;
    i += 1;
  }

  flush();
  return out;
}

function applyEntities(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.type === "text") {
      for (const piece of splitEntities(node.value)) out.push(piece);
    } else if (node.type === "strong" || node.type === "em") {
      out.push({ type: node.type, children: applyEntities(node.children) });
    } else {
      out.push(node);
    }
  }
  return out;
}

function parseInlineContent(str) {
  return applyEntities(parseInline(str, 0));
}

/**
 * Parses assistant text into a plain-data block AST.
 * Total function: never throws, always returns an array.
 *
 * @param {string} text
 * @returns {Array<object>} Block[]
 */
export function parseAgentMarkdown(text) {
  const source = normalize(text);
  if (!source.trim()) return [];

  const lines = source.split("\n");
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const value = paragraph.join("\n");
    paragraph = [];
    if (!value.trim()) return;
    blocks.push({ type: "paragraph", inline: parseInlineContent(value) });
  };

  const flushList = () => {
    if (!list) return;
    if (list.items.length) blocks.push(list);
    list = null;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const fence = FENCE_RE.exec(line);
    if (fence) {
      flushParagraph();
      flushList();
      const lang = sanitizeLang(fence[1]);
      const body = [];
      i += 1;
      while (i < lines.length && !CLOSING_FENCE_RE.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "code", lang, code: body.join("\n") });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        inline: parseInlineContent(heading[2].trim()),
      });
      continue;
    }

    const ordered = ORDERED_RE.exec(line);
    const unordered = ordered ? null : UNORDERED_RE.exec(line);
    if (ordered || unordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { type: "list", ordered: isOrdered, items: [] };
      }
      list.items.push(parseInlineContent((ordered ? ordered[1] : unordered[1]).trim()));
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}
