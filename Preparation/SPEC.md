# BCH Bounty Board: spec

Written on day 1 of BCH BLAZE 2026 (14 Nov). Everything outside this `Preparation/` folder is built during the hackathon, 14–22 Nov.

## The problem

Projects run creator bounties on X and Telegram: "write the best thread about us, $500 split across 10 winners". Paying the winners is the painful part. The organizer collects 10 wallet addresses in DMs, sends 10 separate payments, and posts screenshots so people believe they were paid. It's slow, error-prone, and creators can't verify anything.

I ran this process for a year at WizzHQ (about $50k paid across 250 creators). The payout step was always the worst part.

## The product

A bounty board where:

1. **An organizer posts a bounty.** Title, brief, prize pool in BCH, number of winners, deadline. They connect their wallet with WizardConnect.
2. **Creators submit.** Link to their post, plus their BCH address.
3. **The organizer picks winners** from the submissions and sets each winner's amount.
4. **One click pays everyone in a single transaction.** The organizer's wallet signs once through WizardConnect. All winners are paid in the same transaction.
5. **A public results page** shows every winner, their amount, and the transaction link on the explorer. Anyone can verify the payout on chain.

## Users

- **Organizer:** a project or community lead running a bounty. Has a BCH wallet that supports WizardConnect (Selene).
- **Creator:** anyone with a BCH address. No wallet connection needed to submit.

## Demo (what the judges see)

1. Connect Selene with a QR scan.
2. Create a bounty: "Write the best thread about BCH Blaze", small prize pool.
3. Three submissions already on the board.
4. Pick winners and set amounts.
5. Pay winners: one signature in Selene, one mainnet transaction.
6. Results page with the explorer link.

## What's in scope (by Nov 22)

- Bounty create, list and detail pages
- Submission form
- Winner selection and amounts
- Multi-output payout transaction, signed via WizardConnect, broadcast on mainnet
- Results page with explorer link
- Banner on every page (required by BLAZE rules)

## Out of scope (after the hackathon)

- Escrow (locking the prize pool in a contract when the bounty is posted)
- CashToken prizes (paying in ParyonUSD or other tokens)
- Accounts, auth, spam filtering

## Tech

- React + Vite, single static page
- `@wizardconnect/react` and `@wizardconnect/dapp` for wallet connection and signing
- `@bitauth/libauth` for addresses and building the transaction
- `@electrum-cash/network` for reading UTXOs and broadcasting
- Bounty and submission data: local storage for the demo, simple hosted store if time allows

## Known issue from the spike

Selene sends an empty `paths` list in `wallet_ready`, so the dapp can't derive addresses from an xpub. The spike's workaround: the organizer pastes their receive address. Asked in the BLAZE Telegram whether other wallets send paths.

## Plan

| Day | Date | Goal |
|---|---|---|
| 1 | Sat 14 | Repo, spec, roll call, project skeleton with banner |
| 2 | Sun 15 | Bounty create + list pages |
| 3 | Mon 16 | Submissions + winner selection |
| 4 | Tue 17 | Payout transaction wired to WizardConnect (chipnet) |
| 5 | Wed 18 | Buy a little BCH, first mainnet payout |
| 6 | Thu 19 | Results page, polish, deploy |
| 7 | Fri 20 | Widget Factory deck, demo video |
| 8 | Sat 21 | Final check-in stream, fixes |
| 9 | Sun 22 | Submit on DoraHacks before 14:00 UTC |
