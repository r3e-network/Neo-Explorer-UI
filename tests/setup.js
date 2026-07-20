// jsdom returns null for canvas contexts but logs a not-implemented error.
// Browser render tests cover the real canvas path; unit tests keep jsdom's
// return semantics without the misleading CI noise.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = () => null;
}
