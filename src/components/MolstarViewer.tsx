"use client";

import type { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

interface MolstarViewerProps {
	topologyPdb?: string | null;
	pdbId?: string | null;
	coordinates?: Float32Array | null;
	atomCount?: number;
	className?: string;
	shouldRotate?: boolean;
}

export interface MolstarViewerRef {
	setRepresentation: (type: "cartoon" | "ball-and-stick" | "surface") => void;
	resetZoom: () => void;
	setIsRotating: (isRotating: boolean) => void;
	setColor: (type: "chain" | "element" | "rainbow") => void;
	focusLigand: () => void;
	setWaterVisibility: (visible: boolean) => void;
}

async function initPlugin(container: HTMLDivElement): Promise<PluginUIContext> {
	const { createPluginUI } = await import("molstar/lib/mol-plugin-ui");
	const { renderReact18 } = await import("molstar/lib/mol-plugin-ui/react18");
	const { DefaultPluginUISpec } = await import(
		"molstar/lib/mol-plugin-ui/spec"
	);
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
		regionState: {
			left: "hidden",
			right: "hidden",
			top: "hidden",
			bottom: "hidden",
		},
	});

	return plugin;
}

type PluginLease = {
	refCount: number;
	promise: Promise<PluginUIContext>;
	disposeTimer: ReturnType<typeof setTimeout> | null;
};

const pluginLeases = new WeakMap<HTMLDivElement, PluginLease>();

function acquirePlugin(container: HTMLDivElement): Promise<PluginUIContext> {
	const existing = pluginLeases.get(container);
	if (existing) {
		existing.refCount += 1;
		if (existing.disposeTimer) {
			clearTimeout(existing.disposeTimer);
			existing.disposeTimer = null;
		}
		return existing.promise;
	}

	const lease: PluginLease = {
		refCount: 1,
		promise: initPlugin(container),
		disposeTimer: null,
	};
	pluginLeases.set(container, lease);
	return lease.promise;
}

function releasePlugin(container: HTMLDivElement) {
	const lease = pluginLeases.get(container);
	if (!lease) return;
	lease.refCount -= 1;
	if (lease.refCount > 0) return;
	lease.disposeTimer = setTimeout(() => {
		const latest = pluginLeases.get(container);
		if (!latest || latest.refCount > 0) return;
		latest.promise
			.then((plugin) => plugin.dispose())
			.catch(() => undefined)
			.finally(() => {
				if (pluginLeases.get(container) === latest) {
					pluginLeases.delete(container);
				}
			});
	}, 0);
}

const countAtomsFromPdb = (pdb: string) => {
	let count = 0;
	const lines = pdb.split(/\r?\n/);
	for (const line of lines) {
		if (line.startsWith("ATOM") || line.startsWith("HETATM")) {
			count += 1;
		}
	}
	return count;
};

