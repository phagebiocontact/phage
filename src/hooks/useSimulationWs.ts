import { useEffect, useRef, useState } from "react";

export const MODAL_API_URL =
  (import.meta.env.VITE_MODAL_API_URL as string | undefined) ||
  "https://greenrace66--md-fapi-dev.modal.run";

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

export interface LiveTrajectoryFrame {
  frame: number;
  step: number;
  timeNs: number;
  file?: string;
  url: string;
}

export interface LiveAnalysisData {
  energy: Array<{
    frame: number;
    time: number;
    potential: number;
    kinetic: number;
    total: number;
  }>;
  rg: Array<{
    frame: number;
    time: number;
    value: number;
  }>;
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
  liveStructureUrl: string | null;
  liveTrajectoryFrames: LiveTrajectoryFrame[];
  liveAnalysis: LiveAnalysisData;
}

const EMPTY_ANALYSIS: LiveAnalysisData = {
  energy: [],
  rg: [],
};

export function useSimulationWs({
  modalJobId,
  enabled = true,
}: UseSimulationWsOptions): SimWsReturn {
  const [wsStatus, setWsStatus] = useState<WsStatus | null>(null);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const [statusConnected, setStatusConnected] = useState(false);
  const [streamConnected, setStreamConnected] = useState(false);
  const [liveStructureUrl, setLiveStructureUrl] = useState<string | null>(null);
  const [liveTrajectoryFrames, setLiveTrajectoryFrames] = useState<LiveTrajectoryFrame[]>([]);
  const [liveAnalysis, setLiveAnalysis] = useState<LiveAnalysisData>(EMPTY_ANALYSIS);

  const statusWsRef = useRef<WebSocket | null>(null);
  const streamWsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminalRef = useRef(false);

  useEffect(() => {
    if (!modalJobId || !enabled) return;

    terminalRef.current = false;
    setLiveLogs([]);
    setLiveTrajectoryFrames([]);
    setLiveAnalysis(EMPTY_ANALYSIS);
    setLiveStructureUrl(null);

    function openStatusWs() {
      if (terminalRef.current) return;
      const ws = new WebSocket(`${toWsUrl(MODAL_API_URL)}/ws/jobs/${modalJobId}`);
      statusWsRef.current = ws;
      ws.onopen = () => setStatusConnected(true);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as WsStatus;
          setWsStatus(data);
          if (["completed", "failed", "canceled"].includes(data.status ?? "")) {
            terminalRef.current = true;
            if (reconnectRef.current) clearInterval(reconnectRef.current);
            ws.close();
            streamWsRef.current?.close();
          }
        } catch {
        }
      };
      ws.onclose = () => {
        setStatusConnected(false);
        statusWsRef.current = null;
      };
      ws.onerror = () => ws.close();
    }

    function openStreamWs() {
      if (terminalRef.current) return;
      const ws = new WebSocket(`${toWsUrl(MODAL_API_URL)}/ws/jobs/${modalJobId}/stream`);
      streamWsRef.current = ws;
      ws.onopen = () => setStreamConnected(true);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string) as Record<string, unknown>;

          if (data.type === "status" && data.status && typeof data.status === "object") {
            const statusMessage = data.status as WsStatus;
            setWsStatus(statusMessage);
          }

          if (data.type === "logs" && Array.isArray(data.lines)) {
            const startLine = Number(data.start_line ?? 0);
            const incoming = data.lines.map((line) => String(line));
            setLiveLogs((prev) => {
              const base = startLine < prev.length ? prev.slice(0, startLine) : prev;
              const merged = [...base, ...incoming];
              return merged.length > 4000 ? merged.slice(-4000) : merged;
            });
          }

          if (data.type === "trajectory" && Array.isArray(data.frames)) {
            const startIndex = Number(data.start_index ?? 0);
            const mapped = data.frames
              .map((raw) => {
                if (!raw || typeof raw !== "object") return null;
                const frameData = raw as Record<string, unknown>;
                const file = typeof frameData.file === "string" ? frameData.file : undefined;
                let url = typeof frameData.url === "string" ? frameData.url : "";
                if (!url && file) {
                  url = `${MODAL_API_URL}/jobs/${modalJobId}/files/${file}`;
                }
                if (!url) return null;
                return {
                  frame: Number(frameData.frame ?? 0),
                  step: Number(frameData.step ?? 0),
                  timeNs: Number(frameData.time_ns ?? 0),
                  file,
                  url,
                } satisfies LiveTrajectoryFrame;
              })
              .filter((frame): frame is LiveTrajectoryFrame => frame !== null);

            if (mapped.length > 0) {
              const latest = mapped[mapped.length - 1];
              setLiveStructureUrl(latest.url);
              setLiveTrajectoryFrames((prev) => {
                const base = startIndex < prev.length ? prev.slice(0, startIndex) : prev;
                const merged = [...base, ...mapped];
                return merged.length > 1000 ? merged.slice(-1000) : merged;
              });
            }
          }

          if (data.type === "analysis" && Array.isArray(data.points)) {
            const startIndex = Number(data.start_index ?? 0);
            const incoming = data.points.filter((point) => point && typeof point === "object") as Array<
              Record<string, unknown>
            >;

            setLiveAnalysis((prev) => {
              const baseEnergy = startIndex < prev.energy.length ? prev.energy.slice(0, startIndex) : prev.energy;
              const baseRg = startIndex < prev.rg.length ? prev.rg.slice(0, startIndex) : prev.rg;
              const nextEnergy = [...baseEnergy];
              const nextRg = [...baseRg];

              for (const point of incoming) {
                const frame = Number(point.frame ?? 0);
                const time = Number(point.time_ns ?? 0);
                const potential = Number(point.potential ?? 0);
                const kinetic = Number(point.kinetic ?? 0);
                const total = Number(point.total ?? potential + kinetic);
                nextEnergy.push({ frame, time, potential, kinetic, total });
                const rg = Number(point.rg);
                if (Number.isFinite(rg)) {
                  nextRg.push({ frame, time, value: rg });
                }
              }

              return {
                energy: nextEnergy.length > 2000 ? nextEnergy.slice(-2000) : nextEnergy,
                rg: nextRg.length > 2000 ? nextRg.slice(-2000) : nextRg,
              };
            });
          }
        } catch {
        }
      };
      ws.onclose = () => {
        setStreamConnected(false);
        streamWsRef.current = null;
      };
      ws.onerror = () => ws.close();
    }

    openStatusWs();
    openStreamWs();

    reconnectRef.current = setInterval(() => {
      if (terminalRef.current) return;
      const statusState = statusWsRef.current?.readyState;
      if (statusState === undefined || statusState === WebSocket.CLOSED) openStatusWs();
      const streamState = streamWsRef.current?.readyState;
      if (streamState === undefined || streamState === WebSocket.CLOSED) openStreamWs();
    }, 4000);

    return () => {
      terminalRef.current = true;
      if (reconnectRef.current) clearInterval(reconnectRef.current);
      statusWsRef.current?.close();
      streamWsRef.current?.close();
      statusWsRef.current = null;
      streamWsRef.current = null;
      setStatusConnected(false);
      setStreamConnected(false);
    };
  }, [modalJobId, enabled]);

  return {
    wsStatus,
    liveLogs,
    liveLogsText: liveLogs.join("\n"),
    wsConnected: statusConnected || streamConnected,
    liveStructureUrl,
    liveTrajectoryFrames,
    liveAnalysis,
  };
}
