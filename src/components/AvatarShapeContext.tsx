import { createContext, useContext } from "react";

const AvatarShapeContext = createContext<Float32Array | null>(null);

export const AvatarShapeProvider = AvatarShapeContext.Provider;

export function useAvatarShapePositions(): Float32Array | null {
  return useContext(AvatarShapeContext);
}
