import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "./archiveStore";

describe("archive store", () => {
  it("starts in collective overview mode", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    expect(result.current.view).toBe("collective");
    expect(result.current.collectiveNavigation.mode).toBe("overview");
    expect(result.current.selectedIdentityId).toBeNull();
  });

  it("selects identity in collective without entering individual", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    act(() => result.current.previewIdentity("submission_a"));

    expect(result.current.view).toBe("collective");
    expect(result.current.collectiveNavigation.selectedIdentityId).toBe("submission_a");
    expect(result.current.selectedIdentityId).toBeNull();
  });

  it("enters individual only through explicit identity detail action", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    act(() => result.current.previewIdentity("submission_a"));
    act(() => result.current.enterIdentityDetail("submission_a"));

    expect(result.current.view).toBe("individual");
    expect(result.current.selectedIdentityId).toBe("submission_a");
    expect(result.current.collectiveNavigation.selectedIdentityId).toBe("submission_a");
  });

  it("returns to collective while preserving internal navigation state", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    act(() =>
      result.current.updateCollectiveNavigation({
        mode: "internal",
        selectedIdentityId: "submission_a",
        cameraPosition: [1, 2, 3],
        cameraTarget: [4, 5, 6],
      }),
    );
    act(() => result.current.enterIdentityDetail("submission_a"));
    act(() => result.current.openCollective());

    expect(result.current.view).toBe("collective");
    expect(result.current.collectiveNavigation.mode).toBe("internal");
    expect(result.current.collectiveNavigation.cameraPosition).toEqual([1, 2, 3]);
    expect(result.current.collectiveNavigation.selectedIdentityId).toBe("submission_a");
  });
});
