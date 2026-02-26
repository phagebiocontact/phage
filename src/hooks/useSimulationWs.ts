import { useEffect, useRef, useState } from "react";

// Caps the visual data array to MAX_POINTS to prevent Recharts SVG memory crashes
export function downsample<T>(data: T[] | undefined, maxPoints: number = 200): T[] {
  if (!data || data.length <= maxPoints) return data ?? [];
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}
// ────────────────────────────────────────────────────────────────────────────────

export const MODAL_API_URL =
  (import.meta.env.VITE_MODAL_API_URL as string | undefined) ||
  "https://greenrace66--md-fapi.modal.run";

function toWsUrl(url: string): string {
  return url.replace(/^https/, "wss").replace(/^http(?!s)/, "ws");
}

export interface WsStatus {
  status?: string;
  current_step?: string;
  progress_percent?: number;
  time_elapsed_seconds?: number;
  details?: string;
  speed_ns_per_day?: number;
  analysis_data?: Record<string, unknown>;
  error?: string;
  paused?: boolean;
}

export interface LiveAnalysisPoint {
  frame: number;
  step: number;
  time_ns: number;
  rmsd?: number;
  rg?: number;
  helix?: number;
  sheet?: number;
  coil?: number;
  potential?: number;
  kinetic?: number;
  total?: number;
  rmsf?: number[]; // per-CA displacement from reference (Å)
}

interface UseSimulationWsOptions {
  modalJobId: string | null | undefined;
  enabled?: boolean;
}

export interface SimWsReturn {
  wsStatus: WsStatus | null;
  liveLogs: string[];
  liveLogsText: string;
  wsConnected: boolean;
  livePdbBase64: string | null;
  liveTrajectoryFrame: number;
  liveAnalysisPoints: LiveAnalysisPoint[];
  pauseJob: () => void;
  resumeJob: () => void;
  cancelJob: () => void;
}

function normalizeWsStatus(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  const map: Record<string, string> = {
    complete: "completed",
    completed: "completed",
    success: "completed",
    succeeded: "completed",
    successful: "completed",
    done: "completed",
    finished: "completed",
    finish: "completed",
    error: "failed",
    failed: "failed",
    failure: "failed",
    canceled: "canceled",
    cancelled: "canceled",
  };
  return map[raw.toLowerCase()] ?? raw.toLowerCase();
}


export function useSimulationWs({
  modalJobId,
  enabled = true,
}: UseSimulationWsOptions): SimWsReturn {
  const [wsStatus, setWsStatus] = useState<WsStatus | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [livePdbBase64, setLivePdbBase64] = useState<string | null>(null);
  const [liveTrajectoryFrame, setLiveTrajectoryFrame] = useState(0);
  const [liveAnalysisPoints, setLiveAnalysisPoints] = useState<LiveAnalysisPoint[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminalRef = useRef(false);

  useEffect(() => {
    if (!modalJobId || !enabled) return;

    terminalRef.current = false;
    setLiveLogs([]);
    setLiveAnalysisPoints([]);
    setLivePdbBase64(null);
    setLiveTrajectoryFrame(0);
    setWsStatus(null);

    function openStreamWs() {
      if (terminalRef.current) return;
      const ws = new WebSocket(
        `${toWsUrl(MODAL_API_URL)}/ws/jobs/${modalJobId}/stream`
      );
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as Record<string, unknown>;

          if (data.type === "status" && data.data) {
            const statusData = data.data as WsStatus;
            const normalizedStatus = normalizeWsStatus(statusData.status);
            const normalizedStatusData: WsStatus = {
              ...statusData,
              status: normalizedStatus,
            };
            setWsStatus(normalizedStatusData);
            if (
              ["completed", "failed", "canceled"].includes(
                normalizedStatusData?.status ?? ""
              )
            ) {
              terminalRef.current = true;
              if (reconnectRef.current) clearInterval(reconnectRef.current);
              ws.close();
            }
          }

          if (data.type === "logs" && Array.isArray(data.lines)) {
            const startLine = Number(data.start_line ?? 0);
            const incoming = (data.lines as unknown[]).map(String);
            setLiveLogs((prev: any[]) => {
              const base =
                startLine < prev.length ? prev.slice(0, startLine) : prev;
              const merged = [...base, ...incoming];
              return merged.length > 5000 ? merged.slice(-5000) : merged;
            });
          }

          if (data.type === "trajectory" && typeof data.pdb_b64 === "string") {
            setLivePdbBase64(data.pdb_b64);
            setLiveTrajectoryFrame(Number(data.frame ?? 0));
          }

          if (data.type === "analysis" && Array.isArray(data.points)) {
            const startIdx = Number(data.start_index ?? 0);
            const incoming = data.points as LiveAnalysisPoint[];
            setLiveAnalysisPoints((prev: any[]) => {
              const base =
                startIdx < prev.length ? prev.slice(0, startIdx) : prev;
              const merged = [...base, ...incoming];
              return merged.length > 2000 ? merged.slice(-2000) : merged;
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
      };

      ws.onerror = () => ws.close();
    }

    openStreamWs();

    reconnectRef.current = setInterval(() => {
      if (terminalRef.current) return;
      const state = wsRef.current?.readyState;
      if (state === undefined || state === WebSocket.CLOSED) openStreamWs();
    }, 4000);

    return () => {
      terminalRef.current = true;
      if (reconnectRef.current) clearInterval(reconnectRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setWsConnected(false);
    };
  }, [modalJobId, enabled]);

  const pauseJob = () => {
    wsRef.current?.send(JSON.stringify({ action: "pause" }));
  };

  const resumeJob = () => {
    wsRef.current?.send(JSON.stringify({ action: "resume" }));
  };

  const cancelJob = () => {
    wsRef.current?.send(JSON.stringify({ action: "cancel" }));
  };

  return {
    wsStatus,
    liveLogs,
    liveLogsText: liveLogs.join("\n"),
    wsConnected,
    livePdbBase64,
    liveTrajectoryFrame,
    liveAnalysisPoints,
    pauseJob,
    resumeJob,
    cancelJob,
  };
}

