import Banner from "./Banner";
import { useRoute } from "./router";
import BountyList from "./pages/BountyList";
import NewBounty from "./pages/NewBounty";
import BountyDetail from "./pages/BountyDetail";
import "./styles.css";

export default function App() {
  const route = useRoute();
  return (
    <>
      <Banner />
      <main className="wrap">
        {route.name === "list" && <BountyList />}
        {route.name === "new" && <NewBounty />}
        {route.name === "bounty" && <BountyDetail id={route.id} />}
      </main>
    </>
  );
}
