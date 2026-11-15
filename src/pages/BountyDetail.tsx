import { daysLeft, getBounty, satsToBch } from "../store";

export default function BountyDetail({ id }: { id: string }) {
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
        <h2>Submissions</h2>
        <p className="muted">Submissions open on day 3: creators will add a link to their work and their BCH address here.</p>
      </section>

      <p className="muted small">Organizer: <code>{b.organizer}</code></p>
    </>
  );
}
