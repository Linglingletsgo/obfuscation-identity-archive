import { Line, Sphere } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { useArchiveStore } from "../state/archiveStore";
import type { ArchiveGraph, ArchiveGraphNode } from "../types/archive";

function nodeColor(node: ArchiveGraphNode): string {
  if (node.type === "tag") return archiveVisualConfig.colors.tag;
  if (node.type === "timeline_item") return archiveVisualConfig.colors.timeline;
  if (node.type === "collective") return archiveVisualConfig.colors.collective;
  return archiveVisualConfig.colors.identity;
}

export function RelationshipGraph3D({ graph }: { graph: ArchiveGraph }) {
  const { filters, openIdentity, selectNode } = useArchiveStore();
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const query = filters.query.trim().toLowerCase();

  const visibleNodes = useMemo(() => {
    if (!query && !filters.tag) return graph.nodes;
    return graph.nodes.filter((node) => {
      const matchesQuery =
        !query ||
        [node.id, node.identity_name, node.carried_fragment, node.visual.label, ...node.tag_labels]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesTag = !filters.tag || node.tag_labels.includes(filters.tag);
      return matchesQuery && matchesTag;
    });
  }, [filters.tag, graph.nodes, query]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleLinks = graph.links.filter(
    (link) =>
      visibleIds.has(link.source) &&
      visibleIds.has(link.target) &&
      link.visual.opacity <= filters.linkDensity + 0.4,
  );

  return (
    <group>
      {visibleLinks.map((link) => {
        const source = nodeById.get(link.source);
        const target = nodeById.get(link.target);
        if (!source || !target) return null;

        return (
          <Line
            key={link.id}
            points={[
              new THREE.Vector3(source.position.x, source.position.y, source.position.z),
              new THREE.Vector3(target.position.x, target.position.y, target.position.z),
            ]}
            color={link.type === "conflict_tag" ? archiveVisualConfig.colors.conflict : archiveVisualConfig.colors.shared}
            lineWidth={Math.max(0.35, link.visual.thickness)}
            transparent
            opacity={link.visual.opacity}
          />
        );
      })}
      {visibleNodes.map((node) => (
        <Sphere
          key={node.id}
          args={[node.visual.size * 0.08, 12, 12]}
          position={[node.position.x, node.position.y, node.position.z]}
          onPointerOver={(event) => {
            event.stopPropagation();
            selectNode(node);
          }}
          onClick={(event) => {
            event.stopPropagation();
            selectNode(node);
            if (node.type === "submission") openIdentity(node.id);
          }}
        >
          <meshStandardMaterial color={nodeColor(node)} transparent opacity={node.visual.opacity} />
        </Sphere>
      ))}
    </group>
  );
}
