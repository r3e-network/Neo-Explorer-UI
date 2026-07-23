// Windows a conversation down to a request the agent backend will accept.
//
// LIVE DEFECT THIS FIXES: `api/agent.js` hard-caps an incoming conversation at
// 20 messages / 8000 characters and answers 413 beyond that. The panel used to
// send the entire transcript, so every conversation permanently broke at around
// turn 20 behind a generic error with an un-succeedable Retry button.
//
// The window keeps the most recent *whole exchanges*. Slicing mid-exchange is
// never allowed: a window that opens on an assistant turn reads to the model as
// if it had spoken unprompted, which measurably degrades the next answer and
// can leak a stale tool result into an unrelated question.
//
// Pure module: no DOM, no Vue, no network.

const DEFAULT_MAX_MESSAGES = 16;
const DEFAULT_MAX_CHARS = 7000;

function positiveInt(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
}

// Same predicate the panel used before windowing existed: only real turns with
// text. System dividers, error markers and empty "stopped" placeholders are UI
// state, not conversation, and must never reach the model.
function isSendable(message) {
  if (!message) return false;
  if (message.role !== "user" && message.role !== "assistant") return false;
  return typeof message.content === "string" && message.content.length > 0;
}

function countChars(messages) {
  let total = 0;
  for (const message of messages) total += message.content.length;
  return total;
}

/**
 * Group a flat message list into exchanges. Each exchange is led by a user turn
 * and carries every assistant turn that answered it, so a group is always a
 * valid window prefix. Assistant turns that precede the first user turn cannot
 * lead a window and are dropped.
 */
function groupExchanges(messages) {
  const groups = [];
  for (const message of messages) {
    if (message.role === "user") {
      groups.push([message]);
    } else if (groups.length > 0) {
      groups[groups.length - 1].push(message);
    }
  }
  return groups;
}

/**
 * Build the request history for `askAgent`.
 *
 * Guarantees (all covered by tests):
 *   - the result never starts with an `assistant` message;
 *   - the result never exceeds `maxMessages` or `maxChars`;
 *   - the result is non-empty whenever at least one user turn is sendable —
 *     if the newest exchange alone busts a cap, the newest question is sent on
 *     its own, its content clipped to `maxChars`. An over-long request is worse
 *     than a clipped one: the former fails, the latter answers.
 *
 * @param {Array<Object>} messages - Panel messages (read-only; never mutated).
 * @param {{maxMessages?: number, maxChars?: number}} [options]
 * @returns {{history: Array<{role: string, content: string}>,
 *   trimmedFromId: string|null}} `trimmedFromId` is the id of the first
 *   surviving message when anything was dropped, so the panel can render the
 *   "earlier messages were trimmed" divider above exactly that row; `null` when
 *   the whole conversation fit.
 */
export function windowHistory(messages, options = {}) {
  const maxMessages = positiveInt(options?.maxMessages, DEFAULT_MAX_MESSAGES);
  const maxChars = positiveInt(options?.maxChars, DEFAULT_MAX_CHARS);

  const sendable = Array.isArray(messages) ? messages.filter(isSendable) : [];
  if (sendable.length === 0) return { history: [], trimmedFromId: null };

  const groups = groupExchanges(sendable);
  if (groups.length === 0) return { history: [], trimmedFromId: null };

  // Walk newest → oldest, admitting whole exchanges while both caps hold.
  const kept = [];
  let chars = 0;
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const group = groups[i];
    const groupChars = countChars(group);
    if (kept.length + group.length > maxMessages) break;
    if (chars + groupChars > maxChars) break;
    kept.unshift(...group);
    chars += groupChars;
  }

  let history;
  let firstSurviving;
  let clipped = false;

  if (kept.length > 0) {
    firstSurviving = kept[0];
    history = kept.map((message) => ({ role: message.role, content: message.content }));
  } else {
    // The newest exchange alone busts a cap. Send just its question, clipped.
    const lead = groups[groups.length - 1][0];
    firstSurviving = lead;
    const content = lead.content.slice(0, maxChars);
    clipped = content.length !== lead.content.length;
    history = [{ role: lead.role, content }];
  }

  const consumed = kept.length > 0 ? kept.length : 1;
  const trimmedAnything = consumed < sendable.length || clipped;
  const id = firstSurviving?.id;
  const trimmedFromId = trimmedAnything && typeof id === "string" && id ? id : null;

  return { history, trimmedFromId };
}

export default { windowHistory };
