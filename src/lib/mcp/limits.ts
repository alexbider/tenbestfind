/**
 * How much one connector token may ask for.
 *
 * There was no limit at all, which was fine while a person was driving and is
 * not fine now: an agent working through a city makes something like 150 calls,
 * runs continuously, and a loop with a bug in it can make thousands a minute
 * against a SQLite file that serves the public site from the same process.
 *
 * So the ceiling is set high enough that real work never meets it, and low
 * enough that a runaway does. The brief's floor is 600 calls an hour per token;
 * this allows 3,000, which is twenty cities an hour, with a per-minute burst of
 * 300 so a batch of parallel calls goes through and a tight loop does not.
 *
 * Counted in memory rather than in the database. A counter that costs a write
 * per call would cost more than the calls it is protecting, and a limit that is
 * forgotten when the container restarts is the right kind of wrong: the worst
 * case is a runaway getting one fresh allowance after a deploy.
 */

/** Calls per token per hour. The brief asks for at least 600. */
export const HOURLY_LIMIT = 3_000;

/** Calls per token per minute, so a loop is caught in seconds rather than in an hour. */
export const BURST_LIMIT = 300;

const HOUR = 3_600_000;
const MINUTE = 60_000;

type Window = { count: number; startedAt: number };

const hourly = new Map<string, Window>();
const burst = new Map<string, Window>();

function hit(map: Map<string, Window>, key: string, span: number, ceiling: number, now: number) {
  const window = map.get(key);
  if (!window || now - window.startedAt >= span) {
    map.set(key, { count: 1, startedAt: now });
    return { ok: true as const };
  }
  if (window.count >= ceiling) {
    // Rounded up, and never zero: a Retry-After of 0 invites an immediate retry.
    const retryAfter = Math.max(1, Math.ceil((window.startedAt + span - now) / 1000));
    return { ok: false as const, retryAfter };
  }
  window.count += 1;
  return { ok: true as const };
}

export type RateVerdict =
  | { ok: true; remaining: number }
  | { ok: false; retryAfter: number; message: string };

/**
 * Counts one call against a token. Called once per JSON-RPC message that does
 * real work, not once per HTTP request: a batch of ten calls in one body is ten
 * calls.
 */
export function countCall(tokenId: string, now = Date.now()): RateVerdict {
  const minute = hit(burst, tokenId, MINUTE, BURST_LIMIT, now);
  if (!minute.ok) {
    return {
      ok: false,
      retryAfter: minute.retryAfter,
      message: `Too many calls: the limit is ${BURST_LIMIT} a minute for one token. Wait ${minute.retryAfter} seconds and continue; nothing was lost.`,
    };
  }

  const hourWindow = hit(hourly, tokenId, HOUR, HOURLY_LIMIT, now);
  if (!hourWindow.ok) {
    return {
      ok: false,
      retryAfter: hourWindow.retryAfter,
      message: `Too many calls: the limit is ${HOURLY_LIMIT} an hour for one token. Wait ${hourWindow.retryAfter} seconds and continue; nothing was lost.`,
    };
  }

  const used = hourly.get(tokenId)?.count ?? 1;
  return { ok: true, remaining: Math.max(0, HOURLY_LIMIT - used) };
}

/** For the tests, and for a deploy that wants to start from nothing. */
export function resetLimits(): void {
  hourly.clear();
  burst.clear();
}
