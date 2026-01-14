"use client";
import type { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface MolstarViewerProps {
	pdbId: string;
	className?: string;
}

export interface MolstarViewerRef {
	setRepresentation: (type: "cartoon" | "ball-and-stick" | "surface") => void;
	setColor: (color: "chain" | "element" | "rainbow") => void;
	resetZoom: () => void;
}

const MolstarViewer = forwardRef<MolstarViewerRef, MolstarViewerProps>(
	({ pdbId, className }, ref) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const pluginRef = useRef<PluginUIContext | null>(null);

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
					const presetName = presetMap[type] || "polymer-and-ligand";

					const { PresetStructureRepresentations } = await import(
						"molstar/lib/mol-plugin-state/builder/structure/representation-preset"
					);
					const preset =
						PresetStructureRepresentations[
							presetName as keyof typeof PresetStructureRepresentations
						];

					if (preset && structureRefs.length > 0) {
						await plugin.managers.structure.component.applyPreset(
							structureRefs,
							preset,
						);
					}
				} catch (err) {
					console.warn("Could not change representation:", err);
				}
			},
			setColor: async (colorScheme) => {
				const plugin = pluginRef.current;
				if (!plugin) return;
				try {
					const colorMap: Record<string, string> = {
						chain: "chain-id",
						element: "element-symbol",
						rainbow: "sequence-id",
					};
					const colorName = colorMap[colorScheme] || "chain-id";

					const structures =
						plugin.managers.structure.hierarchy.current.structures;
					if (structures.length === 0) return;

					for (const structure of structures) {
						for (const component of structure.components) {
							await plugin.managers.structure.component.updateRepresentationsTheme(
								[component],
								{
									color: colorName as never,
								},
							);
						}
					}
				} catch (err) {
					console.warn("Could not change color:", err);
				}
			},
			resetZoom: () => {
				const plugin = pluginRef.current;
				if (!plugin) return;
				plugin.canvas3d?.requestCameraReset();
			},
		}));

		useEffect(() => {
			let mounted = true;

			const initViewer = async () => {
				if (!containerRef.current || pluginRef.current) return;

				const { createPluginUI } = await import("molstar/lib/mol-plugin-ui");
				const { renderReact18 } = await import(
					"molstar/lib/mol-plugin-ui/react18"
				);
				const { DefaultPluginUISpec } = await import(
					"molstar/lib/mol-plugin-ui/spec"
				);
				const { PluginConfig } = await import("molstar/lib/mol-plugin/config");

				if (!mounted || !containerRef.current) return;

				const plugin = await createPluginUI({
					target: containerRef.current,
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
						components: {
							remoteState: "none",
						},
					},
					render: renderReact18,
				});

				if (!mounted) {
					plugin.dispose();
					return;
				}

				pluginRef.current = plugin;

				plugin.layout.setProps({
					showControls: false,
					regionState: {
						left: "hidden",
						right: "hidden",
						top: "hidden",
						bottom: "hidden",
					},
				});

				const url = `https://files.rcsb.org/download/${pdbId}.cif`;
				const data = await plugin.builders.data.download(
					{ url, isBinary: false },
					{ state: { isGhost: true } },
				);

				const trajectory = await plugin.builders.structure.parseTrajectory(
					data,
					"mmcif",
				);
				await plugin.builders.structure.hierarchy.applyPreset(
					trajectory,
					"default",
				);

				plugin.canvas3d?.setProps({
					trackball: {
						animate: {
							name: "spin",
							params: { speed: 0.1 },
						},
					},
				});
			};

			initViewer();

			return () => {
				mounted = false;
				if (pluginRef.current) {
					pluginRef.current.dispose();
					pluginRef.current = null;
				}
			};
		}, [pdbId]);

		return (
			<div
				ref={containerRef}
				className={className}
				style={{ position: "relative", width: "100%", height: "100%" }}
			/>
		);
	},
);

MolstarViewer.displayName = "MolstarViewer";

export default MolstarViewer;
