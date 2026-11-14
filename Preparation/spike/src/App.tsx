import { useEffect, useMemo, useRef, useState } from "react";
import { decodeHdPublicKey, deriveHdPublicNodeChild } from "@bitauth/libauth";
import { useWizardConnect, WizardConnectQRDialog } from "@wizardconnect/react";
import { NETWORKS, broadcast, buildPayout, fetchUtxos, fmtBch, pubkeyToAddress, txidOf, type Network, type Payout, type Utxo } from "./bch";

const SCAN_INDICES = 10; // how many receive addresses to check for coins

export default function App() {
  const [network, setNetwork] = useState<Network>("chipnet");
  const wc = useWizardConnect({ dappName: "BCH Bounty Spike" });
  const [showQR, setShowQR] = useState(false);
  const [addresses, setAddresses] = useState<{ index: number; address: string }[]>([]);
  const [utxos, setUtxos] = useState<Utxo[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [txid, setTxid] = useState<string | null>(null);

  // Fake bounty with two winners. Replace addresses with your own test wallets.
  const [winners, setWinners] = useState<Payout[]>([
    { address: "", sats: 1000n },
    { address: "", sats: 1000n },
  ]);

  const say = (s: string) => setLog((l) => [new Date().toLocaleTimeString() + "  " + s, ...l].slice(0, 30));

  // When wallet is ready, derive the first N receive addresses from its xpub.
  // Raw wallet_ready message, captured straight off the wire so we don't depend on library state.
  const walletReadyRef = useRef<any>(null);

  function receiveXpubFromRaw(msg: any): string | null {
    const session = msg?.session ?? {};
    for (const proto of Object.keys(session)) {
      const paths = (session[proto] as any)?.paths;
      if (Array.isArray(paths)) {
        const r = paths.find((p: any) => p?.name === "receive") ?? paths[0];
        if (r?.xpub) return r.xpub;
      }
    }
    return null;
  }

  function deriveAddresses(reason: string) {
    const m = wc.manager;
    const addrs: { index: number; address: string }[] = [];
    let source = "library";
    // 1) Library state
    if (m) {
      for (let i = 0; i < SCAN_INDICES; i++) {
        const pk = m.getPubkey(0, BigInt(i));
        if (!pk) break;
        addrs.push({ index: i, address: pubkeyToAddress(pk, network) });
      }
    }
    // 2) Fallback: derive directly from the raw wallet_ready xpub
    if (!addrs.length && walletReadyRef.current) {
      const xpub = receiveXpubFromRaw(walletReadyRef.current);
      if (xpub) {
        const dec = decodeHdPublicKey(xpub);
        if (typeof dec !== "string") {
          source = "raw xpub";
          for (let i = 0; i < SCAN_INDICES; i++) {
            const child = deriveHdPublicNodeChild(dec.node, i);
            if (typeof child === "string") break;
            addrs.push({ index: i, address: pubkeyToAddress(child.publicKey, network) });
          }
        } else say("xpub decode failed: " + dec);
      }
    }
    setAddresses(addrs);
    const raw = walletReadyRef.current;
    const sessKeys = raw ? Object.keys(raw.session ?? {}).join(",") || "empty" : "no wallet_ready seen";
    if (raw && !addrs.length) {
      const shape = JSON.stringify(raw.session, (_k, v) => (typeof v === "string" && v.length > 24 ? v.slice(0, 10) + "…(" + v.length + ")" : v));
      say("session shape: " + shape.slice(0, 600));
    }
    say(`${reason}: derived ${addrs.length} addresses (${addrs.length ? source : "none"}). session=[${sessKeys}] protocols=[${raw?.supported_protocols ?? "-"}]`);
  }

  // Derive once connected, again when wallet_ready arrives, and once more after a short delay.
  useEffect(() => {
    if (!wc.manager) return;
    const m = wc.manager;
    const onMsg = (msg: any) => {
      if (msg?.action === "wallet_ready") {
        walletReadyRef.current = msg;
        console.log("[spike] raw wallet_ready", msg);
        setTimeout(() => deriveAddresses("wallet_ready received"), 200);
      }
    };
    m.on("messagereceived", onMsg);
    const onReady = () => deriveAddresses("Wallet ready");
    m.on("walletready", onReady);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (wc.state === "connected") {
      deriveAddresses(`"${wc.walletName ?? "Wallet"}" connected`);
      t = setTimeout(() => deriveAddresses("Re-check after 3s"), 3000);
    }
    return () => { m.off("walletready", onReady); m.off("messagereceived", onMsg); if (t) clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wc.state, wc.manager, wc.walletName, network]);

  useEffect(() => { if (wc.uri && wc.state === "connecting") setShowQR(true); if (wc.state === "connected") setShowQR(false); }, [wc.uri, wc.state]);

  const balance = useMemo(() => utxos.reduce((s, u) => s + u.value, 0n), [utxos]);

  async function refresh() {
    if (!addresses.length) return;
    setBusy(true);
    try {
      const u = await fetchUtxos(network, addresses);
      setUtxos(u);
      say(`Found ${u.length} UTXOs, balance ${fmtBch(u.reduce((s, x) => s + x.value, 0n))}`);
    } catch (e: any) { say("UTXO fetch failed: " + (e?.message ?? e)); }
    finally { setBusy(false); }
  }

  async function payWinners() {
    if (!wc.manager || !addresses.length) return;
    setBusy(true); setTxid(null);
    try {
      const payouts = winners.filter((w) => w.address.trim());
      if (!payouts.length) throw new Error("Add at least one winner address");
      const built = buildPayout(utxos, payouts, addresses[0].address);
      say(`Built tx: ${payouts.length} payout(s), fee ${built.fee} sats, change ${built.change} sats. Asking wallet to sign…`);
      const res = await wc.manager.signTransaction({
        transaction: { transaction: built.txHex, sourceOutputs: built.sourceOutputs, userPrompt: "Pay bounty winners", broadcast: false },
        inputPaths: built.inputPaths,
      });
      if (res.error) throw new Error(res.error);
      say("Wallet signed. Broadcasting…");
      // We broadcast ourselves so any network error shows up here in plain text.
      const id = await broadcast(network, res.signedTransaction).catch((e) => {
        if (/already|known/i.test(String(e?.message))) return txidOf(res.signedTransaction);
        throw e;
      });
      setTxid(id);
      say("Broadcast. txid " + id);
      setTimeout(refresh, 3000);
    } catch (e: any) { say("Payout failed: " + (e?.message ?? e)); }
    finally { setBusy(false); }
  }

  function resetSession() {
    try { localStorage.removeItem("wizardconnect-session"); } catch {}
    location.reload();
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#eee", background: "#111", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 22 }}>BCH Bounty Spike</h1>
      <p style={{ color: "#999" }}>Throwaway. Connect a WizardConnect wallet, see coins, pay two "winners" in one transaction.</p>

      <section style={card}>
        <label>Network:&nbsp;
          <select value={network} onChange={(e) => { setNetwork(e.target.value as Network); setUtxos([]); }} disabled={wc.state === "connected"}>
            <option value="chipnet">chipnet (test coins)</option>
            <option value="mainnet">mainnet (real BCH)</option>
          </select>
        </label>
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <b>Wallet:</b> {wc.state} {wc.walletName ? `(${wc.walletName})` : ""}
          {wc.state !== "connected" ? <button onClick={() => { if (!wc.connect()) resetSession(); }}>Connect wallet</button> : <button onClick={() => wc.disconnect()}>Disconnect</button>}
          <button onClick={resetSession} title="Clear the saved session and show a fresh QR">Reset</button>
        </div>
        {wc.state === "connected" && addresses.length === 0 && (
          <div style={{ fontSize: 13, marginTop: 8 }}>
            <p style={{ margin: "0 0 6px" }}>Wallet didn't share addresses. <button onClick={() => deriveAddresses("Manual")}>Try again</button></p>
            <p style={{ margin: "0 0 6px", color: "#fc6" }}>Workaround: paste the address shown on Selene's WizardConnect screen.</p>
            <div style={{ display: "flex", gap: 6 }}>
              <input id="manual-addr" style={{ flex: 1 }} placeholder="bitcoincash:z… or bitcoincash:q…" />
              <button onClick={() => {
                const v = (document.getElementById("manual-addr") as HTMLInputElement).value.trim();
                if (!v) return;
                setAddresses([{ index: 0, address: v }]);
                say("Using pasted address as receive #0: " + v);
              }}>Use this address</button>
            </div>
          </div>
        )}
        {wc.state === "reconnecting" &&<p style={{ color: "#fc6", fontSize: 13 }}>Stuck on "reconnecting"? Click Reset, then Connect wallet for a fresh QR.</p>}
        {wc.error && <p style={{ color: "#f66" }}>{wc.error}</p>}
      </section>

      {addresses.length > 0 && (
        <section style={card}>
          <b>Your receive addresses</b> (first {addresses.length})
          <ul style={{ fontFamily: "monospace", fontSize: 12 }}>{addresses.map((a) => <li key={a.index}>#{a.index} {a.address}</li>)}</ul>
          <button onClick={refresh} disabled={busy}>Check balance</button> &nbsp; <b>{fmtBch(balance)}</b> in {utxos.length} UTXOs
          <p style={{ color: "#999", fontSize: 13 }}>No coins? Send some to address #0 (chipnet: use a faucet). Then click Check balance.</p>
        </section>
      )}

      <section style={card}>
        <b>Bounty: "Write the best thread about X"</b>
        <p style={{ color: "#999", fontSize: 13 }}>Pretend these are the winners. Paste any two {NETWORKS[network].prefix} addresses.</p>
        {winners.map((w, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input style={{ flex: 1 }} placeholder={`${NETWORKS[network].prefix}:q…`} value={w.address} onChange={(e) => setWinners(winners.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
            <input style={{ width: 110 }} type="number" value={Number(w.sats)} onChange={(e) => setWinners(winners.map((x, j) => j === i ? { ...x, sats: BigInt(e.target.value || 0) } : x))} /> sats
          </div>
        ))}
        <button onClick={payWinners} disabled={busy || wc.state !== "connected" || utxos.length === 0}>Pay winners (1 transaction)</button>
        {txid && <p>Paid. <a style={{ color: "#8cf" }} href={NETWORKS[network].explorer + txid} target="_blank" rel="noreferrer">View on explorer</a></p>}
      </section>

      <section style={card}>
        <b>Log</b>
        <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "#bbb" }}>{log.join("\n") || "—"}</pre>
      </section>

      {wc.uri && wc.qrUri && <WizardConnectQRDialog show={showQR} onClose={() => setShowQR(false)} uri={wc.uri} qrUri={wc.qrUri} subtitle="Scan with a WizardConnect wallet" />}
    </main>
  );
}

const card: React.CSSProperties = { border: "1px solid #333", borderRadius: 8, padding: 14, marginBottom: 14 };
