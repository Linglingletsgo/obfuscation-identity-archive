import { Html } from "@react-three/drei";
import type { ArchiveGraphNode } from "../types/archive";

export function IdentityBillboardLabel({
  node,
  onClick,
  visible,
}: {
  node: ArchiveGraphNode;
  onClick?: () => void;
  visible: boolean;
}) {
  if (node.type !== "submission" || !visible) return null;

  return (
    <Html
      position={[node.position.x, node.position.y + 0.42, node.position.z]}
      center
      distanceFactor={12}
      className="identity-billboard"
    >
      <div
        role="button"
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
