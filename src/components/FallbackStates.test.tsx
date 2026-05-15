import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState, WebGLFallback } from "./FallbackStates";

describe("FallbackStates", () => {
  it("renders WebGL fallback content", () => {
    render(<WebGLFallback />);
    expect(screen.getByText(/WebGL is unavailable/i)).toBeInTheDocument();
  });

  it("renders empty filter state", () => {
    render(<EmptyState message="No archive nodes match the current filters" />);
    expect(screen.getByText("No archive nodes match the current filters")).toBeInTheDocument();
  });
});
