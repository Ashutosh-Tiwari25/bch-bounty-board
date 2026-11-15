import { useState } from "react";
import { cashAddressToLockingBytecode } from "@bitauth/libauth";
import { go } from "../router";
import { bchToSats, createBounty, satsToBch } from "../store";

const DUST = 546n; // smallest output a BCH node will relay

function inTwoWeeks() {
  const d = new Date(Date.now() + 14 * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export default function NewBounty() {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [prize, setPrize] = useState("");
  const [winners, setWinners] = useState("3");
  const [deadline, setDeadline] = useState(inTwoWeeks());
  const [organizer, setOrganizer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const prizeSats = bchToSats(prize);
  const winnerCount = Number(winners);
  const perWinner = prizeSats && winnerCount > 0 ? prizeSats / BigInt(winnerCount) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 4) return setError("Give the bounty a title of at least 4 characters.");
    if (brief.trim().length < 10) return setError("Write a short brief so creators know what to make.");
    if (!prizeSats) return setError("Enter the prize pool in BCH, for example 0.01.");
    if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > 50) return setError("Number of winners must be between 1 and 50.");
    if (perWinner !== null && perWinner < DUST) return setError(`Each winner would get less than ${DUST} sats, which the network won't accept. Raise the prize or lower the number of winners.`);
    if (!deadline) return setError("Pick a deadline.");
    if (typeof cashAddressToLockingBytecode(organizer.trim()) === "string") return setError("That doesn't look like a BCH address. It should start with bitcoincash:");

    const b = createBounty({
      title: title.trim(),
      brief: brief.trim(),
      prizeSats: prizeSats.toString(),
      winners: winnerCount,
      deadline,
      organizer: organizer.trim(),
    });
    go(`b/${b.id}`);
  }

  return (
    <>
      <a className="back" href="#">← All bounties</a>
      <h1>Post a bounty</h1>
      <p className="sub">Creators submit a link to their work and a BCH address. You pick the winners and pay them all at once.</p>

      <form className="card form" onSubmit={submit} noValidate>
        <label htmlFor="title">Title</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Write the best thread about BCH Blaze" />

        <label htmlFor="brief">Brief</label>
        <textarea id="brief" rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What to make, where to post it, what a winning entry looks like." />

        <div className="two">
          <div>
            <label htmlFor="prize">Prize pool (BCH)</label>
            <input id="prize" inputMode="decimal" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="0.01" />
          </div>
          <div>
            <label htmlFor="winners">Winners</label>
            <input id="winners" type="number" min={1} max={50} value={winners} onChange={(e) => setWinners(e.target.value)} />
          </div>
        </div>
        {perWinner !== null && <p className="hint">About {satsToBch(perWinner)} BCH per winner if split evenly. You can set each amount when you pick winners.</p>}

        <label htmlFor="deadline">Deadline</label>
        <input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

        <label htmlFor="organizer">Your BCH address</label>
        <input id="organizer" value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder="bitcoincash:q…" />
        <p className="hint">Where leftover change goes after the payout. You'll connect your wallet to sign when you pay winners.</p>

        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit">Post bounty</button>
      </form>
    </>
  );
}
