import Banner from "./Banner";
import "./styles.css";

export default function App() {
  return (
    <>
      <Banner />
      <main className="wrap">
        <h1>BCH Bounty Board</h1>
        <p className="sub">Post a bounty. Collect submissions. Pay every winner in one transaction.</p>
        <section className="card">
          <h2>Day 1</h2>
          <p>Project skeleton. Bounty pages land on day 2.</p>
        </section>
      </main>
    </>
  );
}
