import { useEffect, useState } from "react";
import { ArchiveExperience } from "./components/ArchiveExperience";
import { ArchiveIndexPage } from "./components/ArchiveIndexPage";
import { IndividualAvatarScene } from "./components/IndividualAvatarScene";
import { TechnicalRoutePage } from "./components/TechnicalRoutePage";
import { ArchiveProvider } from "./state/archiveStore";

function useCurrentPath(): string {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    function handleNavigation() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  return path;
}

function ArchiveRoute() {
  const path = useCurrentPath();

  if (path === "/index") return <ArchiveIndexPage />;
  if (path === "/technical") return <TechnicalRoutePage />;
  return <ArchiveExperience />;
}

export default function App() {
  return (
    <ArchiveProvider>
      <main className="archive-app" data-testid="archive-experience">
        <ArchiveRoute />
        <IndividualAvatarScene />
      </main>
    </ArchiveProvider>
  );
}
