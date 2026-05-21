import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ArchiveGraphNode } from "../types/archive";
import { IdentityBillboardLabel } from "./IdentityBillboardLabel";

vi.mock("@react-three/drei", () => ({
  Html({
    children,
    className,
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) {
    return (
      <div className={className} data-testid="billboard-html" style={style}>
        {children}
      </div>
    );
  },
}));

const identity: ArchiveGraphNode = {
  id: "submission_a",
  type: "submission",
  source_ids: ["submission_a"],
  identity_name: "Name A",
  carried_fragment: "Fragment A",
  tags: [],
  tag_labels: [],
  scores: {},
  events: [],
  position: { x: 0, y: 0, z: 0 },
  visual: {
    size: 1,
    color_group: "identity",
    opacity: 1,
    label: "Name: Name A\nFragment A",
    node_shape: "mark",
    node_style_key: "identity",
  },
};

describe("IdentityBillboardLabel", () => {
  it("keeps label clicks available to the scene event source", () => {
    const handleSceneClick = vi.fn();
    const handleLabelClick = vi.fn();

    render(
      <div onClick={handleSceneClick}>
        <IdentityBillboardLabel node={identity} onClick={handleLabelClick} visible />
      </div>,
    );

    expect(screen.getByTestId("billboard-html")).toHaveStyle({ pointerEvents: "none" });

    fireEvent.click(screen.getByRole("button", { name: /Name: Name A/i }));

    expect(handleLabelClick).toHaveBeenCalledTimes(1);
    expect(handleSceneClick).toHaveBeenCalledTimes(1);
  });
});