const MolstarViewer = forwardRef<MolstarViewerRef, MolstarViewerProps>(
	(
		{
			topologyPdb,
			pdbId,
			coordinates,
			atomCount,
			className,
			shouldRotate = false,
		},
		ref,
	) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const pluginRef = useRef<PluginUIContext | null>(null);
		const initDoneRef = useRef(false);
		const coordinateModelRef = useRef<any>(null);
		const animationRef = useRef<number | null>(null);
		const currentCoordsRef = useRef<Float32Array | null>(null);
		const updateChainRef = useRef(Promise.resolve());
		const animationTokenRef = useRef(0);
		const [fetchedTopologyPdb, setFetchedTopologyPdb] = useState<string | null>(null);
		const [fetchedAtomCount, setFetchedAtomCount] = useState<number | null>(null);
		const [pluginReadyTick, setPluginReadyTick] = useState(0);

		const resolvedTopologyPdb = topologyPdb ?? fetchedTopologyPdb;
		const resolvedAtomCount = atomCount ?? fetchedAtomCount ?? undefined;

		const applyRotation = (isRotating: boolean) => {
			const plugin = pluginRef.current;
			if (!plugin?.canvas3d) return;
			const trackball = plugin.canvas3d.props.trackball;
			plugin.canvas3d.setProps({
				trackball: {
					...trackball,
					animate: isRotating
						? {
								name: "spin" as const,
								params: {
									speed: 0.1,
									axis: [0, -1, 0] as [number, number, number],
								},
							}
						: { name: "off" as const, params: {} },
				},
			});
		};

		const createFrame = (coords: Float32Array) => {
			const count = resolvedAtomCount ?? 0;
			const x = new Float32Array(count);
			const y = new Float32Array(count);
			const z = new Float32Array(count);
			for (let i = 0; i < count; i++) {
				const offset = i * 3;
				x[i] = coords[offset];
				y[i] = coords[offset + 1];
				z[i] = coords[offset + 2];
			}
			return {
				elementCount: count,
				time: { value: 0, unit: "ps" as const },
				x,
				y,
				z,
				xyzOrdering: { isIdentity: true },
			};
		};

		const updateCoordinates = async (coords: Float32Array) => {
			const plugin = pluginRef.current;
			const coordinateModel = coordinateModelRef.current;
			if (!plugin || !coordinateModel || !resolvedAtomCount) return;
			const frame = createFrame(coords);
			updateChainRef.current = updateChainRef.current
				.catch(() => undefined)
				.then(() =>
					plugin
						.build()
						.to(coordinateModel)
						.update({
							frameIndex: 0,
							frameCount: 1,
							atomicCoordinateFrame: frame,
						})
						.commit(),
				);
			await updateChainRef.current;
		};

		const animateToCoordinates = (target: Float32Array) => {
			animationTokenRef.current += 1;
			const animationToken = animationTokenRef.current;
			if (
				!currentCoordsRef.current ||
				currentCoordsRef.current.length !== target.length
			) {
				currentCoordsRef.current = target.slice();
				void updateCoordinates(target);
				return;
			}
			let maxDelta = 0;
			for (let i = 0; i < target.length; i += 3) {
				const dx = target[i] - currentCoordsRef.current[i];
				const dy = target[i + 1] - currentCoordsRef.current[i + 1];
				const dz = target[i + 2] - currentCoordsRef.current[i + 2];
				const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
				if (distance > maxDelta) maxDelta = distance;
			}
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
			if (maxDelta > 8) {
				currentCoordsRef.current = target.slice();
				void updateCoordinates(target);
				return;
			}
			const start = currentCoordsRef.current.slice();
			const startedAt = performance.now();
			const duration = 180;
			const tick = (now: number) => {
				if (animationToken !== animationTokenRef.current) {
					return;
				}
				const t = Math.min(1, (now - startedAt) / duration);
				const eased = 1 - (1 - t) * (1 - t);
				const blended = new Float32Array(target.length);
				for (let i = 0; i < target.length; i++) {
					blended[i] = start[i] + (target[i] - start[i]) * eased;
				}
				currentCoordsRef.current = blended;
				void updateCoordinates(blended);
				if (t < 1) {
					animationRef.current = requestAnimationFrame(tick);
				}
			};
			animationRef.current = requestAnimationFrame(tick);
		};

		useImperativeHandle(ref, () => ({
			setRepresentation: async (type) => {
				const plugin = pluginRef.current;
				if (!plugin) return;
				const structs = plugin.managers.structure.hierarchy.current.structures;
				if (!structs?.length) return;

				const targetComponents = structs.flatMap(s => s.components).filter(c => {
					const label = c.cell.obj?.label;
					return label === "Polymer" || label === "Ligand";
				});
				if (!targetComponents.length) return;

				const b = plugin.build();
				for (const c of targetComponents) {
					for (const r of c.representations) {
						b.to(r.cell).update((old: any) => ({
							...old,
							type: {
								...old.type,
								name: type === "cartoon" 
									? (c.cell.obj?.label === "Ligand" ? "ball-and-stick" : "cartoon") 
									: type === "surface" ? "molecular-surface" 
									: "ball-and-stick"
							}
						}));
					}
				}
				await b.commit();
			},
			resetZoom: () => {
				pluginRef.current?.canvas3d?.requestCameraReset();
			},
			setIsRotating: (isRotating: boolean) => {
				applyRotation(isRotating);
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
				const targetComponents = structs.flatMap(s => s.components).filter(c => {
					const label = c.cell.obj?.label;
					return label === "Polymer" || label === "Ligand";
				});
				if (!targetComponents.length) return;
				
				const b = plugin.build();
				for (const c of targetComponents) {
					for (const r of c.representations) {
						b.to(r.cell).update((old: any) => ({
							...old,
							colorTheme: { ...old.colorTheme, name: themeMap[type] }
						}));
					}
				}
				await b.commit();
			},
			focusLigand: async () => {
				const plugin = pluginRef.current;
				if (!plugin) return;
				const structs = plugin.managers.structure.hierarchy.current.structures;
				if (!structs?.length) return;
				
				const ligandComp = structs.flatMap(s => s.components).find(c => c.cell.obj?.label === "Ligand");
				if (ligandComp && ligandComp.cell.obj?.data) {
					const { Structure } = await import("molstar/lib/mol-model/structure");
					const loci = Structure.toStructureElementLoci(ligandComp.cell.obj.data);
					plugin.managers.camera.focusLoci(loci, { extraRadius: 4 });
				}
			},
			setWaterVisibility: (visible: boolean) => {
				const plugin = pluginRef.current;
				if (!plugin) return;
				const structs = plugin.managers.structure.hierarchy.current.structures;
				if (!structs?.length) return;
				
				const waterComps = structs.flatMap(s => s.components).filter(c => c.cell.obj?.label === "Water");
				if (waterComps.length > 0) {
					plugin.managers.structure.hierarchy.toggleVisibility(waterComps, visible ? "show" : "hide");
				}
			},
		}));

		// biome-ignore lint/correctness/useExhaustiveDependencies: the plugin must initialize once per mount.
		useEffect(() => {
			if (initDoneRef.current || !containerRef.current) return;
			initDoneRef.current = true;
			let mounted = true;
			const container = containerRef.current;

			acquirePlugin(container)
				.then((plugin) => {
					if (!mounted) {
						return;
					}
					pluginRef.current = plugin;
					setPluginReadyTick((value) => value + 1);
					applyRotation(shouldRotate);
				})
				.catch(console.error);

			return () => {
				mounted = false;
				if (animationRef.current) cancelAnimationFrame(animationRef.current);
				pluginRef.current = null;
				initDoneRef.current = false;
				releasePlugin(container);
			};
		}, []);

		useEffect(() => {
			if (!pdbId || topologyPdb) return;
			let cancelled = false;
			const controller = new AbortController();
			const loadPdb = async () => {
				try {
					const normalized = pdbId.trim().toUpperCase();
					const response = await fetch(
						`https://files.rcsb.org/download/${normalized}.pdb`,
						{ signal: controller.signal },
					);
					if (!response.ok) {
						throw new Error(`Failed to load PDB ${normalized}`);
					}
					const pdbText = await response.text();
					if (cancelled) return;
					setFetchedTopologyPdb(pdbText);
					setFetchedAtomCount(countAtomsFromPdb(pdbText));
				} catch (error) {
					if (!cancelled) {
						console.error(error);
						setFetchedTopologyPdb(null);
						setFetchedAtomCount(null);
					}
				}
			};
			void loadPdb();
			return () => {
				cancelled = true;
				controller.abort();
			};
		}, [pdbId, topologyPdb]);

		// biome-ignore lint/correctness/useExhaustiveDependencies: topology reset is intentionally driven by topology identity.
		useEffect(() => {
			const plugin = pluginRef.current;
			if (
				!plugin ||
				!resolvedTopologyPdb ||
				!resolvedAtomCount ||
				pluginReadyTick === 0
			)
				return;
			let cancelled = false;

			const loadTopology = async () => {
				const { StateTransforms } = await import(
					"molstar/lib/mol-plugin-state/transforms"
				);
				await plugin.clear();
				const data = await plugin.builders.data.rawData({
					data: resolvedTopologyPdb,
				});
				const trajectory = await plugin.builders.structure.parseTrajectory(
					data,
					"pdb",
				);
				const baseModel =
					await plugin.builders.structure.createModel(trajectory);
				if (cancelled) return;
				const builder = plugin.build();
				const coordinateModel = builder.to(baseModel).apply(
					StateTransforms.Model.ModelWithCoordinates,
					{
						frameIndex: 0,
						frameCount: 1,
						atomicCoordinateFrame: coordinates
							? createFrame(coordinates)
							: undefined,
					},
					{ ref: "stream-model" },
				);
				await builder.commit();
				if (cancelled) return;
				coordinateModelRef.current = coordinateModel.selector;
				const structure =
					await plugin.builders.structure.createStructure(coordinateModel.selector);
				if (cancelled) return;
				await plugin.builders.structure.representation.applyPreset(
					structure,
					"auto",
				);
				if (coordinates) {
					currentCoordsRef.current = coordinates.slice();
				}
				applyRotation(shouldRotate);
			};

			void loadTopology();
			return () => {
				cancelled = true;
			};
		}, [resolvedTopologyPdb, resolvedAtomCount, pluginReadyTick]);

		// biome-ignore lint/correctness/useExhaustiveDependencies: frame interpolation should only react to incoming coordinates.
		useEffect(() => {
			if (!coordinates || !resolvedAtomCount || !coordinateModelRef.current)
				return;
			animateToCoordinates(coordinates);
		}, [coordinates, resolvedAtomCount]);

		// biome-ignore lint/correctness/useExhaustiveDependencies: rotation sync only depends on the latest prop value.
		useEffect(() => {
			applyRotation(shouldRotate);
		}, [shouldRotate]);

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
