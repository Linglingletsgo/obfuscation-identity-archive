import { lazy, Suspense, useEffect, useState } from "react";
import { ArchiveExperience } from "./components/ArchiveExperience";
import { ArchiveIndexPage } from "./components/ArchiveIndexPage";
import { IndividualAvatarScene } from "./components/IndividualAvatarScene";
import { TechnicalRoutePage } from "./components/TechnicalRoutePage";
import { ArchiveProvider } from "./state/archiveStore";

const TownApp = lazy(() => import("./town/TownApp"));

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

  if (path === "/archive/index" || path === "/index") return <ArchiveIndexPage />;
  if (path === "/archive/technical" || path === "/technical") return <TechnicalRoutePage />;
  return <ArchiveExperience />;
}

export default function App() {
  const path = useCurrentPath();

  // 根路径 / 以及所有小镇路由都进 TownApp
  if (path === "/" || path === "/town" || path.startsWith("/town/")) {
    return (
      <Suspense fallback={null}>
        <TownApp />
      </Suspense>
    );
  }

  // 3D 档案移至 /archive/*
  if (path === "/archive" || path.startsWith("/archive/")) {
    return (
      <ArchiveProvider>
        <main className="archive-app" data-testid="archive-experience">
          <ArchiveRoute />
          <IndividualAvatarScene />
        </main>
      </ArchiveProvider>
    );
  }

  // 旧路径兜底：/index /technical 仍可访问
  if (path === "/index" || path === "/technical") {
    return (
      <ArchiveProvider>
        <main className="archive-app" data-testid="archive-experience">
          <ArchiveRoute />
          <IndividualAvatarScene />
        </main>
      </ArchiveProvider>
    );
  }

  // 其余未知路径默认进小镇
  return (
    <Suspense fallback={null}>
      <TownApp />
    </Suspense>
  );
}
