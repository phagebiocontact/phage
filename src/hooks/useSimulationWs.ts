import { useEffect, useRef, useState } from "react";
import {
	decodeMdPacket,
	framePayloadToFloat32,
	MdStreamPacketKind,
} from "@/lib/md-stream";
import { type CachedFrame, TrajectoryCache } from "@/lib/trajectory-cache";

export function downsample<T>(
	data: T[] | undefined,
	maxPoints: number = 200,
): T[] {
	if (!data || data.length <= maxPoints) return data ?? [];
	const step = Math.ceil(data.length / maxPoints);
	return data.filter((_, i) => i % step === 0);
}

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
	error?: string;
	paused?: boolean;
	cancelled?: boolean;
	stream_ready?: boolean;
}

export interface StreamAnalysisData {
	rmsd: Array<{ frame: number; time: number; value: number }>;
	ligandRmsd: Array<{ frame: number; time: number; value: number }>;
	rg: Array<{ frame: number; time: number; value: number }>;
	energy: Array<{
		frame: number;
		time: number;
		potential: number;
		kinetic: number;
		total: number;
	}>;
	ss: Array<{
		frame: number;
		time: number;
		helix: number;
		sheet: number;
		coil: number;
	}>;
	rmsf: Array<{ residue: number; value: number }>;
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
	topologyPdb: string | null;
	atomCount: number;
	slotCount: number;
	loadedFrames: number;
	usesRingBuffer: boolean;
	analysisData: StreamAnalysisData;
	getFrame: (slotIndex: number) => CachedFrame | null;
}

