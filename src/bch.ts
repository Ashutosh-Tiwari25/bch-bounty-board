// BCH helpers for the spike: addresses, UTXOs, building an unsigned payout tx.
// Everything here is chain-only; wallet signing goes through WizardConnect.

import {
  binToHex,
  cashAddressToLockingBytecode,
  decodeTransaction,
  encodeCashAddress,
  hash160,
  hashTransaction,
  hexToBin,
} from "@bitauth/libauth";
import { ElectrumClient } from "@electrum-cash/network";
import { sourceOutputToRelay, transactionToHex } from "@wizardconnect/core/hdwalletv1-serialize";

export type Network = "mainnet" | "chipnet";

export const NETWORKS: Record<Network, { prefix: "bitcoincash" | "bchtest"; electrum: string; explorer: string }> = {
  mainnet: { prefix: "bitcoincash", electrum: "electrum.imaginary.cash", explorer: "https://explorer.bch.ninja/tx/" },
  chipnet: { prefix: "bchtest", electrum: "chipnet.bch.ninja", explorer: "https://chipnet.bch.ninja/tx/" },
};

export interface Utxo {
  txid: string;
  vout: number;
  value: bigint;
  addressIndex: number; // receive-chain index the UTXO belongs to
  lockingBytecode: Uint8Array;
}

/** P2PKH cash address from a compressed public key. */
export function pubkeyToAddress(pubkey: Uint8Array, network: Network): string {
  const r = encodeCashAddress({ payload: hash160(pubkey), type: "p2pkh", prefix: NETWORKS[network].prefix });
  return typeof r === "string" ? r : r.address;
}

export function addressToLockingBytecode(address: string): Uint8Array {
  const r = cashAddressToLockingBytecode(address);
  if (typeof r === "string") throw new Error("Bad address: " + r);
  return r.bytecode;
}

// --- Electrum -------------------------------------------------------------

let client: ElectrumClient<any> | null = null;
let clientNet: Network | null = null;

export async function electrum(network: Network): Promise<ElectrumClient<any>> {
  if (client && clientNet === network) return client;
  if (client) { try { await client.disconnect(true); } catch {} }
  client = new ElectrumClient("bch-spike", "1.5.3", NETWORKS[network].electrum, { port: 50004, encrypted: true });
  await client.connect();
  clientNet = network;
  return client;
}

/** List unspent outputs for a set of (index, address) pairs. */
export async function fetchUtxos(network: Network, addrs: { index: number; address: string }[]): Promise<Utxo[]> {
  const c = await electrum(network);
  const out: Utxo[] = [];
  for (const a of addrs) {
    const res = (await c.request("blockchain.address.listunspent", a.address)) as any;
    if (res instanceof Error) throw res;
    for (const u of res as { tx_hash: string; tx_pos: number; value: number }[]) {
      out.push({ txid: u.tx_hash, vout: u.tx_pos, value: BigInt(u.value), addressIndex: a.index, lockingBytecode: addressToLockingBytecode(a.address) });
    }
  }
  return out;
}

export async function broadcast(network: Network, txHex: string): Promise<string> {
  const c = await electrum(network);
  const res = await c.request("blockchain.transaction.broadcast", txHex);
  if (res instanceof Error) throw res;
  return String(res);
}

// --- Transaction building --------------------------------------------------

const DUST = 546n;
const FEE_PER_BYTE = 1n;

export interface Payout { address: string; sats: bigint }

export interface BuiltTx {
  txHex: string;
  sourceOutputs: any[];
  inputPaths: [number, string, number][];
  fee: bigint;
  change: bigint;
}

/**
 * Build an unsigned tx paying `payouts`, funded from `utxos`, change to `changeAddress`.
 * Fee estimate: ~148 bytes per P2PKH input, 34 per output, 10 overhead.
 */
export function buildPayout(utxos: Utxo[], payouts: Payout[], changeAddress: string): BuiltTx {
  const total = payouts.reduce((s, p) => s + p.sats, 0n);
  for (const p of payouts) if (p.sats < DUST) throw new Error(`Payout to ${p.address} is below dust (${DUST} sats)`);

  const sorted = [...utxos].sort((a, b) => (a.value > b.value ? -1 : 1));
  const inputs: Utxo[] = [];
  let inSum = 0n;
  let fee = 0n;
  for (const u of sorted) {
    inputs.push(u);
    inSum += u.value;
    fee = BigInt(10 + 148 * inputs.length + 34 * (payouts.length + 1)) * FEE_PER_BYTE;
    if (inSum >= total + fee) break;
  }
  if (inSum < total + fee) throw new Error(`Insufficient funds: have ${inSum} sats, need ${total + fee}`);

  const change = inSum - total - fee;
  const outputs = payouts.map((p) => ({ valueSatoshis: p.sats, lockingBytecode: addressToLockingBytecode(p.address) }));
  if (change >= DUST) outputs.push({ valueSatoshis: change, lockingBytecode: addressToLockingBytecode(changeAddress) });

  const txInputs = inputs.map((u) => ({
    outpointTransactionHash: hexToBin(u.txid), // display order; transactionToHex/libauth reverse internally
    outpointIndex: u.vout,
    unlockingBytecode: new Uint8Array(),
    sequenceNumber: 0xffffffff,
  }));

  const txHex = transactionToHex(txInputs, outputs);
  const sourceOutputs = inputs.map((u) =>
    sourceOutputToRelay({
      outpointTransactionHash: hexToBin(u.txid),
      outpointIndex: u.vout,
      unlockingBytecode: new Uint8Array(),
      sequenceNumber: 0xffffffff,
      valueSatoshis: u.value,
      lockingBytecode: u.lockingBytecode,
    }),
  );
  const inputPaths: [number, string, number][] = inputs.map((u, i) => [i, "receive", u.addressIndex]);
  return { txHex, sourceOutputs, inputPaths, fee, change: change >= DUST ? change : 0n };
}

export function txidOf(signedHex: string): string {
  const d = decodeTransaction(hexToBin(signedHex));
  if (typeof d === "string") throw new Error(d);
  return hashTransaction(hexToBin(signedHex));
}

export const fmtBch = (sats: bigint) => (Number(sats) / 1e8).toFixed(8).replace(/\.?0+$/, "") + " BCH";
export { binToHex };
