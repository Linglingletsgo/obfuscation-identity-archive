import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useMemo, useRef } from "react";
import * as THREE from "three";
import { researchTimelineEvents, type ResearchTimelineEvent } from "../data/researchTimeline";
import { useArchiveStore } from "../state/archiveStore";

export type TimelineCameraPose = {
  lookAt: [number, number, number];
  position: [number, number, number];
};

const EVENT_PATH_START_Y = 42;
const EVENT_PATH_END_Y = -42;
const EVENT_PATH_RANGE = EVENT_PATH_START_Y - EVENT_PATH_END_Y;
const EVENT_PROGRESS_END = 0.86;
const AVATAR_REVEAL_START = 0.72;
const AVATAR_REVEAL_END = 0.9;
const COLLECTIVE_CAMERA_TRANSITION_START = 0.7;
export const COLLECTIVE_CAMERA_TRANSITION_END = 0.88;
export const TIMELINE_COLLECTIVE_OFFSET_Y = -68;
const COLLECTIVE_POSITION: [number, number, number] = [0, TIMELINE_COLLECTIVE_OFFSET_Y + 10.5, 40];
const COLLECTIVE_TARGET: [number, number, number] = [0, TIMELINE_COLLECTIVE_OFFSET_Y, 0];
const TIMELINE_LINKS_Y = -48;
const TIMELINE_LINKS_VISIBLE_START = 0.66;
const TIMELINE_LINKS_VISIBLE_END = 0.88;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function getTimelineEventPosition(index: number, eventCount: number): [number, number, number] {
  const progress = eventCount <= 1 ? 0 : index / (eventCount - 1);
  const side = index % 2 === 0 ? -1 : 1;
  const x = side * (4.8 + (index % 3) * 1.25);
  const y = EVENT_PATH_START_Y - progress * EVENT_PATH_RANGE;
  const z = -1.8 - (index % 4) * 1.15;
  return [x, y, z];
}

export function getTimelineCameraPose(progress: number): TimelineCameraPose {
  const lookAt: [number, number, number] = [0, 0, 0];
  const position: [number, number, number] = [0, 0, 0];
  writeTimelineCameraPose(progress, position, lookAt);
  return { lookAt, position };
}

function writeTimelineCameraPose(
  progress: number,
  position: [number, number, number],
  lookAt: [number, number, number],
) {
  const clampedProgress = clamp01(progress);
  const eventProgress = clamp01(clampedProgress / EVENT_PROGRESS_END);
  const pathY = EVENT_PATH_START_Y + 4 - eventProgress * (EVENT_PATH_RANGE + 10);
  const transition = smoothstep(COLLECTIVE_CAMERA_TRANSITION_START, COLLECTIVE_CAMERA_TRANSITION_END, clampedProgress);

  lookAt[0] = COLLECTIVE_TARGET[0] * transition;
  lookAt[1] = pathY - 8 + (COLLECTIVE_TARGET[1] - (pathY - 8)) * transition;
  lookAt[2] = -4 + (COLLECTIVE_TARGET[2] + 4) * transition;
  position[0] = COLLECTIVE_POSITION[0] * transition;
  position[1] = pathY + (COLLECTIVE_POSITION[1] - pathY) * transition;
  position[2] = 18 + (COLLECTIVE_POSITION[2] - 18) * transition;
}

export function getAvatarRevealOpacity(progress: number): number {
  return smoothstep(AVATAR_REVEAL_START, AVATAR_REVEAL_END, progress);
}

function getEventVisibility(progress: number, index: number, eventCount: number): number {
  const eventProgress = eventCount <= 1 ? 0 : index / (eventCount - 1);
  const timelineProgress = clamp01(progress / EVENT_PROGRESS_END);
  const distance = Math.abs(eventProgress - timelineProgress);
  const baseVisibility = 1 - smoothstep(0.045, 0.18, distance);
  const transitionFade = 1 - smoothstep(0.72, 0.84, progress);
  return baseVisibility * transitionFade;
}

export function getTimelineArchiveLinksOpacity(progress: number): number {
  return smoothstep(TIMELINE_LINKS_VISIBLE_START, TIMELINE_LINKS_VISIBLE_START + 0.05, progress) *
    (1 - smoothstep(TIMELINE_LINKS_VISIBLE_END - 0.04, TIMELINE_LINKS_VISIBLE_END, progress));
}

function TimelineCameraRig() {
  const { camera } = useThree();
  const { timelineProgressRef } = useArchiveStore();
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const positionTarget = useMemo(() => new THREE.Vector3(), []);
  const posePosition = useMemo<[number, number, number]>(() => [0, 0, 0], []);
  const poseLookAt = useMemo<[number, number, number]>(() => [0, 0, 0], []);

  useFrame(() => {
    const progress = timelineProgressRef.current;
    if (progress >= COLLECTIVE_CAMERA_TRANSITION_END) return;

    writeTimelineCameraPose(progress, posePosition, poseLookAt);
    positionTarget.set(posePosition[0], posePosition[1], posePosition[2]);
    camera.position.lerp(positionTarget, 0.18);
    lookTarget.set(poseLookAt[0], poseLookAt[1], poseLookAt[2]);
    camera.lookAt(lookTarget);
  });

  return null;
}

