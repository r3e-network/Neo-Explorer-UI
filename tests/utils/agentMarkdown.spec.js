import { describe, it, expect } from "vitest";
import router from "@/router";
import { ENTITY_ROUTES, parseAgentMarkdown } from "@/utils/agentMarkdown";

const N3_ADDRESS = "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w";
const EVM_ADDRESS = `0x${"ab".repeat(20)}`;
const HASH_32 = `0x${"cd".repeat(32)}`;

const SAMPLE_VALUES = {
  n3Address: N3_ADDRESS,
  evmAddress: EVM_ADDRESS,
  hash32: HASH_32,
  blockHeight: "1234567",
};

const ALLOWED_BLOCK_TYPES = new Set(["paragraph", "heading", "list", "code"]);
const ALLOWED_INLINE_TYPES = new Set(["text", "strong", "em", "code", "entity"]);
const ALLOWED_ENTITY_KINDS = new Set(["n3Address", "evmAddress", "hash32", "blockHeight"]);

function flattenText(inline) {
  return inline
    .map((node) => {
      if (node.type === "text" || node.type === "code" || node.type === "entity") return node.value;
      if (node.type === "strong" || node.type === "em") return flattenText(node.children);
      return "";
    })
    .join("");
}

function assertValidInline(inline) {
  expect(Array.isArray(inline)).toBe(true);
  for (const node of inline) {
    expect(ALLOWED_INLINE_TYPES.has(node.type)).toBe(true);
    if (node.type === "strong" || node.type === "em") {
      assertValidInline(node.children);
    } else if (node.type === "entity") {
      expect(ALLOWED_ENTITY_KINDS.has(node.kind)).toBe(true);
      expect(typeof node.value).toBe("string");
    } else {
      expect(typeof node.value).toBe("string");
    }
  }
}

function assertValidBlocks(blocks) {
  expect(Array.isArray(blocks)).toBe(true);
  for (const block of blocks) {
    expect(ALLOWED_BLOCK_TYPES.has(block.type)).toBe(true);
    if (block.type === "code") {
      expect(typeof block.lang).toBe("string");
      expect(typeof block.code).toBe("string");
    } else if (block.type === "list") {
      expect(typeof block.ordered).toBe("boolean");
      block.items.forEach(assertValidInline);
    } else {
      if (block.type === "heading") expect([1, 2, 3]).toContain(block.level);
      assertValidInline(block.inline);
    }
  }
}

