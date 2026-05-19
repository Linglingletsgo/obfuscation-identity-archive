import { Html } from "@react-three/drei";
import type { ArchiveGraphNode } from "../types/archive";

export function IdentityBillboardLabel({
  node,
  onClick,
  opacity = 1,
  visible,
}: {
  node: ArchiveGraphNode;
  onClick?: () => void;
  opacity?: number;
  visible: boolean;
}) {
  if (node.type !== "submission" || !visible) return null;

  return (
    <Html
      position={[node.position.x, node.position.y + 0.42, node.position.z]}
      center
      distanceFactor={12}
      className="identity-billboard"
      style={{ opacity, pointerEvents: "none" }}
      zIndexRange={[12, 0]}
    >
      <div
        role="button"
        style={{ pointerEvents: opacity > 0.18 ? "auto" : "none" }}
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          onClick?.();
        }}
      >
        <strong>Name: {node.identity_name || node.id}</strong>
        {node.carried_fragment ? <span>{node.carried_fragment}</span> : null}
      </div>
    </Html>
  );
}
