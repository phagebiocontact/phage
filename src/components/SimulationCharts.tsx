import { BarChart3, Download } from "lucide-react";
import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RmsdPoint {
	frame: number;
	time: number;
	value: number;
}
export interface LigandRmsdPoint {
	frame: number;
	time: number;
	value: number;
}
export interface RmsfPoint {
	residue: number;
	value: number;
}
export interface RgPoint {
	frame: number;
	time: number;
	value: number;
}
export interface EnergyPoint {
	frame: number;
	time: number;
	potential: number;
	kinetic: number;
	total: number;
}
export interface SsPoint {
	frame: number;
	time?: number;
	helix: number;
	sheet: number;
	coil: number;
}

export interface SimulationAnalysisData {
	rmsd?: RmsdPoint[];
	ligandRmsd?: LigandRmsdPoint[];
	rmsf?: RmsfPoint[];
	rg?: RgPoint[];
	energy?: EnergyPoint[];
	ss?: SsPoint[];
}

interface SimulationChartsProps {
	data: SimulationAnalysisData;
	selectedFrame?: number;
	syncEnabled?: boolean;
	onFrameSelect?: (frame: number) => void;
	onDownloadPng?: (
		metric: "rmsd" | "ligandRmsd" | "rmsf" | "rg" | "ss" | "energy",
	) => void;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({
	active,
	payload,
	label,
	xLabel,
}: {
	active?: boolean;
	payload?: { dataKey: string; color: string; name: string; value: number }[];
	label?: string | number;
	xLabel?: string;
}) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-lg border border-border/60 bg-card/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl">
			<p className="text-muted-foreground mb-1 font-medium">
				{xLabel}: {typeof label === "number" ? label.toFixed(3) : label}
			</p>
			{payload.map((p) => (
				<p
					key={p.dataKey}
					style={{ color: p.color }}
					className="font-semibold font-mono"
				>
					{p.name}: {typeof p.value === "number" ? p.value.toFixed(4) : p.value}
				</p>
			))}
		</div>
	);
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyChart = ({ label }: { label: string }) => (
	<div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/40 py-16">
		<BarChart3 className="h-7 w-7" />
		<p className="text-sm">{label} — no data</p>
	</div>
);

// Shared chart constants
const CHART_MARGIN = { top: 25, right: 20, bottom: 35, left: 0 };
const TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const GRID = {
	stroke: "hsl(var(--border))",
	strokeOpacity: 0.5,
	strokeDasharray: "3 3",
};
const LSTYLE = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const CHART_H = 340;

