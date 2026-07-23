<script>
/**
 * Renders untrusted assistant text as safe rich text.
 *
 * SECURITY: this component has no template markup for message content and no raw
 * HTML escape hatch of any kind (a spec asserts the source is free of them). It
 * walks the plain-data AST produced by `parseAgentMarkdown()` and builds vnodes
 * with `h()`, so model output can only ever become DOM text or a Vue-escaped
 * attribute value — there is no HTML parsing stage. Links are restricted to
 * internal router paths built from the frozen `ENTITY_ROUTES` table — bare URLs
 * and markdown links are never linkified, because a token named
 * "claim your airdrop at evil.example" must not become clickable inside trusted
 * explorer chrome.
 */
import { defineComponent, h } from "vue";
import { RouterLink } from "vue-router";
import { ENTITY_ROUTES, parseAgentMarkdown } from "@/utils/agentMarkdown";

const HEADING_TAGS = { 1: "h3", 2: "h4", 3: "h5" };

/**
 * Resolves an entity to an internal path, or null when the target is ambiguous
 * for the active chain. No link beats a wrong link in an explorer.
 */
function entityPath(kind, value, chain) {
  const row = ENTITY_ROUTES[kind];
  if (!row) return null;
  const key = chain === "neox" || chain === "both" ? chain : "n3";
  const template = row[key];
  if (!template) return null;
  return template.replace("{v}", encodeURIComponent(value));
}

function renderEntity(node, ctx, key) {
  const path = ctx.linkEntities ? entityPath(node.kind, node.value, ctx.chain) : null;
  if (!path) {
    return h("span", { key, class: "agent-rich-entity font-hash" }, node.value);
  }
  return h(
    RouterLink,
    { key, to: path, class: "agent-rich-entity etherscan-link font-hash" },
    () => node.value,
  );
}

function renderInline(nodes, ctx) {
  const out = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    switch (node.type) {
      case "text":
        out.push(node.value);
        break;
      case "strong":
        out.push(h("strong", { key: i, class: "agent-rich-strong" }, renderInline(node.children, ctx)));
        break;
      case "em":
        out.push(h("em", { key: i }, renderInline(node.children, ctx)));
        break;
      case "code":
        out.push(h("code", { key: i, class: "agent-rich-code font-hash" }, node.value));
        break;
      case "entity":
        out.push(renderEntity(node, ctx, i));
        break;
      default:
        break;
    }
  }
  return out;
}

function renderBlock(block, key, ctx) {
  switch (block.type) {
    case "heading":
      return h(
        HEADING_TAGS[block.level] || "h5",
        { key, class: "agent-rich-heading text-sm font-semibold text-high" },
        renderInline(block.inline, ctx),
      );
    case "list": {
      const attrs = { key, class: "agent-rich-list" };
      // Preserve the model's own starting number (e.g. a paginated "11. 12. 13.")
      // instead of letting the browser renumber the <ol> from 1.
      if (block.ordered && typeof block.start === "number" && block.start !== 1) {
        attrs.start = block.start;
      }
      return h(
        block.ordered ? "ol" : "ul",
        attrs,
        block.items.map((item, index) => h("li", { key: index }, renderInline(item, ctx))),
      );
    }
    case "code":
      return h("pre", { key, class: "agent-rich-pre" }, [
        h(
          "code",
          block.lang ? { class: "font-hash", "data-lang": block.lang } : { class: "font-hash" },
          block.code,
        ),
      ]);
    case "paragraph":
      return h(
        "p",
        { key, class: "agent-rich-p text-sm leading-relaxed text-high" },
        renderInline(block.inline, ctx),
      );
    default:
      return null;
  }
}

export default defineComponent({
  name: "AgentRichText",
  props: {
    text: { type: String, required: true },
    chain: { type: String, default: "n3" },
    linkEntities: { type: Boolean, default: true },
  },
  setup(props) {
    return () => {
      const ctx = { chain: props.chain, linkEntities: props.linkEntities };
      const blocks = parseAgentMarkdown(props.text);
      return h(
        "div",
        { class: "agent-rich" },
        blocks.map((block, index) => renderBlock(block, index, ctx)),
      );
    };
  },
});
</script>

<style scoped>
.agent-rich {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
}

.agent-rich-p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.agent-rich-heading {
  margin: 0;
  line-height: 1.4;
  word-break: break-word;
}

.agent-rich :where(ul, ol) {
  margin: 0;
  padding-left: 1.25rem;
}
.agent-rich ul {
  list-style: disc;
}
.agent-rich ol {
  list-style: decimal;
}
.agent-rich li {
  font-size: 0.875rem;
  line-height: 1.625;
  color: var(--text-high);
  word-break: break-word;
  overflow-wrap: anywhere;
}

.agent-rich-strong {
  font-weight: 600;
  color: var(--text-high);
}

.agent-rich-entity {
  overflow-wrap: anywhere;
}

.agent-rich-code {
  background: var(--surface-hover);
  padding: 0 0.25rem;
  border-radius: 0.25rem;
  color: var(--text-high);
}

.agent-rich-pre {
  margin: 0;
  max-width: 100%;
  overflow-x: auto;
  background: color-mix(in srgb, var(--surface-elevated) 92%, transparent);
  border: 1px solid var(--line-soft);
  border-radius: 0.5rem;
  padding: 0.5rem 0.625rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
}
.agent-rich-pre code {
  white-space: pre;
  color: var(--text-high);
  background: none;
  padding: 0;
}

.dark .agent-rich-code {
  background: color-mix(in srgb, var(--surface-hover) 92%, rgba(173, 193, 221, 0.04));
}

.dark .agent-rich-pre {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--surface-elevated) 96%, rgba(255, 255, 255, 0.02)) 0%,
    color-mix(in srgb, var(--surface-elevated) 90%, rgba(9, 14, 24, 0.98)) 100%
  );
  border-color: color-mix(in srgb, var(--line-soft) 80%, rgba(255, 255, 255, 0.02));
  box-shadow: inset 0 1px 0 rgba(173, 193, 221, 0.04);
}

@media (prefers-reduced-motion: reduce) {
  .agent-rich a,
  .agent-rich-entity {
    transition: none !important;
  }
}
</style>
