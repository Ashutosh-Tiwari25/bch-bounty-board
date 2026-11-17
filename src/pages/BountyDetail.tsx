import { useState } from "react";
import { bchToSats, daysLeft, getBounty, listSubmissions, satsToBch, setAward, winnersOf, type Submission } from "../store";
import SubmitForm from "./SubmitForm";

const DUST = 546n;

export default function BountyDetail({ id }: { id: string }) {
  const [, rerender] = useState(0);
  const refresh = () => rerender((n) => n + 1);
  const b = getBounty(id);

  if (!b) {
    return (
      <>
        <a className="back" href="#">← All bounties</a>
        <section className="card empty">
          <h2>Bounty not found</h2>
          <p>It may have been posted in a different browser. Bounties are saved in the browser they were created in for now.</p>
        </section>
      </>
    );
  }

  const left = daysLeft(b.deadline);
  const subs = listSubmissions(id);
  const winners = winnersOf(id);
  const pool = BigInt(b.prizeSats);
  const awarded = winners.reduce((s, w) => s + BigInt(w.awardSats!), 0n);
  const remaining = pool - awarded;

  return (
    <>
      <a className="back" href="#">← All bounties</a>
      <div className="row-between">
        <h1>{b.title}</h1>
        <span className="prize big">{satsToBch(b.prizeSats)} BCH</span>
      </div>
      <div className="meta">
        <span>{b.winners} {b.winners === 1 ? "winner" : "winners"}</span>
        <span>Deadline {b.deadline}</span>
        <span className={left < 0 ? "closed" : ""}>{left < 0 ? "Closed" : left === 0 ? "Ends today" : `${left} days left`}</span>
      </div>

      <section className="card">
        <h2>Brief</h2>
        <p className="pre">{b.brief}</p>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Submissions ({subs.length})</h2>
          <span className="muted small-inline">
            Awarded {satsToBch(awarded)} of {satsToBch(pool)} BCH
            {remaining < 0n && <strong className="closed"> (over by {satsToBch(-remaining)})</strong>}
          </span>
        </div>
        {subs.length === 0 ? (
          <p className="muted">No entries yet. Share the link to this bounty and they'll show up here.</p>
        ) : (
          <ul className="subs">
            {subs.map((s) => (
              <SubmissionRow key={s.id} s={s} onChange={refresh} />
            ))}
          </ul>
        )}
        {winners.length > 0 && (
          <div className="payout-bar">
            <span>{winners.length} {winners.length === 1 ? "winner" : "winners"} picked</span>
            <button className="btn" disabled title="Payout lands on day 4">Pay winners (coming day 4)</button>
          </div>
        )}
      </section>

      <SubmitForm bountyId={id} onDone={refresh} />

      <p className="muted small">Organizer: <code>{b.organizer}</code></p>
    </>
  );
}

function SubmissionRow({ s, onChange }: { s: Submission; onChange: () => void }) {
  const [amount, setAmount] = useState(s.awardSats ? satsToBch(s.awardSats) : "");
  const [err, setErr] = useState<string | null>(null);
  const isWinner = !!s.awardSats && BigInt(s.awardSats) > 0n;

  function save(v: string) {
    setAmount(v);
    if (v.trim() === "") { setAward(s.id, undefined); setErr(null); onChange(); return; }
    const sats = bchToSats(v);
    if (!sats) { setErr("Enter an amount in BCH, like 0.002"); return; }
    if (sats < DUST) { setErr(`Below ${DUST} sats, the network won't accept it`); return; }
    setErr(null);
    setAward(s.id, sats);
    onChange();
  }

  let host = "";
  try { host = new URL(s.link).hostname.replace(/^www\./, ""); } catch { /* keep empty */ }

  return (
    <li className={"sub" + (isWinner ? " winner" : "")}>
      <div className="sub-main">
        <div className="sub-top">
          <strong>@{s.handle}</strong>
          <a href={s.link} target="_blank" rel="noreferrer">{host || "open"} ↗</a>
        </div>
        {s.note && <p className="muted sub-note">{s.note}</p>}
        <code className="sub-addr">{s.address}</code>
      </div>
      <div className="sub-award">
        <label htmlFor={"award-" + s.id}>Award (BCH)</label>
        <input id={"award-" + s.id} inputMode="decimal" value={amount} onChange={(e) => save(e.target.value)} placeholder="0" />
        {err && <span className="error tiny">{err}</span>}
      </div>
    </li>
  );
}
