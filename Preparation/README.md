# Preparation

Work done **before** BCH BLAZE 2026 started on 14 Nov, kept here so judges can see exactly what existed beforehand.

- `spike/`: a throwaway test page from 11–12 Nov to learn WizardConnect. It pairs with Selene by QR, reads a mainnet balance through Electrum, and has an untested "pay two winners in one transaction" button. The real app is rebuilt in the root of this repo; the only file carried over is listed below.
- `SPEC.md`: the plan for the bounty board, written on day 1.

**Reused:** `src/bch.ts` (address, UTXO and transaction helpers) starts as a copy of `spike/src/bch.ts`. Any changes to it after day 1 are hackathon work and show in the git history.
