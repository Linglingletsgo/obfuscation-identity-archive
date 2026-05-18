import { archiveVisualConfig } from "../config/archiveVisualConfig";
import type { ArchiveStage } from "../types/archive";

type AvatarPathInput = {
  stage: ArchiveStage;
  submissionId?: string;
  timelineItemId?: string;
};

type ModelPathInput = {
  stage: ArchiveStage;
  timelineItemId?: string;
};

export function getAvatarAssetPath(input: AvatarPathInput): string {
  if (input.stage === 0 && input.submissionId) {
    return `/assets/avatars/stage0/${input.submissionId}.png`;
  }

  if (input.stage === 1 && input.timelineItemId) {
    return `/assets/avatars/stage${input.stage}/${input.timelineItemId}.png`;
  }

  return archiveVisualConfig.assets.placeholderAvatarPath;
}

export function getModelAssetPath(input: ModelPathInput): string {
  if (input.stage === 2) {
    return archiveVisualConfig.assets.stage2CollectiveModelPath;
  }

  return "";
}