function TimelineMistField() {
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const { timelineProgressRef } = useArchiveStore();
  const points = useMemo(() => {
    const positions = new Float32Array(360 * 3);
    for (let index = 0; index < 360; index += 1) {
      const seedA = ((index * 16807) % 2147483647) / 2147483647;
      const seedB = ((index * 48271) % 2147483647) / 2147483647;
      const seedC = ((index * 69621) % 2147483647) / 2147483647;
      positions[index * 3] = (seedA - 0.5) * 22;
      positions[index * 3 + 1] = EVENT_PATH_START_Y + 10 - seedB * (EVENT_PATH_RANGE + 26);
      positions[index * 3 + 2] = -5 - seedC * 18;
    }
    return positions;
  }, []);

  useFrame(() => {
    if (!materialRef.current) return;
    const progress = timelineProgressRef.current;
    materialRef.current.opacity = 0.05 + (1 - getAvatarRevealOpacity(progress)) * 0.13;
  });

  return (
    <points renderOrder={2}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color="#8eefff"
        depthWrite={false}
        opacity={0.18}
        size={0.09}
        transparent
      />
    </points>
  );
}

const TimelineEventPanel = forwardRef<
  HTMLAnchorElement,
  { event: ResearchTimelineEvent; index: number; totalEvents: number }
>(({ event, index, totalEvents }, ref) => {
  const primaryLink = event.links[0];
  return (
    <a
      ref={ref}
      className="timeline-3d-event-card"
      href={primaryLink.url}
      rel="noreferrer"
      style={{
        opacity: 0,
        pointerEvents: "none",
        display: "none",
      }}
      target="_blank"
    >
      <span>{event.year}</span>
      <h2>{event.title}</h2>
      <p>{event.description}</p>
    </a>
  );
});
TimelineEventPanel.displayName = "TimelineEventPanel";

const TimelineArchiveLinks = forwardRef<HTMLElement>((_, ref) => {
  return (
    <nav
      ref={ref}
      className="timeline-3d-archive-links"
      aria-label="Archive links"
      style={{ opacity: 0, pointerEvents: "none", display: "none" }}
    >
      <a href="/index">Index Database</a>
      <a href="https://survey.dominicduan.com/" target="_blank" rel="noreferrer">
        Obfuscation Identity Archive Survey
      </a>
      <a href="/technical" aria-disabled="true">
        Technical Route
      </a>
    </nav>
  );
});
TimelineArchiveLinks.displayName = "TimelineArchiveLinks";

export function EntryTimeline3D() {
  const { timelineProgressRef } = useArchiveStore();
  const panelRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const linksRef = useRef<HTMLElement>(null);

  useFrame(() => {
    const progress = timelineProgressRef.current;

    // Update panels
    const totalEvents = researchTimelineEvents.length;
    for (let i = 0; i < totalEvents; i++) {
      const panel = panelRefs.current[i];
      if (panel) {
        const opacity = getEventVisibility(progress, i, totalEvents);
        panel.style.opacity = opacity.toString();
        panel.style.pointerEvents = opacity > 0.25 ? "auto" : "none";
        panel.style.display = opacity <= 0.02 ? "none" : "";
      }
    }

    // Update links
    const links = linksRef.current;
    if (links) {
      const opacity = getTimelineArchiveLinksOpacity(progress);
      links.style.opacity = opacity.toString();
      links.style.pointerEvents = opacity > 0.4 ? "auto" : "none";
      links.style.display = opacity <= 0.02 ? "none" : "";
    }
  });

  return (
    <group>
      <TimelineCameraRig />
      <TimelineMistField />
      <ambientLight intensity={0.45} />
      <pointLight color="#42d6b3" intensity={0.85} position={[0, 18, 8]} />
      {researchTimelineEvents.map((event, index) => {
        const position = getTimelineEventPosition(index, researchTimelineEvents.length);
        return (
          <group key={`${event.year}:${event.title}`} position={position}>
            <Html
              center
              distanceFactor={9}
              position={[position[0] > 0 ? 1.8 : -1.8, 0, 0]}
              transform
              zIndexRange={[20, 0]}
            >
              <TimelineEventPanel
                ref={(el) => {
                  panelRefs.current[index] = el;
                }}
                event={event}
                index={index}
                totalEvents={researchTimelineEvents.length}
              />
            </Html>
          </group>
        );
      })}
      <Html
        center
        position={[0, TIMELINE_LINKS_Y, -3.5]}
        zIndexRange={[80, 40]}
      >
        <TimelineArchiveLinks ref={linksRef} />
      </Html>
    </group>
  );
}
