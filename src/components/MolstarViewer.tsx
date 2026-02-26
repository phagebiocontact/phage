"use client";
import type { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { MODAL_API_URL } from "@/hooks/useSimulationWs";

interface MolstarViewerProps {
  structureUrl?: string;        // static PDB URL (Convex storage) — for fallback
  trajectoryUrl?: string;       // unused: replaced by frame API
  modalJobId?: string;          // Modal job ID — used to fetch frames via /frame/{n}
  livePdbBase64?: string;       // Live: base64-encoded PDB snapshot
  className?: string;
  onFrameChange?: (frame: number, total: number) => void;
  shouldRotate?: boolean;
  pdbId?: string;
}

export interface MolstarViewerRef {
  setRepresentation: (type: "cartoon" | "ball-and-stick" | "surface") => void;
  resetZoom: () => void;
  setFrame: (frame: number) => void;
  play: () => void;
  pause: () => void;
  setIsRotating: (isRotating: boolean) => void;
  setColor: (type: "chain" | "element" | "rainbow") => void;
}

async function initPlugin(container: HTMLDivElement): Promise<PluginUIContext> {
  const { createPluginUI } = await import("molstar/lib/mol-plugin-ui");
  const { renderReact18 } = await import("molstar/lib/mol-plugin-ui/react18");
  const { DefaultPluginUISpec } = await import("molstar/lib/mol-plugin-ui/spec");
  const { PluginConfig } = await import("molstar/lib/mol-plugin/config");

  const plugin = await createPluginUI({
    target: container,
    spec: {
      ...DefaultPluginUISpec(),
      config: [
        [PluginConfig.Viewport.ShowExpand, false],
        [PluginConfig.Viewport.ShowControls, false],
        [PluginConfig.Viewport.ShowSelectionMode, false],
        [PluginConfig.Viewport.ShowAnimation, false],
        [PluginConfig.Viewport.ShowSettings, false],
      ] as never,
      layout: {
        initial: {
          isExpanded: false,
          showControls: false,
          controlsDisplay: "reactive" as const,
          regionState: {
            left: "hidden" as const,
            right: "hidden" as const,
            top: "hidden" as const,
            bottom: "hidden" as const,
          },
        },
      },
      components: { remoteState: "none" },
    },
    render: renderReact18,
  });

  plugin.layout.setProps({
    showControls: false,
    regionState: { left: "hidden", right: "hidden", top: "hidden", bottom: "hidden" },
  });

  return plugin;
}

/** Get total frame count from the Modal frame-count API */
async function fetchFrameCount(jobId: string): Promise<number> {
  const res = await fetch(`${MODAL_API_URL}/jobs/${jobId}/frame-count`);
  if (!res.ok) return 0;
  const data = await res.json() as { total_frames?: number };
  return data.total_frames ?? 0;
}

// ─── WebSocket Frame Streaming ────────────────────────────────────────────────
const frameCache = new Map<string, string>(); // key: `jobId:frameIdx`
let playbackWs: WebSocket | null = null;
let currentWsJobId: string | null = null;
let wsReadyPromise: Promise<void> | null = null;
const frameResolvers = new Map<number, (pdb: string) => void>();

function getPlaybackWsUrl(jobId: string) {
  const base = MODAL_API_URL.replace(/^http/, "ws");
  return `${base}/ws/jobs/${jobId}/playback`;
}

async function connectPlaybackWs(jobId: string): Promise<void> {
  if (playbackWs && currentWsJobId === jobId && playbackWs.readyState === WebSocket.OPEN) {
    return wsReadyPromise || Promise.resolve();
  }

  if (playbackWs) {
    playbackWs.close();
    playbackWs = null;
  }

  currentWsJobId = jobId;
  playbackWs = new WebSocket(getPlaybackWsUrl(jobId));

  wsReadyPromise = new Promise((resolve, reject) => {
    if (!playbackWs) return reject();

    playbackWs.onopen = () => console.log("[ws-playback] Connected");

    playbackWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ready") {
          console.log(`[ws-playback] Trajectory loaded in RAM. ${data.total_frames} frames ready.`);
          resolve();
        } else if (data.type === "frame_data") {
          const { frame_index, pdb } = data;
          const key = `${jobId}:${frame_index}`;
          frameCache.set(key, pdb); // Cache it instantly
          const resolver = frameResolvers.get(frame_index);
          if (resolver) {
            resolver(pdb);
            frameResolvers.delete(frame_index);
          }
        } else if (data.error) {
          console.error("[ws-playback] Error:", data.error);
        }
      } catch (err) {
        console.error("[ws-playback] Failed to parse message", err);
      }
    };

    playbackWs.onerror = (err) => {
      console.error("[ws-playback] Connection error", err);
      reject(err);
    };

    playbackWs.onclose = () => {
      console.log("[ws-playback] Closed");
      playbackWs = null;
      currentWsJobId = null;
      wsReadyPromise = null;
    };
  });

  return wsReadyPromise;
}

