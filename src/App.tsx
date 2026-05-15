import { ArchiveExperience } from "./components/ArchiveExperience";
import { ArchiveProvider } from "./state/archiveStore";

export default function App() {
  return (
    <ArchiveProvider>
      <main className="archive-app" data-testid="archive-experience">
        <ArchiveExperience />
      </main>
    </ArchiveProvider>
  );
}
