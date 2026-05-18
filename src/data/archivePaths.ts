import { archiveVisualConfig } from "../config/archiveVisualConfig";

type AvatarPathInput = {
  submissionId?: string;
};

export function getAvatarAssetPath(input: AvatarPathInput): string {
  if (input.submissionId) {
    return `/assets/avatars/stage0/${input.submissionId}.png`;
  }

  return archiveVisualConfig.assets.placeholderAvatarPath;
}

export function getCollectiveModelAssetPath(): string {
  return archiveVisualConfig.assets.stage2CollectiveModelPath;
}
