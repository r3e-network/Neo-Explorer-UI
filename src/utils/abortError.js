/**
 * Detect whether a thrown error is an intentional cancellation rather than
 * a real failure. Aborted fetches happen when:
 *
 *   - the user navigates away mid-request (route guard cancels in-flight);
 *   - a watcher fires a fresh fetch and the previous AbortController is
 *     aborted by the consumer;
 *   - axios receives a cancellation token (`error.name === "CanceledError"`).
 *
 * Surfacing these as user-visible "Failed to load" banners caused a flash
 * of error UI on routes that re-fetch on tick. Use this helper at the top
 * of each catch block to bail out before setting any error state.
 *
 *   } catch (err) {
 *     if (myId !== requestId) return;            // stale-response guard
 *     if (isAbortError(err)) return;              // intentional cancel
 *     errorMessage.value = "Failed to load";      // real failure
 *   }
 */
export function isAbortError(err) {
  if (!err) return false;
  const name = err.name;
  const code = err.code;
  return (
    name === "AbortError" ||
    name === "CanceledError" ||
    code === "ERR_CANCELED" ||
    code === "ABORT_ERR"
  );
}
