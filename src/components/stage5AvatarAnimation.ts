export function getAvatarBreathingScale(time: number): number {
  return Number((1 + Math.sin(time * 0.85) * 0.018).toFixed(4));
}

export function getAvatarPointOpacity(time: number, baseOpacity: number): number {
  return Number((baseOpacity * (0.88 + Math.sin(time * 0.7) * 0.1)).toFixed(4));
}
