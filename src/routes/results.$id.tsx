import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import {
	Activity,
	ChevronLeft,
	Clock,
	Download,
	Info,
	RefreshCw,
	Settings2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { MolstarViewerRef } from "@/components/MolstarViewer";
import MolstarViewer from "@/components/MolstarViewer";
import { SimulationCharts } from "@/components/SimulationCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/results/$id")({
	component: Results,
});

function Results() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const simulation = useQuery(api.simulations.getSimulation, {
		id: id as Id<"simulations">,
	});
	const checkStatus = useAction(api.actions.checkJobStatus);
	const getDownloadUrl = useMutation(api.results.getResultsDownloadUrl);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [representation, setRepresentation] = useState<
		"cartoon" | "ball-and-stick" | "surface"
	>("cartoon");
	const [_colorScheme, setColorScheme] = useState<
		"chain" | "element" | "rainbow"
	>("chain");
	const molstarRef = useRef<MolstarViewerRef>(null);

	// Show toast on error
	useEffect(() => {
		if (simulation?.error) {
			toast.error("Simulation Error", {
				description: "Something went wrong while processing your simulation.",
			});
		}
	}, [simulation?.error]);

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await checkStatus({ simulationId: id as Id<"simulations"> });
			toast.success("Status updated");
		} catch (error) {
			console.error("Error refreshing status:", error);
			toast.error("Failed to refresh status");
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleDownload = async () => {
		if (!simulation?.resultStorageId) {
			toast.error("Results not available yet");
			return;
		}
		try {
			const url = await getDownloadUrl({
				storageId: simulation.resultStorageId,
			});
			if (url) {
				window.open(url, "_blank");
			}
		} catch (error) {
			console.error("Error downloading results:", error);
			toast.error("Failed to download results");
		}
	};

	const handleRepresentationChange = (
		type: "cartoon" | "ball-and-stick" | "surface",
	) => {
		setRepresentation(type);
		molstarRef.current?.setRepresentation(type);
	};

	const _handleColorChange = (color: "chain" | "element" | "rainbow") => {
		setColorScheme(color);
		molstarRef.current?.setColor(color);
	};

	if (!simulation) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Card className="border-border/40 bg-card/50 backdrop-blur-sm p-12">
					<p className="text-muted-foreground">Loading simulation...</p>
				</Card>
			</div>
		);
	}

	const statusColors = {
		pending: "bg-yellow-500",
		queued: "bg-blue-500",
		running: "bg-indigo-500",
		completed: "bg-green-500",
		failed: "bg-red-500",
	};

	// Use live analysis data from simulation
	const analysisData = {
		rmsd: simulation.analysisData?.rmsd || [],
		rmsf: simulation.analysisData?.rmsf || [],
		energy: [],
		radiusOfGyration: simulation.analysisData?.radiusOfGyration || [],
		sasa: simulation.analysisData?.sasa || [],
	};

	return (
		<div className="min-h-screen bg-background">
			<section className="pt-32 pb-12">
				<div className="container mx-auto px-4">
					<div className="mx-auto max-w-6xl">
						<div className="mb-8 flex items-center justify-between">
							<div>
								<Button
									variant="ghost"
									onClick={() => navigate({ to: "/jobs" })}
									className="mb-4"
								>
									<ChevronLeft className="mr-2 h-4 w-4" />
									Back to Jobs
								</Button>
								<h1 className="mb-2 font-bold text-4xl">{simulation.name}</h1>
								<div className="flex items-center gap-2">
									<div
										className={`h-3 w-3 rounded-full ${statusColors[simulation.status as keyof typeof statusColors]}`}
									/>
									<span className="text-muted-foreground capitalize">
										{simulation.status}
									</span>
								</div>
							</div>
							<div className="flex gap-2">
								<Button
									onClick={handleRefresh}
									disabled={isRefreshing || simulation.status === "completed"}
									variant="outline"
								>
									<RefreshCw
										className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
									/>
									Refresh Status
								</Button>
								{simulation.status === "completed" && (
									<Button
										onClick={handleDownload}
										className="bg-gradient-primary"
									>
										<Download className="mr-2 h-4 w-4" />
										Download Results
									</Button>
								)}
							</div>
						</div>

						{/* Main Content Grid */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Left Column - Progress & Info */}
							<div className="lg:col-span-1 space-y-6">
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.1 }}
								>
									<Card className="border-border/40 bg-card/50 backdrop-blur-xl overflow-hidden relative">
										<div className="absolute top-0 left-0 w-1 h-full bg-gradient-primary" />
										<CardHeader className="pb-2">
											<div className="flex items-center gap-2 text-primary">
												<Activity className="h-4 w-4" />
												<CardTitle className="text-sm font-medium uppercase tracking-wider">
													Status
												</CardTitle>
											</div>
										</CardHeader>
										<CardContent className="space-y-6">
											<div className="space-y-2">
												<div className="flex justify-between items-end">
													<div className="space-y-1">
														<p className="text-2xl font-bold">
															{simulation.progressPercent || 0}%
														</p>
														<p className="text-xs text-muted-foreground font-medium uppercase">
															{simulation.currentStep || "Processing"}
														</p>
													</div>
													<Badge
														variant="secondary"
														className={`${statusColors[simulation.status as keyof typeof statusColors]} bg-opacity-20 text-white border-none`}
													>
														{simulation.status}
													</Badge>
												</div>
												<Progress
													value={simulation.progressPercent || 0}
													className="h-2 bg-primary/10"
												/>
											</div>

											<div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
												<div className="space-y-1">
													<div className="flex items-center gap-1.5 text-muted-foreground">
														<Clock className="h-3.5 w-3.5" />
														<span className="text-[10px] uppercase font-bold tracking-tight">
															Duration
														</span>
													</div>
													<p className="text-sm font-semibold">
														{simulation.timeElapsedSeconds
															? `${Math.floor(simulation.timeElapsedSeconds)}s`
															: "0s"}
													</p>
												</div>
												<div className="space-y-1">
													<div className="flex items-center gap-1.5 text-muted-foreground">
														<Settings2 className="h-3.5 w-3.5" />
														<span className="text-[10px] uppercase font-bold tracking-tight">
															Target
														</span>
													</div>
													<p className="text-sm font-semibold">
														{simulation.parameters.duration}ns
													</p>
												</div>
											</div>

											<AnimatePresence>
												{simulation.error && (
													<motion.div
														initial={{ opacity: 0, height: 0 }}
														animate={{ opacity: 1, height: "auto" }}
														exit={{ opacity: 0, height: 0 }}
														className="pt-4 mt-4 border-t border-red-500/20"
													>
														<div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
															<div className="flex gap-2 text-red-500">
																<Info className="h-4 w-4 shrink-0" />
																<p className="text-xs font-semibold leading-tight">
																	Simulation encountered an issue.
																</p>
															</div>
															<Button
																size="sm"
																variant="destructive"
																className="w-full text-[10px] h-8 font-bold uppercase tracking-wider bg-red-500 hover:bg-red-600"
																onClick={() => {
																	toast.info("Redirecting to support...");
																	navigate({ to: "/contact" });
																}}
															>
																Open Ticket
															</Button>
														</div>
													</motion.div>
												)}
											</AnimatePresence>
										</CardContent>
									</Card>
								</motion.div>

								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.2 }}
								>
									<Card className="border-border/40 bg-card/50 backdrop-blur-xl">
										<CardHeader className="pb-2">
											<CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
												Parameters
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="space-y-4">
												{[
													{
														label: "Temperature",
														value: `${simulation.parameters.temperature} K`,
													},
													{
														label: "Timestep",
														value: `${simulation.parameters.timestep} fs`,
													},
													{
														label: "Ensemble",
														value: simulation.parameters.ensemble,
													},
												].map((item, i) => (
													<div
														key={i}
														className="flex justify-between items-center py-2 border-b border-border/20 last:border-0"
													>
														<span className="text-xs text-muted-foreground">
															{item.label}
														</span>
														<span className="text-xs font-mono font-bold">
															{item.value}
														</span>
													</div>
												))}
											</div>
										</CardContent>
									</Card>
								</motion.div>
							</div>

							{/* Right Column - Visualization & Data */}
							<div className="lg:col-span-2">
								<AnimatePresence mode="wait">
									{simulation.status === "completed" ? (
										<motion.div
											key="completed"
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											className="space-y-6"
										>
											<Card className="border-border/40 bg-card/50 backdrop-blur-xl overflow-hidden">
												<CardHeader className="border-b border-border/20 pb-4">
													<div className="flex flex-wrap items-center justify-between gap-4">
														<CardTitle className="text-lg font-bold">
															Molecular View
														</CardTitle>
														<div className="flex gap-2 bg-background/50 p-1 rounded-lg border border-border/40 scale-90 sm:scale-100">
															{["cartoon", "ball-and-stick", "surface"].map(
																(type) => (
																	<Button
																		key={type}
																		size="sm"
																		variant={
																			representation === type
																				? "default"
																				: "ghost"
																		}
																		onClick={() =>
																			handleRepresentationChange(type as any)
																		}
																		className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider"
																	>
																		{type.replace("-", " ")}
																	</Button>
																),
															)}
														</div>
													</div>
												</CardHeader>
												<CardContent className="p-0">
													<div className="h-[500px] relative group">
														<MolstarViewer
															ref={molstarRef}
															pdbId="1crn"
															className="w-full h-full"
														/>
														<div className="absolute bottom-4 left-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
															<p className="text-[10px] text-white/80 text-center leading-relaxed">
																Interactive 3D viewport. Use mouse to rotate,
																scroll to zoom. Currently showing demo structure
																(1CRN).
															</p>
														</div>
													</div>
												</CardContent>
											</Card>
										</motion.div>
									) : simulation.status === "failed" ? (
										<motion.div
											key="failed"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="h-full min-h-[400px]"
										>
											<Card className="h-full border-red-500/20 bg-red-500/5 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center border-dashed">
												<div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
													<Info className="h-6 w-6 text-red-500" />
												</div>
												<h3 className="text-xl font-bold mb-2 text-red-500">
													Simulation Failed
												</h3>
												<p className="text-sm text-muted-foreground max-w-sm">
													We encountered an error while processing your request.
													Please check the status details or contact support for
													assistance.
												</p>
											</Card>
										</motion.div>
									) : (
										<motion.div
											key="awaiting"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											className="h-full min-h-[400px]"
										>
											<Card className="h-full border-border/40 bg-card/50 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center border-dashed">
												<div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 relative">
													<div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
													<Activity className="h-6 w-6 text-primary" />
												</div>
												<h3 className="text-xl font-bold mb-2">
													Awaiting Simulation Completion
												</h3>
												<p className="text-sm text-muted-foreground max-w-sm">
													Interactive visualization and detailed analysis will
													become available once the current compute job
													finishes.
												</p>
											</Card>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</div>

						{simulation.status === "completed" && (
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="mt-6"
							>
								<Card className="border-border/40 bg-card/50 backdrop-blur-xl">
									<CardHeader>
										<CardTitle>Trajectory Analysis</CardTitle>
									</CardHeader>
									<CardContent>
										<SimulationCharts data={analysisData} />
									</CardContent>
								</Card>
							</motion.div>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}
