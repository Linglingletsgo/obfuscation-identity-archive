import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "./archiveStore";

describe("archive store", () => {
  it("starts in Stage5 overview mode", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    expect(result.current.stage).toBe(5);
    expect(result.current.stage5Navigation.mode).toBe("overview");
    expect(result.current.selectedIdentityId).toBeNull();
  });

  it("selects identity in Stage5 without entering Stage0", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    act(() => result.current.previewIdentity("submission_a"));

    expect(result.current.stage).toBe(5);
    expect(result.current.stage5Navigation.selectedIdentityId).toBe("submission_a");
    expect(result.current.selectedIdentityId).toBeNull();
  });

  it("enters Stage0 only through explicit identity detail action", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    act(() => result.current.previewIdentity("submission_a"));
    act(() => result.current.enterIdentityDetail("submission_a"));

    expect(result.current.stage).toBe(0);
    expect(result.current.selectedIdentityId).toBe("submission_a");
    expect(result.current.stage5Navigation.selectedIdentityId).toBe("submission_a");
  });

  it("returns to Stage5 while preserving internal navigation state", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    act(() =>
      result.current.updateStage5Navigation({
        mode: "internal",
        selectedIdentityId: "submission_a",
        cameraPosition: [1, 2, 3],
        cameraTarget: [4, 5, 6],
      }),
    );
    act(() => result.current.enterIdentityDetail("submission_a"));
    act(() => result.current.openCollective());

    expect(result.current.stage).toBe(5);
    expect(result.current.stage5Navigation.mode).toBe("internal");
    expect(result.current.stage5Navigation.cameraPosition).toEqual([1, 2, 3]);
    expect(result.current.stage5Navigation.selectedIdentityId).toBe("submission_a");
  });
});
