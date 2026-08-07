export type TimerPhase = "idle" | "heating" | "cooling" | "ready";

export type TimerSettings = {
  heatSeconds: number;
  coolSeconds: number;
};

export type TimerSnapshot = {
  phase: TimerPhase;
  remainingMs: number;
  durationMs: number;
  progress: number;
};

export const torchPresets = {
  low: { label: "Low", seconds: 45 },
  medium: { label: "Medium", seconds: 30 },
  high: { label: "High", seconds: 20 },
} as const;

export const goalPresets = {
  flavor: { label: "Flavor", seconds: 60 },
  balanced: { label: "Balanced", seconds: 45 },
  warmer: { label: "Warmer", seconds: 30 },
} as const;

export function clampSeconds(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.min(180, Math.max(5, Math.round(value)));
}

export function snapshot(
  phase: TimerPhase,
  deadline: number,
  durationMs: number,
  now = Date.now(),
): TimerSnapshot {
  if (phase === "idle" || phase === "ready") {
    return {
      phase,
      remainingMs: 0,
      durationMs,
      progress: phase === "ready" ? 1 : 0,
    };
  }

  const remainingMs = Math.max(0, deadline - now);
  const progress = durationMs <= 0 ? 1 : Math.min(1, Math.max(0, 1 - remainingMs / durationMs));
  return { phase, remainingMs, durationMs, progress };
}

export function formatRemaining(milliseconds: number): string {
  return Math.max(0, Math.ceil(milliseconds / 1000)).toString();
}