// ─── Download button helper ───────────────────────────────────────────────────
function DownloadBtn({
	metric,
	onDownloadPng,
}: {
	metric: "rmsd" | "ligandRmsd" | "rmsf" | "rg" | "ss" | "energy";
	onDownloadPng?: (m: typeof metric) => void;
}) {
	if (!onDownloadPng) return null;
	return (
		<Button
			variant="ghost"
			size="sm"
			className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
			onClick={() => onDownloadPng(metric)}
		>
			<Download className="h-3 w-3" /> PNG
		</Button>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SimulationCharts({
	data,
	onDownloadPng,
}: SimulationChartsProps) {
	const ssHasTime = !!data.ss?.[0]?.time;

	return (
		<div className="space-y-4">
			<p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
				Analysis Charts
			</p>

			{/* RMSD */}
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader className="py-3 px-4 border-b border-border/20">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-semibold">
							RMSD — Structural Deviation (Å)
						</CardTitle>
						{data.rmsd?.length && (
							<DownloadBtn metric="rmsd" onDownloadPng={onDownloadPng} />
						)}
					</div>
				</CardHeader>
				<CardContent className="p-4">
					{data.rmsd?.length ? (
						<ResponsiveContainer width="100%" height={CHART_H}>
							<LineChart data={data.rmsd} margin={CHART_MARGIN}>
								<CartesianGrid {...GRID} />
								<XAxis
									dataKey="time"
									tickFormatter={(v) => Number(v).toFixed(2)}
									tick={TICK}
									label={{
										value: "Time (ns)",
										position: "insideBottom",
										offset: -12,
										...LSTYLE,
									}}
								/>
								<YAxis
									tick={TICK}
									width={56}
									label={{
										value: "Å",
										angle: -90,
										position: "insideLeft",
										offset: 12,
										...LSTYLE,
									}}
								/>
								<Tooltip content={<CustomTooltip xLabel="Time (ns)" />} />
								<Legend
									verticalAlign="top"
									align="right"
									iconType="circle"
									wrapperStyle={{ fontSize: 12, paddingBottom: 20 }}
								/>
								<Line
									type="monotone"
									dataKey="value"
									stroke="hsl(var(--primary))"
									strokeWidth={2}
									dot={false}
									name="RMSD (Å)"
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<EmptyChart label="RMSD" />
					)}
				</CardContent>
			</Card>

			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader className="py-3 px-4 border-b border-border/20">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-semibold">
							Ligand RMSD (Å)
						</CardTitle>
						{data.ligandRmsd?.length && (
							<DownloadBtn metric="ligandRmsd" onDownloadPng={onDownloadPng} />
						)}
					</div>
				</CardHeader>
				<CardContent className="p-4">
					{data.ligandRmsd?.length ? (
						<ResponsiveContainer width="100%" height={CHART_H}>
							<LineChart data={data.ligandRmsd} margin={CHART_MARGIN}>
								<CartesianGrid {...GRID} />
								<XAxis
									dataKey="time"
									tickFormatter={(v) => Number(v).toFixed(2)}
									tick={TICK}
									label={{
										value: "Time (ns)",
										position: "insideBottom",
										offset: -12,
										...LSTYLE,
									}}
								/>
								<YAxis
									tick={TICK}
									width={56}
									label={{
										value: "Å",
										angle: -90,
										position: "insideLeft",
										offset: 12,
										...LSTYLE,
									}}
								/>
								<Tooltip content={<CustomTooltip xLabel="Time (ns)" />} />
								<Legend
									verticalAlign="top"
									align="right"
									iconType="circle"
									wrapperStyle={{ fontSize: 12, paddingBottom: 20 }}
								/>
								<Line
									type="monotone"
									dataKey="value"
									stroke="hsl(var(--chart-2))"
									strokeWidth={2}
									dot={false}
									name="Ligand RMSD (Å)"
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<EmptyChart label="Ligand RMSD" />
					)}
				</CardContent>
			</Card>

			{/* Energy */}
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader className="py-3 px-4 border-b border-border/20">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-semibold">
							System Energy (kJ/mol)
						</CardTitle>
						{data.energy?.length && (
							<DownloadBtn metric="energy" onDownloadPng={onDownloadPng} />
						)}
					</div>
				</CardHeader>
				<CardContent className="p-4">
					{data.energy?.length ? (
						<ResponsiveContainer width="100%" height={CHART_H}>
							<LineChart data={data.energy} margin={CHART_MARGIN}>
								<CartesianGrid {...GRID} />
								<XAxis
									dataKey="time"
									tickFormatter={(v) => Number(v).toFixed(2)}
									tick={TICK}
									label={{
										value: "Time (ns)",
										position: "insideBottom",
										offset: -12,
										...LSTYLE,
									}}
								/>
								<YAxis
									tick={TICK}
									width={70}
									label={{
										value: "kJ/mol",
										angle: -90,
										position: "insideLeft",
										offset: 12,
										...LSTYLE,
									}}
								/>
								<Tooltip content={<CustomTooltip xLabel="Time (ns)" />} />
								<Legend
									verticalAlign="top"
									align="right"
									iconType="circle"
									wrapperStyle={{ fontSize: 12, paddingBottom: 20 }}
								/>
								<Line
									type="monotone"
									dataKey="potential"
									stroke="hsl(var(--chart-3))"
									strokeWidth={2}
									dot={false}
									name="Potential"
								/>
								<Line
									type="monotone"
									dataKey="kinetic"
									stroke="hsl(var(--chart-4))"
									strokeWidth={2}
									dot={false}
									name="Kinetic"
								/>
								<Line
									type="monotone"
									dataKey="total"
									stroke="hsl(var(--chart-5))"
									strokeWidth={2}
									dot={false}
									name="Total"
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<EmptyChart label="Energy" />
					)}
				</CardContent>
			</Card>

			{/* Rg */}
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader className="py-3 px-4 border-b border-border/20">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-semibold">
							Radius of Gyration (Å)
						</CardTitle>
						{data.rg?.length && (
							<DownloadBtn metric="rg" onDownloadPng={onDownloadPng} />
						)}
					</div>
				</CardHeader>
				<CardContent className="p-4">
					{data.rg?.length ? (
						<ResponsiveContainer width="100%" height={CHART_H}>
							<LineChart data={data.rg} margin={CHART_MARGIN}>
								<CartesianGrid {...GRID} />
								<XAxis
									dataKey="time"
									tickFormatter={(v) => Number(v).toFixed(2)}
									tick={TICK}
									label={{
										value: "Time (ns)",
										position: "insideBottom",
										offset: -12,
										...LSTYLE,
									}}
								/>
								<YAxis
									tick={TICK}
									width={56}
									label={{
										value: "Å",
										angle: -90,
										position: "insideLeft",
										offset: 12,
										...LSTYLE,
									}}
								/>
								<Tooltip content={<CustomTooltip xLabel="Time (ns)" />} />
								<Legend
									verticalAlign="top"
									align="right"
									iconType="circle"
									wrapperStyle={{ fontSize: 12, paddingBottom: 20 }}
								/>
								<Line
									type="monotone"
									dataKey="value"
									stroke="hsl(var(--secondary))"
									strokeWidth={2}
									dot={false}
									name="Rg (Å)"
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<EmptyChart label="Radius of Gyration" />
					)}
				</CardContent>
			</Card>

			{/* Secondary Structure */}
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader className="py-3 px-4 border-b border-border/20">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-semibold">
							Secondary Structure — Residue Count
						</CardTitle>
						{data.ss?.length && (
							<DownloadBtn metric="ss" onDownloadPng={onDownloadPng} />
						)}
					</div>
				</CardHeader>
				<CardContent className="p-4">
					{data.ss?.length ? (
						<ResponsiveContainer width="100%" height={CHART_H}>
							<LineChart data={data.ss} margin={CHART_MARGIN}>
								<CartesianGrid {...GRID} />
								<XAxis
									dataKey={ssHasTime ? "time" : "frame"}
									tickFormatter={(v) =>
										ssHasTime ? Number(v).toFixed(2) : String(v)
									}
									tick={TICK}
									label={{
										value: ssHasTime ? "Time (ns)" : "Frame",
										position: "insideBottom",
										offset: -12,
										...LSTYLE,
									}}
								/>
								<YAxis
									tick={TICK}
									width={56}
									label={{
										value: "Count",
										angle: -90,
										position: "insideLeft",
										offset: 12,
										...LSTYLE,
									}}
								/>
								<Tooltip
									content={
										<CustomTooltip xLabel={ssHasTime ? "Time (ns)" : "Frame"} />
									}
								/>
								<Legend
									verticalAlign="top"
									align="right"
									iconType="circle"
									wrapperStyle={{ fontSize: 12, paddingBottom: 20 }}
								/>
								<Line
									type="monotone"
									dataKey="helix"
									stroke="hsl(var(--primary))"
									strokeWidth={2}
									dot={false}
									name="Helix"
								/>
								<Line
									type="monotone"
									dataKey="sheet"
									stroke="hsl(var(--secondary))"
									strokeWidth={2}
									dot={false}
									name="Sheet"
								/>
								<Line
									type="monotone"
									dataKey="coil"
									stroke="hsl(var(--muted-foreground))"
									strokeWidth={2}
									dot={false}
									name="Coil"
									opacity={0.6}
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<EmptyChart label="Secondary Structure" />
					)}
				</CardContent>
			</Card>

			{/* RMSF */}
			<Card className="border-border/40 bg-card/50 backdrop-blur-sm">
				<CardHeader className="py-3 px-4 border-b border-border/20">
					<div className="flex items-center justify-between">
						<CardTitle className="text-sm font-semibold">
							RMSF — Per-Residue Flexibility (Å)
						</CardTitle>
						{data.rmsf?.length && (
							<DownloadBtn metric="rmsf" onDownloadPng={onDownloadPng} />
						)}
					</div>
				</CardHeader>
				<CardContent className="p-4">
					{data.rmsf?.length ? (
						<ResponsiveContainer width="100%" height={CHART_H}>
							<LineChart data={data.rmsf} margin={CHART_MARGIN}>
								<CartesianGrid {...GRID} />
								<XAxis
									dataKey="residue"
									tick={TICK}
									label={{
										value: "Residue",
										position: "insideBottom",
										offset: -12,
										...LSTYLE,
									}}
								/>
								<YAxis
									tick={TICK}
									width={56}
									label={{
										value: "Å",
										angle: -90,
										position: "insideLeft",
										offset: 12,
										...LSTYLE,
									}}
								/>
								<Tooltip content={<CustomTooltip xLabel="Residue" />} />
								<Legend
									verticalAlign="top"
									align="right"
									iconType="circle"
									wrapperStyle={{ fontSize: 12, paddingBottom: 20 }}
								/>
								<Line
									type="monotone"
									dataKey="value"
									stroke="hsl(var(--accent))"
									strokeWidth={2}
									dot={false}
									name="RMSF (Å)"
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<EmptyChart label="RMSF" />
					)}
				</CardContent>
			</Card>
		</div>
	);
}
