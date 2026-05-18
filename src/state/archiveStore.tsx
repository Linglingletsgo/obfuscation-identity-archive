import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type {
  ArchiveView,
  ArchiveGraph,
  ArchiveGraphNode,
  SourceTimeline,
  CollectiveNavigationState,
} from "../types/archive";

type ArchiveFilters = {
  query: string;
  tag: string;
  linkDensity: number;
  showIsolated: boolean;
};

type ArchiveStore = {
  view: ArchiveView;
  selectedIdentityId: string | null;
  selectedNode: ArchiveGraphNode | null;
  graph: ArchiveGraph | null;
  timeline: SourceTimeline | null;
  collectiveNavigation: CollectiveNavigationState;
  filters: ArchiveFilters;
  setGraph: (graph: ArchiveGraph) => void;
  setTimeline: (timeline: SourceTimeline) => void;
  openIdentity: (identityId: string) => void;
  openCollective: () => void;
  previewIdentity: (identityId: string) => void;
  enterIdentityDetail: (identityId: string) => void;
  selectNode: (node: ArchiveGraphNode | null) => void;
  updateCollectiveNavigation: (next: Partial<CollectiveNavigationState>) => void;
  setFilters: (filters: Partial<ArchiveFilters>) => void;
};

const ArchiveContext = createContext<ArchiveStore | null>(null);

const initialFilters: ArchiveFilters = {
  query: "",
  tag: "",
  linkDensity: archiveVisualConfig.graph.defaultLinkDensity,
  showIsolated: true,
};

const initialCollectiveNavigation: CollectiveNavigationState = {
  mode: "overview",
  selectedIdentityId: null,
  hoveredNodeId: null,
  hoveredTagLabel: null,
  cameraPosition: [...archiveVisualConfig.camera.collectivePosition],
  cameraTarget: [0, 0, 0],
};

export function ArchiveProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ArchiveView>("collective");
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchiveGraphNode | null>(null);
  const [graph, setGraph] = useState<ArchiveGraph | null>(null);
  const [timeline, setTimeline] = useState<SourceTimeline | null>(null);
  const [collectiveNavigation, setCollectiveNavigation] =
    useState<CollectiveNavigationState>(initialCollectiveNavigation);
  const [filters, setFilterState] = useState<ArchiveFilters>(initialFilters);

  const value = useMemo<ArchiveStore>(
    () => ({
      view,
      selectedIdentityId,
      selectedNode,
      graph,
      timeline,
      collectiveNavigation,
      filters,
      setGraph,
      setTimeline,
      openIdentity(identityId) {
        setSelectedIdentityId(identityId);
        setView("individual");
      },
      openCollective() {
        setView("collective");
      },
      previewIdentity(identityId) {
        setCollectiveNavigation((current) => ({
          ...current,
          selectedIdentityId: identityId,
        }));
      },
      enterIdentityDetail(identityId) {
        setSelectedIdentityId(identityId);
        setView("individual");
      },
      selectNode(node) {
        setSelectedNode(node);
      },
      updateCollectiveNavigation(next) {
        setCollectiveNavigation((current) => ({ ...current, ...next }));
      },
      setFilters(next) {
        setFilterState((current) => ({ ...current, ...next }));
      },
    }),
    [collectiveNavigation, filters, graph, selectedIdentityId, selectedNode, timeline, view],
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
