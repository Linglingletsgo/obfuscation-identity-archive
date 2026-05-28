import { describe, expect, it } from "vitest";
import { shouldEnterCollectiveFromTimeline } from "./ResearchTimelineIntro";
import { researchTimelineEvents } from "../data/researchTimeline";
import {
  TIMELINE_COLLECTIVE_OFFSET_Y,
  getTimelineCameraPose,
  getTimelineEventPosition,
  getAvatarRevealOpacity,
} from "./EntryTimeline3D";

describe("ResearchTimelineIntro helpers", () => {
  it("places timeline events along a descending 3D path", () => {
    expect(getTimelineEventPosition(0, 21)[1]).toBeGreaterThan(getTimelineEventPosition(20, 21)[1]);
  });

  it("enters the collective scene only at the bottom of the timeline", () => {
    expect(shouldEnterCollectiveFromTimeline(0.94)).toBe(false);
    expect(shouldEnterCollectiveFromTimeline(0.99)).toBe(false);
    expect(shouldEnterCollectiveFromTimeline(0.995)).toBe(true);
  });

  it("starts the collective scene while the timeline is exiting", () => {
    expect(getAvatarRevealOpacity(0.5)).toBe(0);
    expect(getAvatarRevealOpacity(0.73)).toBeGreaterThan(0);
    expect(getAvatarRevealOpacity(0.85)).toBeGreaterThan(0);
    expect(getAvatarRevealOpacity(0.91)).toBe(1);
    expect(getAvatarRevealOpacity(0.95)).toBeGreaterThan(0);
    expect(getAvatarRevealOpacity(0.98)).toBeGreaterThan(0);
    expect(getTimelineCameraPose(1).position).toEqual([0, TIMELINE_COLLECTIVE_OFFSET_Y + 10.5, 40]);
  });

  it("provides protest visual references for key timeline events", () => {
    const eventsWithImages = researchTimelineEvents.filter((event) => event.image);

    expect(eventsWithImages.length).toBeGreaterThanOrEqual(6);
    expect(
      eventsWithImages.every((event) =>
        event.image?.src.startsWith("/assets/timeline/"),
      ),
    ).toBe(true);
    expect(eventsWithImages.every((event) => Boolean(event.image?.alt))).toBe(
      true,
    );
  });
});
