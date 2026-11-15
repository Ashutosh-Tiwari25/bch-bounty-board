import { daysLeft, listBounties, satsToBch } from "../store";

export default function BountyList() {
  const bounties = listBounties();

  return (
    <>
      <div className="row-between">
        <div>
          <h1>BCH Bounty Board</h1>
          <p className="sub">Post a bounty. Collect submissions. Pay every winner in one transaction.</p>
        </div>
        <a className="btn" href="#new">Post a bounty</a>
      </div>

      {bounties.length === 0 ? (
        <section className="card empty">
          <h2>No bounties yet</h2>
          <p>Post the first one: a title, a short brief, the prize pool in BCH and how many winners get paid.</p>
          <a className="btn" href="#new">Post a bounty</a>
        </section>
      ) : (
        <ul className="list">
          {bounties.map((b) => {
            const left = daysLeft(b.deadline);
            return (
              <li key={b.id}>
                <a className="card bounty" href={`#b/${b.id}`}>
                  <div className="bounty-top">
                    <h2>{b.title}</h2>
                    <span className="prize">{satsToBch(b.prizeSats)} BCH</span>
                  </div>
                  <p className="brief">{b.brief}</p>
                  <div className="meta">
                    <span>{b.winners} {b.winners === 1 ? "winner" : "winners"}</span>
                    <span className={left < 0 ? "closed" : ""}>
                      {left < 0 ? "Closed" : left === 0 ? "Ends today" : `${left} ${left === 1 ? "day" : "days"} left`}
                    </span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
