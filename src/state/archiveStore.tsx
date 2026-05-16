import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type {
  ArchiveGraph,
  ArchiveGraphNode,
  ArchiveStage,
  SourceTimeline,
  Stage5NavigationState,
} from "../types/archive";

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
  stage5Navigation: Stage5NavigationState;
  filters: ArchiveFilters;
  setGraph: (graph: ArchiveGraph) => void;
  setTimeline: (timeline: SourceTimeline) => void;
  openIdentity: (identityId: string) => void;
  openStage: (stage: ArchiveStage, timelineItemId?: string) => void;
  openCollective: () => void;
  previewIdentity: (identityId: string) => void;
  enterIdentityDetail: (identityId: string) => void;
  selectNode: (node: ArchiveGraphNode | null) => void;
  updateStage5Navigation: (next: Partial<Stage5NavigationState>) => void;
  setFilters: (filters: Partial<ArchiveFilters>) => void;
};

const ArchiveContext = createContext<ArchiveStore | null>(null);

const initialFilters: ArchiveFilters = {
  query: "",
  tag: "",
  linkDensity: archiveVisualConfig.graph.defaultLinkDensity,
  showIsolated: true,
};

const initialStage5Navigation: Stage5NavigationState = {
  mode: "overview",
  selectedIdentityId: null,
  hoveredNodeId: null,
  hoveredTagLabel: null,
  cameraPosition: [...archiveVisualConfig.camera.stage5Position],
  cameraTarget: [0, 0, 0],
};

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<ArchiveStage>(5);
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(null);
  const [selectedTimelineItemId, setSelectedTimelineItemId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchiveGraphNode | null>(null);
  const [graph, setGraph] = useState<ArchiveGraph | null>(null);
  const [timeline, setTimeline] = useState<SourceTimeline | null>(null);
  const [stage5Navigation, setStage5Navigation] = useState<Stage5NavigationState>(initialStage5Navigation);
  const [filters, setFilterState] = useState<ArchiveFilters>(initialFilters);

  const value = useMemo<ArchiveStore>(
    () => ({
      stage,
      selectedIdentityId,
      selectedTimelineItemId,
      selectedNode,
      graph,
      timeline,
      stage5Navigation,
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
      previewIdentity(identityId) {
        setStage5Navigation((current) => ({
          ...current,
          selectedIdentityId: identityId,
        }));
      },
      enterIdentityDetail(identityId) {
        setSelectedIdentityId(identityId);
        setSelectedTimelineItemId(null);
        setStage(0);
      },
      selectNode(node) {
        setSelectedNode(node);
      },
      updateStage5Navigation(next) {
        setStage5Navigation((current) => ({ ...current, ...next }));
      },
      setFilters(next) {
        setFilterState((current) => ({ ...current, ...next }));
      },
    }),
    [filters, graph, selectedIdentityId, selectedNode, selectedTimelineItemId, stage, stage5Navigation, timeline],
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