// Deterministic PRNG so a fuzz failure is always reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("parseAgentMarkdown — structure", () => {
  it("returns an empty array for empty, blank and non-string input", () => {
    expect(parseAgentMarkdown("")).toEqual([]);
    expect(parseAgentMarkdown("   \n\n  ")).toEqual([]);
    expect(parseAgentMarkdown(undefined)).toEqual([]);
    expect(parseAgentMarkdown(null)).toEqual([]);
    expect(parseAgentMarkdown(42)).toEqual([]);
    expect(parseAgentMarkdown({})).toEqual([]);
  });

  it("splits paragraphs on blank lines", () => {
    const blocks = parseAgentMarkdown("first para\n\nsecond para");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "paragraph"]);
    expect(flattenText(blocks[0].inline)).toBe("first para");
    expect(flattenText(blocks[1].inline)).toBe("second para");
  });

  it("parses the three supported heading levels and rejects deeper ones", () => {
    const blocks = parseAgentMarkdown("# one\n\n## two\n\n### three\n\n#### four\n\n#");
    expect(blocks[0]).toMatchObject({ type: "heading", level: 1 });
    expect(blocks[1]).toMatchObject({ type: "heading", level: 2 });
    expect(blocks[2]).toMatchObject({ type: "heading", level: 3 });
    expect(blocks[3].type).toBe("paragraph");
    expect(flattenText(blocks[3].inline)).toBe("#### four");
    expect(blocks[4].type).toBe("paragraph");
    expect(flattenText(blocks[4].inline)).toBe("#");
  });

  it("groups unordered and ordered list runs into single-level lists", () => {
    const blocks = parseAgentMarkdown("- alpha\n* beta\n\n1. one\n2. two");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("list");
    expect(blocks[0].ordered).toBe(false);
    expect(blocks[0].items.map(flattenText)).toEqual(["alpha", "beta"]);
    expect(blocks[1].ordered).toBe(true);
    expect(blocks[1].items.map(flattenText)).toEqual(["one", "two"]);
  });

  it("starts a new list block when the marker kind changes", () => {
    const blocks = parseAgentMarkdown("- alpha\n1. one");
    expect(blocks.map((b) => b.ordered)).toEqual([false, true]);
  });

  it("keeps a horizontal rule and emphasis-at-line-start out of list parsing", () => {
    const blocks = parseAgentMarkdown("---\n\n*emphasised* start");
    expect(blocks[0].type).toBe("paragraph");
    expect(flattenText(blocks[0].inline)).toBe("---");
    expect(blocks[1].inline[0]).toMatchObject({ type: "em" });
  });

  it("parses fenced code with a sanitised language tag", () => {
    const blocks = parseAgentMarkdown("```js\nconst a = 1 < 2;\n```");
    expect(blocks).toEqual([{ type: "code", lang: "js", code: "const a = 1 < 2;" }]);
  });

  it("strips unsafe characters out of the fence language tag", () => {
    const [block] = parseAgentMarkdown('```js" onload="alert(1)\nx\n```');
    expect(block.lang).toBe("jsonloadalert1");
  });

  it("runs an unclosed fence to the end of the text instead of throwing", () => {
    const blocks = parseAgentMarkdown("```\nnever closed");
    expect(blocks).toEqual([{ type: "code", lang: "", code: "never closed" }]);
  });

  it("parses inline code, strong and emphasis", () => {
    const [block] = parseAgentMarkdown("a `code` b **bold** c *it* d _it_");
    const types = block.inline.map((n) => n.type);
    expect(types).toContain("code");
    expect(types).toContain("strong");
    expect(types.filter((t) => t === "em")).toHaveLength(2);
    expect(flattenText(block.inline)).toBe("a code b bold c it d it");
  });

  it("leaves unbalanced markers as literal text", () => {
    const [block] = parseAgentMarkdown("**unclosed and `stray backtick and *lonely");
    expect(block.inline).toEqual([
      { type: "text", value: "**unclosed and `stray backtick and *lonely" },
    ]);
  });

  it("does not treat underscores inside identifiers as emphasis", () => {
    const [block] = parseAgentMarkdown("call get_user_balance now");
    expect(block.inline).toEqual([{ type: "text", value: "call get_user_balance now" }]);
  });

  it("normalises CRLF line endings", () => {
    const blocks = parseAgentMarkdown("one\r\n\r\n- two\r\n- three");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "list"]);
    expect(blocks[1].items.map(flattenText)).toEqual(["two", "three"]);
  });

  it("produces a plain-data AST with no functions or prototypes", () => {
    const blocks = parseAgentMarkdown("# t\n\n- a `b` **c**\n\n```sh\nls\n```\n\npara");
    expect(JSON.parse(JSON.stringify(blocks))).toEqual(blocks);
    const serialized = JSON.stringify(blocks);
    expect(serialized).not.toContain("function");
    assertValidBlocks(blocks);
  });
});

describe("parseAgentMarkdown — untrusted input is never markup", () => {
  const payloads = [
    "<script>alert(1)</script>",
    '<img src=x onerror="alert(1)">',
    "[click](javascript:alert(1))",
    '<div onclick="steal()">hi</div>',
    '<a href="https://evil.example">airdrop</a>',
    "<iframe src=//evil.example></iframe>",
    "javascript:alert(1)",
    "Visit https://evil.example/claim now",
    "<svg/onload=alert(1)>",
    "&lt;script&gt;alert(1)&lt;/script&gt;",
  ];

  it.each(payloads)("renders %s as literal text only", (payload) => {
    const blocks = parseAgentMarkdown(payload);
    assertValidBlocks(blocks);
    // Exactly one block wrapper, and its content is the untouched source string.
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
    expect(flattenText(blocks[0].inline)).toBe(payload);
    // No entity node is ever synthesised from a URL or an HTML attribute.
    expect(blocks[0].inline.every((n) => n.type === "text" || n.type === "em" || n.type === "code")).toBe(true);
  });

  it("never emits href, onclick or any attribute-shaped field", () => {
    const blocks = parseAgentMarkdown(payloads.join("\n\n"));
    const serialized = JSON.stringify(blocks);
    const keys = new Set();
    const walk = (node) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === "object") {
        Object.keys(node).forEach((k) => {
          keys.add(k);
          walk(node[k]);
        });
      }
    };
    walk(blocks);
    expect([...keys].sort()).toEqual(
      expect.arrayContaining(["inline", "type", "value"]),
    );
    expect(keys.has("href")).toBe(false);
    expect(keys.has("onclick")).toBe(false);
    expect(keys.has("html")).toBe(false);
    expect(keys.has("innerHTML")).toBe(false);
    // The payload survives verbatim as data — it is displayed, not interpreted.
    expect(serialized).toContain("<script>alert(1)</script>");
  });

  it("keeps markdown link syntax literal so external targets can never be built", () => {
    const [block] = parseAgentMarkdown("[claim](https://evil.example)");
    expect(flattenText(block.inline)).toBe("[claim](https://evil.example)");
    expect(block.inline.some((n) => n.type === "entity")).toBe(false);
  });
});

