import { Html } from "@react-three/drei";
import type { ArchiveGraphNode } from "../types/archive";

export function Stage5HoverLabel({ node }: { node: ArchiveGraphNode | null }) {
  if (!node || node.type !== "tag") return null;

  return (
    <Html
      position={[node.position.x, node.position.y + 0.24, node.position.z]}
      center
      distanceFactor={10}
      className="tag-hover-label"
      zIndexRange={[100, 0]}
    >
      {node.visual.label}
    </Html>
  );
}
