export const archiveVisualConfig = {
  data: {
    interactionGraphPath:
      "/data/algorithm/interaction_graph_real_submissions.json",
    timelinePath:
      "/data/algorithm/timeline/anchor_timeline_real_submissions.json",
    graphCachePath: "/data/graph/relationship_graph_3d.json",
  },
  assets: {
    nearWhiteThreshold: 245,
    stage2CollectiveModelPath: "/models/global_stage2_collective.glb",
    stage2CollectivePointSamples: 160000,
    collectiveEnvironmentModelPath: "/models/env.glb",
    collectiveEnvironmentPointSamples: 90000,
    collectiveEnvironmentFieldRadius: 42,
    collectiveEnvironmentTexturePath:
      "/textures/environment_particle_sprite.png",
    collectiveParticleTexturePath: "/textures/particle_sprite.png",
    bakedPointClouds: {
      collectiveHigh:
        "/data/baked/collective_model_high.json",
      environmentHigh:
        "/data/baked/environment_high.json",
    },
    placeholderAvatarPath: "",
  },
  camera: {
    collectivePosition: [0, 10.5, 40] as const,
    detailPosition: [0, 2.8, 8] as const,
    minDistance: 3,
    maxDistance: 56,
    collectiveOverviewDistance: 40,
    collectiveInternalDistanceThreshold: 16,
    collectiveAvatarScale: 1.45,
    collectiveAvatarFieldRadius: 8.4,
  },
  rendering: {
    maxDevicePixelRatio: 1.35,
  },
  graph: {
    seed: "obfuscation-identity-archive-v1",
    defaultLinkDensity: 0.1,
    identityNodeSize: 1.2,
    tagNodeSize: 0.42,
    timelineNodeSize: 0.62,
    collectiveNodeSize: 2.4,
    hoverGlow: 1.8,
    conflictThreshold: 0.5,
    identitySpriteScale: 0.72,
    tagSpriteScale: 0.26,
    timelineSpriteScale: 0.34,
    tagSpriteOpacity: 0.78,
    identitySpriteOpacity: 0.94,
  },
  stages: {
    sidebarVisible: [0, 1],
    timelineVisible: [0, 1],
    mainUiStageLabelsVisible: false,
  },
  colors: {
    paper: "#17120f",
    ink: "#18140f",
    identity: "#e34d35",
    tag: "#5aa9ff",
    shared: "#3b6fb6",
    conflict: "#b02e4a",
    timeline: "#7a5cbd",
    collective: "#252525",
    missing: "#8b8172",
  },
} as const;