describe("parseAgentMarkdown — entity detection", () => {
  it("detects N3 addresses, EVM addresses, 32-byte hashes and block heights", () => {
    const [block] = parseAgentMarkdown(
      `sent from ${N3_ADDRESS} to ${EVM_ADDRESS} in ${HASH_32} at block #4242`,
    );
    const entities = block.inline.filter((n) => n.type === "entity");
    expect(entities).toEqual([
      { type: "entity", kind: "n3Address", value: N3_ADDRESS },
      { type: "entity", kind: "evmAddress", value: EVM_ADDRESS },
      { type: "entity", kind: "hash32", value: HASH_32 },
      { type: "entity", kind: "blockHeight", value: "4242" },
    ]);
    expect(flattenText(block.inline)).toBe(
      `sent from ${N3_ADDRESS} to ${EVM_ADDRESS} in ${HASH_32} at block #4242`,
    );
  });

  it("never mistakes a 32-byte hash for a 20-byte address", () => {
    const [block] = parseAgentMarkdown(HASH_32);
    expect(block.inline).toEqual([{ type: "entity", kind: "hash32", value: HASH_32 }]);
  });

  it("matches block heights case-insensitively but keeps N3 addresses case-sensitive", () => {
    const [upper] = parseAgentMarkdown("BLOCK 12");
    expect(upper.inline.at(-1)).toEqual({ type: "entity", kind: "blockHeight", value: "12" });

    const lowerAddress = N3_ADDRESS.replace(/^N/, "n");
    const [block] = parseAgentMarkdown(lowerAddress);
    expect(block.inline).toEqual([{ type: "text", value: lowerAddress }]);
  });

  it("does not detect entities inside inline code or fenced code", () => {
    const [inlineBlock] = parseAgentMarkdown(`\`${HASH_32}\``);
    expect(inlineBlock.inline).toEqual([{ type: "code", value: HASH_32 }]);

    const [fenced] = parseAgentMarkdown(`\`\`\`\n${N3_ADDRESS}\n\`\`\``);
    expect(fenced).toEqual({ type: "code", lang: "", code: N3_ADDRESS });
  });

  it("detects entities inside emphasis", () => {
    const [block] = parseAgentMarkdown(`**${N3_ADDRESS}**`);
    expect(block.inline[0].type).toBe("strong");
    expect(block.inline[0].children).toEqual([
      { type: "entity", kind: "n3Address", value: N3_ADDRESS },
    ]);
  });

  it("ignores near-miss shapes", () => {
    const short = `0x${"ab".repeat(19)}`;
    const [block] = parseAgentMarkdown(`${short} and blocks 12 and X${N3_ADDRESS}`);
    expect(block.inline.some((n) => n.type === "entity")).toBe(false);
  });
});

