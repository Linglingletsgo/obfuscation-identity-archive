import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { ArchiveGraph, ArchiveGraphNode, ArchiveStage, SourceTimeline } from "../types/archive";

type ArchiveFilters = {
  query: string;
  tag: string;
  linkDensity: number;
  showIsolated: boolean;
};

type ArchiveStore = {
  stage: ArchiveStage;
  selectedIdentityId: string | null;
  selectedTimelineItemId: string | null;
  selectedNode: ArchiveGraphNode | null;
  graph: ArchiveGraph | null;
  timeline: SourceTimeline | null;
  filters: ArchiveFilters;
  setGraph: (graph: ArchiveGraph) => void;
  setTimeline: (timeline: SourceTimeline) => void;
  openIdentity: (identityId: string) => void;
  openStage: (stage: ArchiveStage, timelineItemId?: string) => void;
  openCollective: () => void;
  selectNode: (node: ArchiveGraphNode | null) => void;
  setFilters: (filters: Partial<ArchiveFilters>) => void;
};

const ArchiveContext = createContext<ArchiveStore | null>(null);

const initialFilters: ArchiveFilters = {
  query: "",
  tag: "",
  linkDensity: archiveVisualConfig.graph.defaultLinkDensity,
  showIsolated: true,
};

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<ArchiveStage>(5);
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(null);
  const [selectedTimelineItemId, setSelectedTimelineItemId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchiveGraphNode | null>(null);
  const [graph, setGraph] = useState<ArchiveGraph | null>(null);
  const [timeline, setTimeline] = useState<SourceTimeline | null>(null);
  const [filters, setFilterState] = useState<ArchiveFilters>(initialFilters);

  const value = useMemo<ArchiveStore>(
    () => ({
      stage,
      selectedIdentityId,
      selectedTimelineItemId,
      selectedNode,
      graph,
      timeline,
      filters,
      setGraph,
      setTimeline,
      openIdentity(identityId) {
        setSelectedIdentityId(identityId);
        setSelectedTimelineItemId(null);
        setStage(0);
      },
      openStage(nextStage, timelineItemId) {
        setStage(nextStage);
        setSelectedTimelineItemId(timelineItemId ?? null);
      },
      openCollective() {
        setStage(5);
        setSelectedTimelineItemId(null);
      },
      selectNode(node) {
        setSelectedNode(node);
      },
      setFilters(next) {
        setFilterState((current) => ({ ...current, ...next }));
      },
    }),
    [filters, graph, selectedIdentityId, selectedNode, selectedTimelineItemId, stage, timeline],
  );

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchiveStore() {
  const value = useContext(ArchiveContext);
  if (!value) {
    throw new Error("useArchiveStore must be used inside ArchiveProvider");
  }
  return value;
}
