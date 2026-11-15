// Bounty data, kept in the browser's local storage for the demo.
// Amounts are stored in satoshis (1 BCH = 100,000,000 sats) as strings, because
// localStorage only holds text and BigInt can't go through JSON directly.

export interface Bounty {
  id: string;
  title: string;
  brief: string;
  prizeSats: string; // total prize pool
  winners: number; // how many winners will be paid
  deadline: string; // YYYY-MM-DD
  organizer: string; // organizer's BCH address (change goes back here)
  createdAt: number;
}

const KEY = "bch-bounty-board:bounties";

function read(): Bounty[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Bounty[]) : [];
  } catch {
    return [];
  }
}

function write(list: Bounty[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the app keeps working for this session only.
  }
}

export function listBounties(): Bounty[] {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function getBounty(id: string): Bounty | undefined {
  return read().find((b) => b.id === id);
}

export function createBounty(input: Omit<Bounty, "id" | "createdAt">): Bounty {
  const bounty: Bounty = { ...input, id: Math.random().toString(36).slice(2, 10), createdAt: Date.now() };
  write([bounty, ...read()]);
  return bounty;
}

// --- Amount helpers --------------------------------------------------------

export const SATS_PER_BCH = 100_000_000n;

/** "0.005" -> 500000n. Returns null for anything that isn't a positive amount. */
export function bchToSats(input: string): bigint | null {
  const s = input.trim();
  if (!/^\d*(\.\d{0,8})?$/.test(s) || s === "" || s === ".") return null;
  const [whole, frac = ""] = s.split(".");
  const sats = BigInt(whole || "0") * SATS_PER_BCH + BigInt((frac + "00000000").slice(0, 8));
  return sats > 0n ? sats : null;
}

export function satsToBch(sats: bigint | string): string {
  const v = typeof sats === "string" ? BigInt(sats) : sats;
  const whole = v / SATS_PER_BCH;
  const frac = (v % SATS_PER_BCH).toString().padStart(8, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export function daysLeft(deadline: string): number {
  const end = new Date(deadline + "T23:59:59").getTime();
  return Math.ceil((end - Date.now()) / 86_400_000);
}
