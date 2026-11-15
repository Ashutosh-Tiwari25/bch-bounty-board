import { useEffect, useState } from "react";

// Hash routes so the app works as one static page anywhere:
//   #            -> bounty list
//   #new         -> create a bounty
//   #b/<id>      -> one bounty
export type Route = { name: "list" } | { name: "new" } | { name: "bounty"; id: string };

function parse(hash: string): Route {
  const h = hash.replace(/^#\/?/, "");
  if (h === "new") return { name: "new" };
  const m = h.match(/^b\/([a-z0-9]+)$/);
  if (m) return { name: "bounty", id: m[1] };
  return { name: "list" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = (hash: string) => {
  location.hash = hash;
};
