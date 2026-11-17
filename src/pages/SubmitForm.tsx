import { useState } from "react";
import { cashAddressToLockingBytecode } from "@bitauth/libauth";
import { addSubmission } from "../store";

export default function SubmitForm({ bountyId, onDone }: { bountyId: string; onDone: () => void }) {
  const [handle, setHandle] = useState("");
  const [link, setLink] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (handle.trim().length < 2) return setError("Add your name or @handle so the organizer knows who you are.");
    let url: URL;
    try {
      url = new URL(link.trim());
      if (!/^https?:$/.test(url.protocol)) throw new Error();
    } catch {
      return setError("Paste the full link to your work, starting with https://");
    }
    if (typeof cashAddressToLockingBytecode(address.trim()) === "string") return setError("That doesn't look like a BCH address. It should start with bitcoincash:");

    addSubmission({ bountyId, handle: handle.trim().replace(/^@/, ""), link: url.toString(), address: address.trim(), note: note.trim() });
    setHandle(""); setLink(""); setAddress(""); setNote(""); setError(null);
    onDone();
  }

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h2>Submit your entry</h2>
      <label htmlFor="s-handle">Your name or @handle</label>
      <input id="s-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" />

      <label htmlFor="s-link">Link to your work</label>
      <input id="s-link" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://x.com/you/status/…" />

      <label htmlFor="s-address">Your BCH address</label>
      <input id="s-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="bitcoincash:q…" />
      <p className="hint">If you win, the prize is sent here. Double-check it; payouts can't be reversed.</p>

      <label htmlFor="s-note">Note (optional)</label>
      <input id="s-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the organizer should know" />

      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" type="submit">Submit entry</button>
    </form>
  );
}
