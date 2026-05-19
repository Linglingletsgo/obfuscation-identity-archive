import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { archiveVisualConfig } from "../config/archiveVisualConfig";
import { TIMELINE_COLLECTIVE_OFFSET_Y } from "../components/EntryTimeline3D";
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
};

const initialCollectiveNavigation: CollectiveNavigationState = {
  mode: "overview",
  selectedIdentityId: null,
  hoveredNodeId: null,
  hoveredTagLabel: null,
  cameraPosition: [
    archiveVisualConfig.camera.collectivePosition[0],
    archiveVisualConfig.camera.collectivePosition[1] + TIMELINE_COLLECTIVE_OFFSET_Y,
    archiveVisualConfig.camera.collectivePosition[2],
  ],
  cameraTarget: [0, TIMELINE_COLLECTIVE_OFFSET_Y, 0],
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
  const openIdentity = useCallback((identityId: string) => {
    setSelectedIdentityId(identityId);
    setView("individual");
  }, []);
  const openCollective = useCallback(() => {
    setView("collective");
  }, []);
  const previewIdentity = useCallback((identityId: string) => {
    setCollectiveNavigation((current) => ({
      ...current,
      selectedIdentityId: identityId,
    }));
  }, []);
  const enterIdentityDetail = useCallback((identityId: string) => {
    setSelectedIdentityId(identityId);
    setView("individual");
  }, []);
  const selectNode = useCallback((node: ArchiveGraphNode | null) => {
    setSelectedNode(node);
  }, []);
  const updateCollectiveNavigation = useCallback((next: Partial<CollectiveNavigationState>) => {
    setCollectiveNavigation((current) => ({ ...current, ...next }));
  }, []);
  const setFilters = useCallback((next: Partial<ArchiveFilters>) => {
    setFilterState((current) => ({ ...current, ...next }));
  }, []);

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
      openIdentity,
      openCollective,
      previewIdentity,
      enterIdentityDetail,
      selectNode,
      updateCollectiveNavigation,
      setFilters,
    }),
    [
      collectiveNavigation,
      enterIdentityDetail,
      filters,
      graph,
      openCollective,
      openIdentity,
      previewIdentity,
      selectNode,
      selectedIdentityId,
      selectedNode,
      setFilters,
      timeline,
      updateCollectiveNavigation,
      view,
    ],
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
