import { describe, expect, it } from "vitest";
import {
  getTimelineBackgroundProgress,
  getTimelineBackgroundOpacity,
  shouldEnterCollectiveFromTimeline,
} from "./ResearchTimelineIntro";
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

  it("fades the timeline background before entering the collective scene", () => {
    expect(getTimelineBackgroundOpacity(0)).toBe(1);
    expect(getTimelineBackgroundOpacity(0.7)).toBeLessThan(1);
    expect(getTimelineBackgroundOpacity(0.9)).toBe(0);
  });

  it("maps the custom long background across the timeline depth", () => {
    expect(getTimelineBackgroundProgress(-0.2)).toBe(0);
    expect(getTimelineBackgroundProgress(0.5)).toBe(0.5);
    expect(getTimelineBackgroundProgress(1.2)).toBe(1);
  });

});
