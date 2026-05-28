import type { CSSProperties } from "react";

const TIMELINE_BOTTOM_THRESHOLD = 0.995;
const TIMELINE_BACKGROUND_FADE_START = 0.66;
const TIMELINE_BACKGROUND_FADE_END = 0.9;

type TimelineBackgroundStyle = CSSProperties & {
  "--timeline-background-opacity": number;
  "--timeline-background-progress": number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function getTimelineBackgroundOpacity(progress: number): number {
  return 1 - smoothstep(TIMELINE_BACKGROUND_FADE_START, TIMELINE_BACKGROUND_FADE_END, progress);
}

export function getTimelineBackgroundProgress(progress: number): number {
  return clamp01(progress);
}

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
  const backgroundOpacity = getTimelineBackgroundOpacity(progress);
  const backgroundStyle: TimelineBackgroundStyle = {
    "--timeline-background-opacity": backgroundOpacity,
    "--timeline-background-progress": getTimelineBackgroundProgress(progress),
  };

  return (
    <section
      className="research-timeline-intro"
      aria-label="Research narrative timeline"
      data-progress={progress}
      style={backgroundStyle}
    >
      <div className="timeline-background-collage" aria-hidden="true">
        <img
          src="/assets/timeline-background/timeline-background-long.jpg"
          alt=""
          loading="eager"
        />
      </div>
    </section>
  );
}