describe("parseAgentMarkdown — totality (fuzz)", () => {
  const ALPHABET = [
    ..."abcdefghij0123456789 \n\t",
    "*",
    "**",
    "_",
    "`",
    "```",
    "#",
    "##",
    "###",
    "-",
    "1.",
    "\r\n",
    "<",
    ">",
    "&",
    "[",
    "]",
    "(",
    ")",
    "\\",
    "|",
    "~",
    '"',
    "'",
    "0x",
    "N",
    "block ",
    " ",
    "😀",
  ];

  it("never throws and always returns a valid array for 200 random strings", () => {
    const rand = mulberry32(0xc0ffee);
    for (let n = 0; n < 200; n += 1) {
      const length = 1 + Math.floor(rand() * 120);
      let input = "";
      for (let i = 0; i < length; i += 1) {
        input += ALPHABET[Math.floor(rand() * ALPHABET.length)];
      }
      let blocks;
      expect(() => {
        blocks = parseAgentMarkdown(input);
      }, `input: ${JSON.stringify(input)}`).not.toThrow();
      assertValidBlocks(blocks);
    }
  });

  it("survives pathological marker runs and very long input", () => {
    const cases = [
      "*".repeat(5000),
      "**".repeat(5000),
      "`".repeat(5000),
      "#".repeat(5000),
      "_".repeat(5000),
      "```".repeat(500),
      "- ".repeat(2000),
      "**a".repeat(2000),
      `${"*".repeat(500)}x${"*".repeat(500)}`,
      "a\r\n".repeat(3000),
      "x".repeat(10000),
      `${"# ".repeat(100)}\n${"0x".repeat(5000)}`,
    ];
    for (const input of cases) {
      let blocks;
      expect(() => {
        blocks = parseAgentMarkdown(input);
      }, `input length ${input.length}`).not.toThrow();
      assertValidBlocks(blocks);
    }
  });
});

describe("ENTITY_ROUTES", () => {
  it("is frozen at both levels", () => {
    expect(Object.isFrozen(ENTITY_ROUTES)).toBe(true);
    for (const row of Object.values(ENTITY_ROUTES)) {
      expect(Object.isFrozen(row)).toBe(true);
    }
  });

  it("covers exactly the four entity kinds and three chain modes", () => {
    expect(Object.keys(ENTITY_ROUTES).sort()).toEqual([
      "blockHeight",
      "evmAddress",
      "hash32",
      "n3Address",
    ]);
    for (const row of Object.values(ENTITY_ROUTES)) {
      expect(Object.keys(row).sort()).toEqual(["both", "n3", "neox"]);
    }
  });

  it("encodes the ambiguity table — no link where the target is not unique", () => {
    expect(ENTITY_ROUTES.n3Address.neox).toBeNull();
    expect(ENTITY_ROUTES.evmAddress.n3).toBeNull();
    expect(ENTITY_ROUTES.evmAddress.both).toBeNull();
    expect(ENTITY_ROUTES.hash32.both).toBeNull();
    expect(ENTITY_ROUTES.blockHeight.both).toBeNull();
  });

  it("only produces internal, absolute, single-placeholder paths", () => {
    for (const row of Object.values(ENTITY_ROUTES)) {
      for (const template of Object.values(row)) {
        if (template === null) continue;
        expect(template.startsWith("/")).toBe(true);
        expect(template.startsWith("//")).toBe(false);
        expect(template).not.toMatch(/^[a-z]+:/i);
        expect(template.match(/\{v\}/g)).toHaveLength(1);
      }
    }
  });

  it("never produces the /transaction/ redirect path", () => {
    const templates = Object.values(ENTITY_ROUTES).flatMap((row) => Object.values(row));
    expect(templates.some((t) => t && t.startsWith("/transaction/"))).toBe(false);
    // Sanity check that the redirect really is one, i.e. the guard is meaningful.
    const resolved = router.resolve(`/transaction/${HASH_32}`);
    expect(resolved.name).toBe("notFound");
  });

  it("resolves every produced path to a named route on the real route table", () => {
    const produced = [];
    for (const [kind, row] of Object.entries(ENTITY_ROUTES)) {
      for (const template of Object.values(row)) {
        if (template === null) continue;
        produced.push(template.replace("{v}", SAMPLE_VALUES[kind]));
      }
    }
    // 7 = n3Address(n3, both) + evmAddress(neox) + hash32(n3, neox) + blockHeight(n3, neox)
    expect(produced).toHaveLength(7);

    const names = produced.map((path) => {
      const resolved = router.resolve(path);
      const leaf = resolved.matched[resolved.matched.length - 1];
      expect(typeof resolved.name, `${path} has no route name`).toBe("string");
      expect(resolved.name, `${path} fell through to the catch-all`).not.toBe("notFound");
      expect(leaf.redirect, `${path} resolves to a redirect record`).toBeFalsy();
      expect(resolved.params, `${path} lost its parameter`).not.toEqual({});
      return resolved.name;
    });

    expect(new Set(names)).toEqual(
      new Set([
        "accountProfile",
        "xAddress",
        "transactionDetail",
        "xTxDetail",
        "blockDetail",
        "xBlockDetail",
      ]),
    );
  });
});
