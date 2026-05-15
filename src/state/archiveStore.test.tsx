import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveProvider, useArchiveStore } from "./archiveStore";

describe("archive store", () => {
  it("starts in Stage5 and can enter Stage0 for an identity", () => {
    const { result } = renderHook(() => useArchiveStore(), { wrapper: ArchiveProvider });

    expect(result.current.stage).toBe(5);

    act(() => result.current.openIdentity("submission_a"));

    expect(result.current.stage).toBe(0);
    expect(result.current.selectedIdentityId).toBe("submission_a");
  });
});
