export type SourceStage = 0 | 1 | 2;
export type ArchiveView = "collective" | "individual";

export type SourceGraphTag = {
  label: string;
  category?: string;
  role?: string;
  definition_source?: string;
  mobility?: number;
  stability?: number;
  contamination?: number;
  visibility?: number;
  confidence?: number;
};

export type SourceGraphNode = {
  id: string;
  type: string;
  label?: string;
  shell_form?: string;
  tag_count?: number;
  roles?: Record<string, number>;
  tags?: SourceGraphTag[];
  tag_labels?: string[];
  text_fragments?: {
    carriedFragment?: string;
  };
  consent?: unknown;
};

export type SourceGraphEvent =
  | string
  | {
      type?: string;
      visual?: string;
      intensity?: number;
    };

export type SourceGraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  scores?: Record<string, number>;
  evidence?: {
    sharedTags?: string[];
    sharedPlaces?: string[];
    conflictPairs?: [string, string][];
  };
  events?: SourceGraphEvent[];
};

export type SourceInteractionGraph = {
  algorithm?: string;
  version?: string;
  generated_at?: string;
  source_count?: number;
  nodes: SourceGraphNode[];
  edges: SourceGraphEdge[];
};

export type TimelineSourceText = {
  submission_id: string;
  identity_name?: string;
  carried_fragment?: string;
};

export type TimelineItem = {
  timeline_item_id: string;
  anchor_id: string | null;
  stage: SourceStage;
  stage_name?: string;
  generation_mode?: string;
  source_ids: string[];
  source_texts: TimelineSourceText[];
  group_size: number;
  sampling_channel?: string;
  pressure_score?: number;
  interaction_type?: string;
  scores?: Record<string, number>;
  events?: SourceGraphEvent[];
  avatar_vector?: Record<string, number>;
  avatar_tags?: Record<string, string[]>;
  active_tags_preview?: string[];
  preset_hint?: string;
  scoring_ref?: string;
};

export type TimelineAnchor = {
  anchor_id: string;
  identity_name?: string;
  global_collective_ref?: string;
  item_count?: number;
  items: TimelineItem[];
};

export type SourceTimeline = {
  timeline_id?: string;
  mode?: string;
  generated_at?: string;
  source_graph?: string;
  source_count?: number;
  budgets?: Record<string, number>;
  stage_names?: Record<string, string>;
  generation_modes?: Record<string, string>;
  global_collective_item: TimelineItem;
  anchors: TimelineAnchor[];
};

export type NormalizedArchiveEvent = {
  type: string;
  visual: string;
  intensity: number;
  source: "graph" | "timeline";
};

export type ArchiveNodeType =
  | "submission"
  | "tag"
  | "timeline_item"
  | "anchor"
  | "asset"
  | "collective";

export type ArchiveLinkType =
  | "interaction"
  | "shared_tag"
  | "conflict_tag"
  | "source_membership"
  | "anchor_membership"
  | "stage_transition"
  | "asset_link";

export type ArchiveGraphNode = {
  id: string;
  type: ArchiveNodeType;
  stage?: SourceStage;
  anchor_id?: string | null;
  source_ids: string[];
  identity_name?: string;
  carried_fragment?: string;
  tags: SourceGraphTag[];
  tag_labels: string[];
  scores: Record<string, number>;
  events: NormalizedArchiveEvent[];
  avatar_vector?: Record<string, number>;
  avatar_tags?: Record<string, string[]>;
  asset_path?: string;
  model_path?: string;
  position: { x: number; y: number; z: number };
  visual: {
    size: number;
    color_group: string;
    opacity: number;
    label: string;
    node_shape: "custom" | "sprite" | "particle" | "mark";
    node_style_key: string;
  };
};

export type ArchiveGraphLink = {
  id: string;
  source: string;
  target: string;
  type: ArchiveLinkType;
  weight: number;
  scores: Record<string, number>;
  events: NormalizedArchiveEvent[];
  visual: {
    style_key: string;
    opacity: number;
    thickness: number;
    dash: boolean;
  };
};

export type ArchiveGraph = {
  nodes: ArchiveGraphNode[];
  links: ArchiveGraphLink[];
  metadata: {
    layout: "deterministic-avatar-map" | "stage2-model-sampled-avatar-map";
    seed: string;
    source_files: string[];
    generated_at: string;
  };
};

export type CollectiveNavigationMode = "overview" | "internal";

export type CollectiveNavigationState = {
  mode: CollectiveNavigationMode;
  selectedIdentityId: string | null;
  hoveredNodeId: string | null;
  hoveredTagLabel: string | null;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
};