async function getFramePdb(jobId: string, frameIndex: number): Promise<string> {
  const key = `${jobId}:${frameIndex}`;
  if (frameCache.has(key)) return frameCache.get(key)!;

  // Ensure socket is connected and trajectory is ready
  await connectPlaybackWs(jobId);

  return new Promise((resolve) => {
    // Register callback for when the socket pushes this frame back
    frameResolvers.set(frameIndex, resolve);

    // Request the frame from the backend RAM
    if (playbackWs && playbackWs.readyState === WebSocket.OPEN) {
      playbackWs.send(JSON.stringify({ action: "get_frame", frame_index: frameIndex }));
    }
  });
}
// ──────────────────────────────────────────────────────────────────────────────

async function loadPdbString(plugin: PluginUIContext, pdbString: string, dataNodeRef?: any) {
  if (dataNodeRef) {
    // Update existing data node in place (smooth live update)
    await plugin.build().to(dataNodeRef).update({ data: pdbString }).commit();
    return dataNodeRef;
  }
  await plugin.clear();
  const dataNode = await plugin.builders.data.rawData({ data: pdbString });
  const trajectory = await plugin.builders.structure.parseTrajectory(dataNode, "pdb");
  await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");
  const { PresetStructureRepresentations } = await import(
    "molstar/lib/mol-plugin-state/builder/structure/representation-preset"
  );
  const structs = plugin.managers.structure.hierarchy.current.structures;
  if (structs?.length) {
    await plugin.managers.structure.component.applyPreset(
      structs,
      PresetStructureRepresentations["polymer-and-ligand"]
    );
  }
  return dataNode;
}

async function loadPdbFromUrl(plugin: PluginUIContext, url: string) {
  await plugin.clear();
  const data = await plugin.builders.data.download(
    { url, isBinary: false },
    { state: { isGhost: true } }
  );
  const trajectory = await plugin.builders.structure.parseTrajectory(data, "pdb");
  await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");
  const { PresetStructureRepresentations } = await import(
    "molstar/lib/mol-plugin-state/builder/structure/representation-preset"
  );
  const structs = plugin.managers.structure.hierarchy.current.structures;
  if (structs?.length) {
    await plugin.managers.structure.component.applyPreset(
      structs,
      PresetStructureRepresentations["polymer-and-ligand"]
    );
  }
}

