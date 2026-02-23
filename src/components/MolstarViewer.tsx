"use client";
import type { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface MolstarViewerProps {
  structureUrl?: string;        // Completed: URL to PDB file
  trajectoryUrl?: string;       // Completed: URL to XTC (reserved for future use)
  livePdbBase64?: string;       // Live: base64-encoded PDB snapshot
  className?: string;
  onFrameChange?: (frame: number, total: number) => void;
}

export interface MolstarViewerRef {
  setRepresentation: (type: "cartoon" | "ball-and-stick" | "surface") => void;
  resetZoom: () => void;
  setFrame: (frame: number) => void;
  play: () => void;
  pause: () => void;
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

async function loadPdbFromUrl(plugin: PluginUIContext, url: string) {
  await plugin.clear();
  const data = await plugin.builders.data.download(
    { url, isBinary: false },
    { state: { isGhost: true } }
  );
  const trajectory = await plugin.builders.structure.parseTrajectory(data, "pdb");
  await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");
  // After hierarchy load, apply polymer-and-ligand preset to show ligands as ball-and-stick
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

async function loadPdbFromBase64Smooth(plugin: PluginUIContext, b64: string, dataNodeRef: unknown) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pdbString = new TextDecoder().decode(bytes);

  if (dataNodeRef) {
    await plugin.build().to(dataNodeRef).update({ data: pdbString }).commit();
    return dataNodeRef;
  } else {
    await plugin.clear();
    const dataNode = await plugin.builders.data.rawData({ data: pdbString });
    const trajectory = await plugin.builders.structure.parseTrajectory(dataNode, "pdb");
    await plugin.builders.structure.hierarchy.applyPreset(trajectory, "default");
    
    // Apply polymer-and-ligand preset
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
}

const MolstarViewer = forwardRef<MolstarViewerRef, MolstarViewerProps>(
  ({ structureUrl, livePdbBase64, className, onFrameChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pluginRef = useRef<PluginUIContext | null>(null);
    const initDoneRef = useRef(false);
    const loadedUrlRef = useRef<string | null>(null);
    const loadedB64Ref = useRef<string | null>(null);
    const liveDataNodeRef = useRef<unknown>(null);

    useImperativeHandle(ref, () => ({
      setRepresentation: async (type) => {
        const plugin = pluginRef.current;
        if (!plugin) return;
        try {
          const hierarchy = plugin.managers.structure.hierarchy.current;
          const structureRefs = hierarchy.structures;
          if (!structureRefs || structureRefs.length === 0) return;
          const presetMap: Record<string, string> = {
            cartoon: "polymer-and-ligand",
            "ball-and-stick": "atomic-detail",
            surface: "molecular-surface",
          };
          const { PresetStructureRepresentations } = await import(
            "molstar/lib/mol-plugin-state/builder/structure/representation-preset"
          );
          const preset =
            PresetStructureRepresentations[
              presetMap[type] as keyof typeof PresetStructureRepresentations
            ];
          if (preset && structureRefs.length > 0) {
            await plugin.managers.structure.component.applyPreset(structureRefs, preset);
          }
        } catch (err) {
          console.warn("Could not change representation:", err);
        }
      },
      resetZoom: () => {
        pluginRef.current?.canvas3d?.requestCameraReset();
      },
      setFrame: () => { /* stub — XTC animation future */ },
      play: () => { /* stub */ },
      pause: () => { /* stub */ },
    }));

    // Store latest props in refs so init effect closure stays dep-free
    const structureUrlRef = useRef(structureUrl);
    structureUrlRef.current = structureUrl;
    const livePdbBase64Ref = useRef(livePdbBase64);
    livePdbBase64Ref.current = livePdbBase64;

    // Initialize plugin once on mount
    useEffect(() => {
      if (initDoneRef.current || !containerRef.current) return;
      initDoneRef.current = true;
      let mounted = true;

      initPlugin(containerRef.current).then((plugin) => {
        if (!mounted) { plugin.dispose(); return; }
        pluginRef.current = plugin;

        // Load whatever url/base64 is available at init time
        const url = structureUrlRef.current;
        const b64 = livePdbBase64Ref.current;
        if (url && loadedUrlRef.current !== url) {
          loadedUrlRef.current = url;
          loadPdbFromUrl(plugin, url).catch(console.warn);
        } else if (b64 && loadedB64Ref.current !== b64) {
          loadedB64Ref.current = b64;
          loadPdbFromBase64Smooth(plugin, b64, null)
            .then(node => { liveDataNodeRef.current = node; })
            .catch(console.warn);
        }
      }).catch(console.error);

      return () => {
        mounted = false;
        if (pluginRef.current) {
          pluginRef.current.dispose();
          pluginRef.current = null;
        }
        initDoneRef.current = false;
      };
    }, []);

    // Load static PDB from URL when it changes
    useEffect(() => {
      if (!structureUrl || loadedUrlRef.current === structureUrl) return;
      const plugin = pluginRef.current;
      if (!plugin) return;
      loadedUrlRef.current = structureUrl;
      loadedB64Ref.current = null;
      liveDataNodeRef.current = null;
      loadPdbFromUrl(plugin, structureUrl)
        .then(() => onFrameChange?.(0, 1))
        .catch(console.warn);
    }, [structureUrl, onFrameChange]);

    // Update live structure when new base64 arrives
    useEffect(() => {
      if (!livePdbBase64 || loadedB64Ref.current === livePdbBase64) return;
      const plugin = pluginRef.current;
      if (!plugin) return;
      loadedB64Ref.current = livePdbBase64;
      loadPdbFromBase64Smooth(plugin, livePdbBase64, liveDataNodeRef.current)
        .then(node => { liveDataNodeRef.current = node; })
        .catch(console.warn);
    }, [livePdbBase64]);

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
