import { useEffect, useState } from "react";
import { JoinPage } from "./JoinPage";
import { ResidentPage } from "./ResidentPage";
import "./town.css";

function parseTownPath(pathname: string): { page: "join" } | { page: "resident"; id: string } {
  const match = pathname.match(/^\/town\/resident\/([^/]+)/);
  if (match) return { page: "resident", id: decodeURIComponent(match[1]) };
  return { page: "join" };
}

export default function TownApp() {
  const [path, setPath] = useState(window.location.pathname);
  const [isNewResident, setIsNewResident] = useState(false);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(to: string) {
    window.history.pushState(null, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }

  const route = parseTownPath(path);

  return (
    <div className="town-root">
      {route.page === "join" ? (
        <JoinPage
          onJoined={(residentId) => {
            setIsNewResident(true);
            navigate(`/town/resident/${residentId}`);
          }}
        />
      ) : (
        <ResidentPage
          residentId={route.id}
          isNew={isNewResident}
          onNavigateHome={() => {
            setIsNewResident(false);
            navigate("/town");
          }}
        />
      )}
    </div>
  );
}
