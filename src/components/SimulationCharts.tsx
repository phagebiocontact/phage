import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalysisData {
	rmsd?: Array<{ time: number; value: number }>;
	rmsf?: Array<{ residue: number; value: number }>;
	energy?: Array<{ time: number; potential: number; kinetic: number }>;
	radiusOfGyration?: Array<{ time: number; value: number }>;
	sasa?: Array<{ time: number; value: number }>;
}

interface SimulationChartsProps {
	data: AnalysisData;
}

export function SimulationCharts({ data }: SimulationChartsProps) {
	return (
		<Tabs defaultValue="rmsd" className="w-full">
			<TabsList className="grid w-full grid-cols-5">
				<TabsTrigger value="rmsd">RMSD</TabsTrigger>
				<TabsTrigger value="rmsf">RMSF</TabsTrigger>
				<TabsTrigger value="energy">Energy</TabsTrigger>
				<TabsTrigger value="rg">Radius of Gyration</TabsTrigger>
				<TabsTrigger value="sasa">SASA</TabsTrigger>
			</TabsList>

			<TabsContent value="rmsd" className="mt-4">
				<Card className="border-border/40">
					<CardHeader>
						<CardTitle>Root Mean Square Deviation (RMSD)</CardTitle>
						<p className="text-sm text-muted-foreground">
							Measures structural deviation from initial structure over time
						</p>
					</CardHeader>
					<CardContent>
						{data.rmsd && data.rmsd.length > 0 ? (
							<ResponsiveContainer width="100%" height={400}>
								<LineChart data={data.rmsd}>
									<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
									<XAxis
										dataKey="time"
										label={{ value: "Time (ns)", position: "insideBottom", offset: -5 }}
									/>
									<YAxis
										label={{ value: "RMSD (Å)", angle: -90, position: "insideLeft" }}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "hsl(var(--card))",
											border: "1px solid hsl(var(--border))",
										}}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="value"
										stroke="hsl(var(--primary))"
										strokeWidth={2}
										dot={false}
										name="RMSD"
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
								<p className="text-muted-foreground">No RMSD data available</p>
							</div>
						)}
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="rmsf" className="mt-4">
				<Card className="border-border/40">
					<CardHeader>
						<CardTitle>Root Mean Square Fluctuation (RMSF)</CardTitle>
						<p className="text-sm text-muted-foreground">
							Measures flexibility of each residue
						</p>
					</CardHeader>
					<CardContent>
						{data.rmsf && data.rmsf.length > 0 ? (
							<ResponsiveContainer width="100%" height={400}>
								<LineChart data={data.rmsf}>
									<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
									<XAxis
										dataKey="residue"
										label={{ value: "Residue Index", position: "insideBottom", offset: -5 }}
									/>
									<YAxis
										label={{ value: "RMSF (Å)", angle: -90, position: "insideLeft" }}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "hsl(var(--card))",
											border: "1px solid hsl(var(--border))",
										}}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="value"
										stroke="hsl(var(--chart-2))"
										strokeWidth={2}
										dot={false}
										name="RMSF"
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
								<p className="text-muted-foreground">No RMSF data available</p>
							</div>
						)}
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="energy" className="mt-4">
				<Card className="border-border/40">
					<CardHeader>
						<CardTitle>System Energy</CardTitle>
						<p className="text-sm text-muted-foreground">
							Potential and kinetic energy over time
						</p>
					</CardHeader>
					<CardContent>
						{data.energy && data.energy.length > 0 ? (
							<ResponsiveContainer width="100%" height={400}>
								<LineChart data={data.energy}>
									<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
									<XAxis
										dataKey="time"
										label={{ value: "Time (ns)", position: "insideBottom", offset: -5 }}
									/>
									<YAxis
										label={{ value: "Energy (kJ/mol)", angle: -90, position: "insideLeft" }}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "hsl(var(--card))",
											border: "1px solid hsl(var(--border))",
										}}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="potential"
										stroke="hsl(var(--chart-3))"
										strokeWidth={2}
										dot={false}
										name="Potential Energy"
									/>
									<Line
										type="monotone"
										dataKey="kinetic"
										stroke="hsl(var(--chart-4))"
										strokeWidth={2}
										dot={false}
										name="Kinetic Energy"
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
								<p className="text-muted-foreground">No energy data available</p>
							</div>
						)}
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="rg" className="mt-4">
				<Card className="border-border/40">
					<CardHeader>
						<CardTitle>Radius of Gyration</CardTitle>
						<p className="text-sm text-muted-foreground">
							Measures compactness of the protein structure
						</p>
					</CardHeader>
					<CardContent>
						{data.radiusOfGyration && data.radiusOfGyration.length > 0 ? (
							<ResponsiveContainer width="100%" height={400}>
								<LineChart data={data.radiusOfGyration}>
									<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
									<XAxis
										dataKey="time"
										label={{ value: "Time (ns)", position: "insideBottom", offset: -5 }}
									/>
									<YAxis
										label={{ value: "Rg (Å)", angle: -90, position: "insideLeft" }}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "hsl(var(--card))",
											border: "1px solid hsl(var(--border))",
										}}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="value"
										stroke="hsl(var(--chart-5))"
										strokeWidth={2}
										dot={false}
										name="Radius of Gyration"
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
								<p className="text-muted-foreground">
									No radius of gyration data available
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</TabsContent>

			<TabsContent value="sasa" className="mt-4">
				<Card className="border-border/40">
					<CardHeader>
						<CardTitle>Solvent Accessible Surface Area (SASA)</CardTitle>
						<p className="text-sm text-muted-foreground">
							Measures protein surface exposed to solvent
						</p>
					</CardHeader>
					<CardContent>
						{data.sasa && data.sasa.length > 0 ? (
							<ResponsiveContainer width="100%" height={400}>
								<LineChart data={data.sasa}>
									<CartesianGrid strokeDasharray="3 3" opacity={0.1} />
									<XAxis
										dataKey="time"
										label={{ value: "Time (ns)", position: "insideBottom", offset: -5 }}
									/>
									<YAxis
										label={{ value: "SASA (Å²)", angle: -90, position: "insideLeft" }}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: "hsl(var(--card))",
											border: "1px solid hsl(var(--border))",
										}}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="value"
										stroke="hsl(var(--chart-1))"
										strokeWidth={2}
										dot={false}
										name="SASA"
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="h-[400px] flex items-center justify-center bg-muted rounded-lg">
								<p className="text-muted-foreground">No SASA data available</p>
							</div>
						)}
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	);
}
