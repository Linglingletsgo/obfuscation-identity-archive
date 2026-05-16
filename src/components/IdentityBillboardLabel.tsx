import { Html } from "@react-three/drei";
import type { ArchiveGraphNode } from "../types/archive";

export function IdentityBillboardLabel({ node, visible }: { node: ArchiveGraphNode; visible: boolean }) {
  if (node.type !== "submission" || !visible) return null;

  return (
    <Html
      position={[node.position.x, node.position.y + 0.42, node.position.z]}
      center
      distanceFactor={12}
      className="identity-billboard"
    >
      <strong>Name: {node.identity_name || node.id}</strong>
      {node.carried_fragment ? <span>{node.carried_fragment}</span> : null}
    </Html>
  );
}
