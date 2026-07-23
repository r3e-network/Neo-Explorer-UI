// Serializes an agent conversation to Markdown for the clipboard.
//
// Used only by the panel's "Copy conversation" control. The output is a plain
// string that is handed to `copyTextToClipboard` — it is never parsed, never
// rendered, and never sent anywhere, so there is no injection surface here.
//
// Unsigned proposals are deliberately NOT serialized. A pasted transaction
// payload reads as something actionable while being detached from the wallet
// flow that would validate it; the transcript records that a proposal was shown
// and stops there.
//
// Pure module: no DOM, no Vue, no i18n instance.

const CHAIN_LABELS = Object.freeze({
  n3: "Neo N3",
  neox: "Neo X",
  both: "Neo N3 + Neo X",
});

const TITLE = "# Neo Explorer AI conversation";

function chainLabel(chain) {
  const key = typeof chain === "string" ? chain.trim().toLowerCase() : "";
  return CHAIN_LABELS[key] || CHAIN_LABELS.n3;
}

function textBody(message) {
  const content = typeof message.content === "string" ? message.content.trim() : "";
  if (content) return content;

  // A turn can legitimately carry no text: it is a state marker. Record the
  // state honestly rather than emitting a blank speaker heading.
  if (message.stopped) return "_Stopped before an answer was produced._";
  if (message.unavailable) return "_The assistant was unavailable._";
  if (message.error) return "_The request failed._";
  return "";
}

function toolBlock(message) {
  const tools = Array.isArray(message.toolUses)
    ? message.toolUses.filter((name) => typeof name === "string" && name.trim())
    : [];
  if (tools.length === 0) return "";
  const bullets = tools.map((name) => `- ${name.trim()}`).join("\n");
  return `Tools used:\n\n${bullets}`;
}

function modelBlock(message) {
  const model = typeof message.model === "string" ? message.model.trim() : "";
  return model ? `Model: \`${model}\`` : "";
}

function proposalBlock(message) {
  const count = Array.isArray(message.proposals) ? message.proposals.length : 0;
  if (count === 0) return "";
  const noun = count === 1 ? "proposal" : "proposals";
  return `_${count} unsigned transaction ${noun} shown in the panel (not included here)._`;
}

/**
 * Serialize a conversation to Markdown.
 *
 * @param {Array<Object>} messages - Panel messages (read-only; never mutated).
 * @param {{chain?: string}} [options] - `chain` is recorded in the header so a
 *   pasted transcript is not silently ambiguous between N3 and Neo X.
 * @returns {string} Always a string, always ending in a single newline.
 */
export function toMarkdown(messages, options = {}) {
  const blocks = [TITLE, `Chain: ${chainLabel(options?.chain)}`, "---"];

  const list = Array.isArray(messages) ? messages : [];
  for (const message of list) {
    if (!message) continue;
    if (message.role !== "user" && message.role !== "assistant") continue;

    const body = textBody(message);
    const tools = message.role === "assistant" ? toolBlock(message) : "";
    const model = message.role === "assistant" ? modelBlock(message) : "";
    const proposals = message.role === "assistant" ? proposalBlock(message) : "";
    if (!body && !tools && !model && !proposals) continue;

    blocks.push(message.role === "user" ? "**You:**" : "**Assistant:**");
    if (body) blocks.push(body);
    if (proposals) blocks.push(proposals);
    if (tools) blocks.push(tools);
    if (model) blocks.push(model);
  }

  return `${blocks.join("\n\n")}\n`;
}

export default { toMarkdown };
