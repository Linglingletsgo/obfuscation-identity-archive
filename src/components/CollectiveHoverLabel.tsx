import { Html } from "@react-three/drei";
import type { ArchiveGraphNode } from "../types/archive";

export function CollectiveHoverLabel({ node, opacity = 1 }: { node: ArchiveGraphNode | null; opacity?: number }) {
  if (!node || node.type !== "tag") return null;

  return (
    <Html
      position={[node.position.x, node.position.y + 0.24, node.position.z]}
      center
      distanceFactor={10}
      className="tag-hover-label"
      zIndexRange={[100, 0]}
    >
      <span style={{ opacity }}>{node.visual.label}</span>
    </Html>
  );
}
