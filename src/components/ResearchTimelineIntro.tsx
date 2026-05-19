const TIMELINE_BOTTOM_THRESHOLD = 0.995;

export function shouldEnterCollectiveFromTimeline(progress: number): boolean {
  return progress >= TIMELINE_BOTTOM_THRESHOLD;
}

export function shouldShowCollectiveEntryPrompt(progress: number): boolean {
  return shouldEnterCollectiveFromTimeline(progress);
}

export function ResearchTimelineIntro({
  progress,
}: {
  progress: number;
}) {
  return (
    <section className="research-timeline-intro" aria-label="Research narrative timeline" data-progress={progress}>
      <div className="research-timeline-space">
        <div className="research-timeline-sticky">
          <header className="research-timeline-header">
            <span>Obfuscation Identity Archive</span>
          </header>
          {shouldShowCollectiveEntryPrompt(progress) ? (
            <footer className="research-timeline-footer">
              <b>Press Space / Enter</b>
            </footer>
          ) : null}
        </div>
      </div>
    </section>
  );
}
