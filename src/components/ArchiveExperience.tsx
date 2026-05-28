import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useArchiveData } from "../data/useArchiveData";
import { useArchiveStore } from "../state/archiveStore";
import { CollectiveIdentityOverlay } from "./CollectiveIdentityOverlay";
import { ArchiveScene } from "./ArchiveScene";
import { COLLECTIVE_CAMERA_TRANSITION_END } from "./EntryTimeline3D";
import { ResearchTimelineIntro } from "./ResearchTimelineIntro";

const COLLECTIVE_INTERACTION_PROGRESS = COLLECTIVE_CAMERA_TRANSITION_END;
const COLLECTIVE_WHEEL_ZONE_LEFT = 0.22;
const COLLECTIVE_WHEEL_ZONE_RIGHT = 0.78;
const TIMELINE_PROGRESS_DAMPING = 10;
const TIMELINE_BACKGROUND_STATE_STEP = 0.003;

export function ArchiveExperience() {
  const { graph, view, timelineProgressRef } = useArchiveStore();
  const { message, status } = useArchiveData();
  const targetTimelineProgressRef = useRef(0);
  const [timelineOverlayProgress, setTimelineOverlayProgress] = useState(0);
  const [sceneShellElement, setSceneShellElement] = useState<HTMLDivElement | null>(null);
  const viewRef = useRef(view);
  const individualScrollPositionRef = useRef({ x: 0, y: 0 });
  const collectiveScrollPositionRef = useRef({ x: 0, y: 0, progress: 0 });
  const collectiveIdentities = useMemo(
    () => graph?.nodes.filter((node) => node.type === "submission") ?? [],
    [graph],
  );

  useLayoutEffect(() => {
    viewRef.current = view;
  }, [view]);

  useLayoutEffect(() => {
    if (view !== "individual") return undefined;

    individualScrollPositionRef.current = {
      x: collectiveScrollPositionRef.current.x,
      y: collectiveScrollPositionRef.current.y,
    };
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const { x, y } = individualScrollPositionRef.current;
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          const restoredProgress = Math.max(0, Math.min(1, y / maxScroll));
          window.scrollTo(x, y);
          targetTimelineProgressRef.current = restoredProgress;
          timelineProgressRef.current = restoredProgress;
          setTimelineOverlayProgress(restoredProgress);
        });
      });
    };
  }, [view]);

  useEffect(() => {
    if (status !== "ready") return undefined;

    let animationFrame = 0;
    let previousTime = performance.now();

    function animateProgress(time: number) {
      const deltaSeconds = Math.min(0.05, Math.max(0.001, (time - previousTime) / 1000));
      previousTime = time;

      const currentProgress = timelineProgressRef.current;
      const targetProgress = targetTimelineProgressRef.current;
      const smoothing = 1 - Math.exp(-TIMELINE_PROGRESS_DAMPING * deltaSeconds);
      const nextProgress =
        Math.abs(targetProgress - currentProgress) < 0.0005
          ? targetProgress
          : currentProgress + (targetProgress - currentProgress) * smoothing;

      if (nextProgress !== currentProgress) {
        timelineProgressRef.current = nextProgress;
        setTimelineOverlayProgress((currentOverlayProgress) =>
          Math.abs(currentOverlayProgress - nextProgress) < TIMELINE_BACKGROUND_STATE_STEP
            ? currentOverlayProgress
            : nextProgress,
        );
      }

      animationFrame = window.requestAnimationFrame(animateProgress);
    }

    animationFrame = window.requestAnimationFrame(animateProgress);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [status]);

  useEffect(() => {
    if (status !== "ready") return undefined;

    function syncProgressFromPageScroll() {
      if (viewRef.current === "individual") return;

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const nextProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      targetTimelineProgressRef.current = nextProgress;
      collectiveScrollPositionRef.current = {
        x: window.scrollX,
        y: window.scrollY,
        progress: nextProgress,
      };
    }

    function handleTimelineKey(event: KeyboardEvent) {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      targetTimelineProgressRef.current = 1;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: maxScroll, behavior: "smooth" });
    }

    window.scrollTo({ top: 0, behavior: "auto" });
    syncProgressFromPageScroll();
    window.addEventListener("scroll", syncProgressFromPageScroll, { passive: true });
    window.addEventListener("keydown", handleTimelineKey);
    return () => {
      window.removeEventListener("scroll", syncProgressFromPageScroll);
      window.removeEventListener("keydown", handleTimelineKey);
    };
  }, [status]);

  useEffect(() => {
    if (status !== "ready") return undefined;

    function handleCollectiveWheel(event: WheelEvent) {
      if (targetTimelineProgressRef.current < COLLECTIVE_INTERACTION_PROGRESS) return;
      const viewportWidth = Math.max(1, window.innerWidth);
      const pointerRatio = event.clientX / viewportWidth;
      const shouldZoomCollective =
        pointerRatio >= COLLECTIVE_WHEEL_ZONE_LEFT && pointerRatio <= COLLECTIVE_WHEEL_ZONE_RIGHT;

      if (!shouldZoomCollective) return;
      event.preventDefault();
    }

    window.addEventListener("wheel", handleCollectiveWheel, { capture: true, passive: false });
    return () => window.removeEventListener("wheel", handleCollectiveWheel, { capture: true });
  }, [status]);

  useEffect(() => {
    if (status !== "ready") return undefined;

    function handleReturnKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "t") return;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: maxScroll * 0.94, behavior: "smooth" });
      targetTimelineProgressRef.current = 0.94;
    }

    window.addEventListener("keydown", handleReturnKey);
    return () => window.removeEventListener("keydown", handleReturnKey);
  }, [status]);

  if (status === "loading") {
    return <section className="archive-loading">{message}</section>;
  }

  if (status === "error") {
    return (
      <section role="alert" className="archive-loading">
        {message}
      </section>
    );
  }

  return (
    <section
      className="archive-experience"
      data-view={view}
      data-entry-mode="unified"
      data-testid="archive-experience"
      style={{ "--archive-3d-texture-opacity": Math.max(0, Math.min(1, (timelineOverlayProgress - 0.82) / 0.14)).toString() } as React.CSSProperties}
    >
      <div className="archive-scene-shell" ref={setSceneShellElement}>
        <ArchiveScene canvasEventSource={sceneShellElement ?? undefined} />
      </div>
      <ResearchTimelineIntro progress={timelineOverlayProgress} />
      <div className="collective-scroll-gutter collective-scroll-gutter-left" aria-hidden="true" />
      <div className="collective-scroll-gutter collective-scroll-gutter-right" aria-hidden="true" />
      <CollectiveIdentityOverlay identities={collectiveIdentities} />
    </section>
  );
}