const MolstarViewer = forwardRef<MolstarViewerRef, MolstarViewerProps>(
  ({ structureUrl, modalJobId, livePdbBase64, className, onFrameChange, shouldRotate = false, pdbId }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pluginRef = useRef<PluginUIContext | null>(null);
    const initDoneRef = useRef(false);

    // Trajectory playback state
    const dataNodeRef = useRef<any>(null);      // current Molstar data node (for in-place update)
    const loadedKeyRef = useRef<string | null>(null);
    const totalFramesRef = useRef(0);
    const currentFrameRef = useRef(0);
    const isPlayingRef = useRef(false);
    const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prefetchQueueRef = useRef<Set<number>>(new Set());

    const onFrameChangeRef = useRef(onFrameChange);
    onFrameChangeRef.current = onFrameChange;
    const shouldRotateRef = useRef(shouldRotate);
    shouldRotateRef.current = shouldRotate;

    // Pre-fetch the next N frames in the background
    const prefetchAhead = (jobId: string, fromFrame: number, total: number, count = 5) => {
      for (let i = 1; i <= count; i++) {
        const fi = (fromFrame + i) % total;
        const key = `${jobId}:${fi}`;
        if (!frameCache.has(key) && !prefetchQueueRef.current.has(fi)) {
          prefetchQueueRef.current.add(fi);
          getFramePdb(jobId, fi)
            .then(() => { prefetchQueueRef.current.delete(fi); })
            .catch(() => { prefetchQueueRef.current.delete(fi); });
        }
      }
    };

    const showFrame = async (jobId: string, frameIndex: number) => {
      const plugin = pluginRef.current;
      if (!plugin) return;
      const pdb = await getFramePdb(jobId, frameIndex);
      dataNodeRef.current = await loadPdbString(plugin, pdb, dataNodeRef.current);
      currentFrameRef.current = frameIndex;
      onFrameChangeRef.current?.(frameIndex, totalFramesRef.current);
      prefetchAhead(jobId, frameIndex, totalFramesRef.current);
    };

    const stopPlayback = () => {
      isPlayingRef.current = false;
      if (playTimerRef.current) { clearTimeout(playTimerRef.current); playTimerRef.current = null; }
    };

    const startPlayback = (jobId: string, fps = 8) => {
      stopPlayback();
      isPlayingRef.current = true;
      const interval = 1000 / fps;
      const tick = async () => {
        if (!isPlayingRef.current) return;
        const next = (currentFrameRef.current + 1) % totalFramesRef.current;
        await showFrame(jobId, next);
        if (isPlayingRef.current) {
          playTimerRef.current = setTimeout(tick, interval);
        }
      };
      playTimerRef.current = setTimeout(tick, interval);
    };

    useImperativeHandle(ref, () => ({
      setRepresentation: async (type) => {
        const plugin = pluginRef.current;
        if (!plugin) return;
        try {
          const structs = plugin.managers.structure.hierarchy.current.structures;
          if (!structs?.length) return;
          const presetMap: Record<string, string> = {
            cartoon: "polymer-and-ligand",
            "ball-and-stick": "atomic-detail",
            surface: "molecular-surface",
          };
          const { PresetStructureRepresentations } = await import(
            "molstar/lib/mol-plugin-state/builder/structure/representation-preset"
          );
          const preset = PresetStructureRepresentations[
            presetMap[type] as keyof typeof PresetStructureRepresentations
          ];
          if (preset) {
            await plugin.managers.structure.component.applyPreset(structs, preset);
          }
        } catch (err) {
          console.warn("setRepresentation failed:", err);
        }
      },
      resetZoom: () => {
        pluginRef.current?.canvas3d?.requestCameraReset();
      },
      setFrame: async (frame: number) => {
        const jobId = modalJobIdRef.current;
        if (!jobId || totalFramesRef.current === 0) return;
        stopPlayback();
        await showFrame(jobId, Math.max(0, Math.min(frame, totalFramesRef.current - 1)));
      },
      play: () => {
        const jobId = modalJobIdRef.current;
        if (!jobId || totalFramesRef.current < 2) return;
        startPlayback(jobId);
      },
      pause: () => {
        stopPlayback();
      },
      setIsRotating: (isRotating: boolean) => {
        const plugin = pluginRef.current;
        if (!plugin || !plugin.canvas3d) return;
        plugin.canvas3d.setProps({
          trackball: {
            ...plugin.canvas3d.props.trackball,
            animate: isRotating ? { name: "spin" as const, params: { speed: 0.1 } } : { name: "off" as const, params: {} }
          }
        });
      },
      setColor: async (type) => {
        const plugin = pluginRef.current;
        if (!plugin) return;
        const structs = plugin.managers.structure.hierarchy.current.structures;
        if (!structs?.length) return;

        const themeMap: Record<string, string> = {
          chain: "chain-id",
          element: "element-symbol",
          rainbow: "sequence-id",
        };

        await plugin.managers.structure.component.applyTheme({
          color: { name: themeMap[type] },
          structures: structs,
        } as any);
      },
    }));

    const modalJobIdRef = useRef(modalJobId);
    modalJobIdRef.current = modalJobId;
    const structureUrlRef = useRef(structureUrl);
    structureUrlRef.current = structureUrl;
    const livePdbBase64Ref = useRef(livePdbBase64);
    livePdbBase64Ref.current = livePdbBase64;
    const pdbIdRef = useRef(pdbId);
    pdbIdRef.current = pdbId;

    // Initialize Molstar plugin once
    useEffect(() => {
      if (initDoneRef.current || !containerRef.current) return;
      initDoneRef.current = true;
      let mounted = true;

      initPlugin(containerRef.current).then(async (plugin) => {
        if (!mounted) { plugin.dispose(); return; }
        pluginRef.current = plugin;

        const jobId = modalJobIdRef.current;
        const sUrl = structureUrlRef.current;
        const b64 = livePdbBase64Ref.current;
        const pId = pdbIdRef.current;

        if (jobId) {
          await initTrajectoryFromApi(jobId, mounted);
        } else if (pId) {
          loadedKeyRef.current = `pdb:${pId}`;
          await loadPdbFromUrl(plugin, `https://files.rcsb.org/download/${pId.toUpperCase()}.pdb`).catch(console.warn);
          onFrameChangeRef.current?.(0, 1);
          // Re-apply rotation after load
          if (shouldRotateRef.current && plugin.canvas3d) {
            plugin.canvas3d.setProps({
              trackball: { ...plugin.canvas3d.props.trackball, animate: { name: "spin" as const, params: { speed: 0.1 } } }
            });
          }
        } else if (sUrl) {
          loadedKeyRef.current = sUrl;
          await loadPdbFromUrl(plugin, sUrl).catch(console.warn);
          onFrameChangeRef.current?.(0, 1);
        } else if (b64) {
          const pdb = atob(b64);
          dataNodeRef.current = await loadPdbString(plugin, new TextDecoder().decode(
            new Uint8Array([...pdb].map(c => c.charCodeAt(0)))
          )).catch(() => null);
        }
      }).catch(console.error);

      return () => {
        mounted = false;
        stopPlayback();
        pluginRef.current?.dispose();
        pluginRef.current = null;
        initDoneRef.current = false;
      };
    }, []);

    const initTrajectoryFromApi = async (jobId: string, mounted: boolean) => {
      const plugin = pluginRef.current;
      if (!plugin || !mounted) return;
      loadedKeyRef.current = `job:${jobId}`;
      dataNodeRef.current = null;
      currentFrameRef.current = 0;

      try {
        // 1. Fetch frame 0 immediately → display without waiting for count
        const frame0 = await getFramePdb(jobId, 0);
        if (!mounted) return;
        dataNodeRef.current = await loadPdbString(plugin, frame0);

        // 2. Get total frame count
        const total = await fetchFrameCount(jobId);
        if (!mounted || total < 1) return;
        totalFramesRef.current = total;
        onFrameChangeRef.current?.(0, total);

        // 3. Pre-fetch next 5 frames
        prefetchAhead(jobId, 0, total, 5);

        // 4. Auto-play
        if (mounted && total > 1) {
          startPlayback(jobId, 8);
        }

        // Re-apply rotation after trajectory load
        if (shouldRotateRef.current && plugin.canvas3d) {
          plugin.canvas3d.setProps({
            trackball: { ...plugin.canvas3d.props.trackball, animate: { name: "spin" as const, params: { speed: 0.1 } } }
          });
        }
      } catch (err) {
        console.warn("Trajectory frame API failed:", err);
        // Fallback to static PDB URL
        const sUrl = structureUrlRef.current;
        if (sUrl) await loadPdbFromUrl(plugin, sUrl).catch(console.warn);
      }
    };

    // React to modalJobId changing (i.e. completion arrives after mount)
    useEffect(() => {
      const plugin = pluginRef.current;
      if (!modalJobId || !plugin) return;
      const key = `job:${modalJobId}`;
      if (loadedKeyRef.current === key) return;
      stopPlayback();
      totalFramesRef.current = 0;
      currentFrameRef.current = 0;
      dataNodeRef.current = null;
      initTrajectoryFromApi(modalJobId, true);
    }, [modalJobId]);

    // React to static structureUrl changes (no job ID — fallback)
    useEffect(() => {
      const plugin = pluginRef.current;
      if (!structureUrl || modalJobId || !plugin) return;
      if (loadedKeyRef.current === structureUrl) return;
      loadedKeyRef.current = structureUrl;
      dataNodeRef.current = null;
      loadPdbFromUrl(plugin, structureUrl)
        .then(() => onFrameChangeRef.current?.(0, 1))
        .catch(console.warn);
    }, [structureUrl, modalJobId]);

    // Update live base64 snapshot (running simulation)
    useEffect(() => {
      const plugin = pluginRef.current;
      if (!livePdbBase64 || !plugin) return;
      const key = `b64:${livePdbBase64.slice(0, 40)}`;
      if (loadedKeyRef.current === key) return;
      loadedKeyRef.current = key;
      const binary = atob(livePdbBase64);
      const pdbStr = new TextDecoder().decode(new Uint8Array([...binary].map(c => c.charCodeAt(0))));
      loadPdbString(plugin, pdbStr, dataNodeRef.current)
        .then(node => {
          dataNodeRef.current = node;
          if (shouldRotateRef.current && plugin.canvas3d) {
            plugin.canvas3d.setProps({
              trackball: { ...plugin.canvas3d.props.trackball, animate: { name: "spin" as const, params: { speed: 0.1 } } }
            });
          }
        })
        .catch(console.warn);
    }, [livePdbBase64]);

    // React to pdbId changes
    useEffect(() => {
      const plugin = pluginRef.current;
      if (!pdbId || modalJobId || !plugin) return;
      const key = `pdb:${pdbId}`;
      if (loadedKeyRef.current === key) return;
      loadedKeyRef.current = key;
      dataNodeRef.current = null;
      loadPdbFromUrl(plugin, `https://files.rcsb.org/download/${pdbId.toUpperCase()}.pdb`)
        .then(() => onFrameChangeRef.current?.(0, 1))
        .catch(console.warn);
    }, [pdbId, modalJobId]);

    // Handle shouldRotate prop
    useEffect(() => {
      shouldRotateRef.current = shouldRotate;
      const plugin = pluginRef.current;
      if (!plugin || !plugin.canvas3d) return;
      plugin.canvas3d.setProps({
        trackball: {
          ...plugin.canvas3d.props.trackball,
          animate: shouldRotate ? { name: "spin" as const, params: { speed: 0.1 } } : { name: "off" as const, params: {} }
        }
      });
    }, [shouldRotate]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: "relative", width: "100%", height: "100%" }}
      />
    );
  }
);

MolstarViewer.displayName = "MolstarViewer";
export default MolstarViewer;
