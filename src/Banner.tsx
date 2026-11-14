// Required by BCH BLAZE 2026 rules: shown on every page.
export const REPO_URL = "https://github.com/Ashutosh-Tiwari25/bch-bounty-board";
export const DECK_URL = ""; // Widget Factory deck, added on day 7
export const CASHTOKENS_ADDRESS = "bitcoincash:zqq902qs5fnlcqfvt5m6mvp6v769f3zawsd73ymz6s";
export const PRIOR_WORK_URL = REPO_URL + "/tree/main/Preparation";

export default function Banner() {
  return (
    <div className="banner">
      <strong>BCH BLAZE 2026</strong>
      <span>
        Deck: {DECK_URL ? <a href={DECK_URL} target="_blank" rel="noreferrer">Widget Factory</a> : <em>coming soon</em>}
      </span>
      <span>
        <a href={REPO_URL} target="_blank" rel="noreferrer">Repo</a>
      </span>
      <span>
        Prior work: <a href={PRIOR_WORK_URL} target="_blank" rel="noreferrer">Preparation/</a>
      </span>
      <span className="addr">
        CashTokens: <code>{CASHTOKENS_ADDRESS}</code>
      </span>
    </div>
  );
}