const EMPTY_ANALYSIS: StreamAnalysisData = {
	rmsd: [],
	ligandRmsd: [],
	rg: [],
	energy: [],
	ss: [],
	rmsf: [],
};

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
	const [topologyPdb, setTopologyPdb] = useState<string | null>(null);
	const [atomCount, setAtomCount] = useState(0);
	const [slotCount, setSlotCount] = useState(0);
	const [loadedFrames, setLoadedFrames] = useState(0);
	const [usesRingBuffer, setUsesRingBuffer] = useState(false);
	const [analysisData, setAnalysisData] =
		useState<StreamAnalysisData>(EMPTY_ANALYSIS);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const cacheRef = useRef(new TrajectoryCache());
	const slotCountRef = useRef(0);
	const atomCountRef = useRef(0);
	const analysisDataRef = useRef<StreamAnalysisData>({
		rmsd: [],
		ligandRmsd: [],
		rg: [],
		energy: [],
		ss: [],
		rmsf: [],
	});

	useEffect(() => {
		const interval = setInterval(() => {
			setLoadedFrames(cacheRef.current.loadedCount);
			setAnalysisData(() => {
				const ad = analysisDataRef.current;
				if (!ad) return EMPTY_ANALYSIS;
				return {
					rmsd: ad.rmsd.filter(Boolean),
					ligandRmsd: ad.ligandRmsd.filter(Boolean),
					rg: ad.rg.filter(Boolean),
					energy: ad.energy.filter(Boolean),
					ss: ad.ss.filter(Boolean),
					rmsf: ad.rmsf,
				};
			});
		}, 250);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		if (!modalJobId || !enabled) return;

		setWsStatus(null);
		setLiveLogs([]);
		setTopologyPdb(null);
		setAtomCount(0);
		setSlotCount(0);
		slotCountRef.current = 0;
		atomCountRef.current = 0;
		setLoadedFrames(0);
		setUsesRingBuffer(false);
		setAnalysisData(EMPTY_ANALYSIS);
		cacheRef.current = new TrajectoryCache();
		analysisDataRef.current = {
			rmsd: [],
			ligandRmsd: [],
			rg: [],
			energy: [],
			ss: [],
			rmsf: [],
		};

		function openStreamWs() {
			const ws = new WebSocket(
				`${toWsUrl(MODAL_API_URL)}/ws/jobs/${modalJobId}/stream`,
			);
			ws.binaryType = "arraybuffer";
			wsRef.current = ws;

			ws.onopen = () => setWsConnected(true);

			ws.onmessage = async (event) => {
				if (!(event.data instanceof ArrayBuffer)) {
					return;
				}
				try {
					const packet = await decodeMdPacket(event.data);
					if (packet.kind === MdStreamPacketKind.Status) {
						const nextStatus = packet.header as WsStatus;
						nextStatus.status = normalizeWsStatus(nextStatus.status);
						setWsStatus(nextStatus);
						return;
					}

					if (packet.kind === MdStreamPacketKind.Logs) {
						const chunk = new TextDecoder().decode(packet.payload);
						if (!chunk) return;
						setLiveLogs((prev) => {
							const merged = [...prev, ...chunk.split("\n").filter(Boolean)];
							return merged.length > 5000 ? merged.slice(-5000) : merged;
						});
						return;
					}

					if (packet.kind === MdStreamPacketKind.Init) {
						const header = packet.header as {
							atomCount: number;
							slotCount: number;
							ringBufferSuggested?: boolean;
						};
						if (cacheRef.current.loadedCount > 0 && atomCountRef.current === header.atomCount) {
							// System already initialized from a previous connection drop, don't wipe memory.
							return;
						}
						atomCountRef.current = header.atomCount;
						slotCountRef.current = header.slotCount;
						cacheRef.current.initialize(header.atomCount, header.slotCount);
						analysisDataRef.current = {
							rmsd: new Array(header.slotCount),
							ligandRmsd: new Array(header.slotCount),
							rg: new Array(header.slotCount),
							energy: new Array(header.slotCount),
							ss: new Array(header.slotCount),
							rmsf: [],
						};
						setTopologyPdb(new TextDecoder().decode(packet.payload));
						setAtomCount(header.atomCount);
						setSlotCount(header.slotCount);
						setUsesRingBuffer(
							cacheRef.current.usesRingBuffer || !!header.ringBufferSuggested,
						);
						return;
					}

					if (packet.kind === MdStreamPacketKind.Frame) {
						const header = packet.header as {
							slotIndex: number;
							sourceFrame: number;
							timeNs: number;
							progress: number;
							scalars: Record<string, number>;
							sections: {
								coords: [number, number];
								rmsf: [number, number];
								dssp: [number, number];
							};
						};
						const floats = framePayloadToFloat32(packet.payload);
						const coords = floats.slice(...header.sections.coords);
						const rmsf = floats.slice(...header.sections.rmsf);
						const dssp = floats.slice(...header.sections.dssp);
						cacheRef.current.store({
							slotIndex: header.slotIndex,
							sourceFrame: header.sourceFrame,
							timeNs: header.timeNs,
							progress: header.progress,
							coords,
							rmsf,
							dssp,
							scalars: header.scalars,
						});
						const ad = analysisDataRef.current;
						ad.rmsd[header.slotIndex] = {
							frame: header.slotIndex,
							time: header.timeNs,
							value: header.scalars.backbone_rmsd ?? 0,
						};
						ad.ligandRmsd[header.slotIndex] = {
							frame: header.slotIndex,
							time: header.timeNs,
							value: header.scalars.ligand_rmsd ?? 0,
						};
						ad.rg[header.slotIndex] = {
							frame: header.slotIndex,
							time: header.timeNs,
							value: header.scalars.radius_of_gyration ?? 0,
						};
						ad.energy[header.slotIndex] = {
							frame: header.slotIndex,
							time: header.timeNs,
							potential: header.scalars.potential_energy ?? 0,
							kinetic: header.scalars.kinetic_energy ?? 0,
							total: header.scalars.total_energy ?? 0,
						};
						ad.ss[header.slotIndex] = {
							frame: header.slotIndex,
							time: header.timeNs,
							helix: header.scalars.helix ?? 0,
							sheet: header.scalars.sheet ?? 0,
							coil: header.scalars.coil ?? 0,
						};
						if (rmsf.length > 0 && ad.rmsf.length === 0) {
							ad.rmsf = Array.from(rmsf, (value, residue) => ({
								residue,
								value,
							}));
						}
						return;
					}

					if (packet.kind === MdStreamPacketKind.Error) {
						const message = new TextDecoder().decode(packet.payload);
						setWsStatus((prev) => ({
							...prev,
							status: "failed",
							error: message,
						}));
						return;
					}
				} catch {
					// Ignore malformed packets and keep the stream alive.
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
			const state = wsRef.current?.readyState;
			const isDone = slotCountRef.current > 0 && cacheRef.current.loadedCount >= slotCountRef.current;
			if (!isDone && (state === undefined || state === WebSocket.CLOSED)) {
				openStreamWs();
			}
		}, 4000);

		return () => {
			if (reconnectRef.current) clearInterval(reconnectRef.current);
			wsRef.current?.close();
			wsRef.current = null;
			setWsConnected(false);
		};
	}, [modalJobId, enabled]);

	return {
		wsStatus,
		liveLogs,
		liveLogsText: liveLogs.join("\n"),
		wsConnected,
		topologyPdb,
		atomCount,
		slotCount,
		loadedFrames,
		usesRingBuffer,
		analysisData,
		getFrame: (slotIndex: number) => cacheRef.current.get(slotIndex),
	};
}
