import { createFileRoute, useNavigate } from "@tanstack/react-router";
import JSZip from "jszip";
import { useAction, useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Download,
  FileText,
  FlaskConical,
  Monitor,
  RefreshCw,
  Settings2,
  Terminal,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LogViewer } from "@/components/LogViewer";
import { useSimulationWs } from "@/hooks/useSimulationWs";
import type { MolstarViewerRef } from "@/components/MolstarViewer";
import MolstarViewer from "@/components/MolstarViewer";
import type { SimulationAnalysisData } from "@/components/SimulationCharts";
import { SimulationCharts } from "@/components/SimulationCharts";
import { TimelineControls } from "@/components/TimelineControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/results/$id")({
  component: Results,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type SimulationStatus = "pending" | "queued" | "running" | "completed" | "failed" | "canceled";

const STATUS_CONFIG: Record<SimulationStatus, { color: string; dot: string; label: string }> = {
  pending: { color: "text-amber-400", dot: "bg-amber-400", label: "Pending" },
  queued: { color: "text-blue-400", dot: "bg-blue-400", label: "Queued" },
  running: { color: "text-primary", dot: "bg-primary animate-pulse", label: "Running" },
  completed: { color: "text-emerald-400", dot: "bg-emerald-400", label: "Completed" },
  failed: { color: "text-red-400", dot: "bg-red-400", label: "Failed" },
  canceled: { color: "text-gray-400", dot: "bg-gray-400", label: "Canceled" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
function Results() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const simulation = useQuery(api.simulations.getSimulation, { id: id as Id<"simulations"> });
  const checkStatus = useAction(api.actions.checkJobStatus);

  // WS only while job is non-terminal — after completion Modal container stops
  const isTerminalStatus = ["completed", "failed", "canceled"].includes(simulation?.status ?? "");
  const { wsStatus, liveLogsText, wsConnected, livePdbBase64, liveTrajectoryFrame, liveAnalysisPoints } = useSimulationWs({
    modalJobId: (simulation as { modalJobId?: string })?.modalJobId,
    enabled: !isTerminalStatus && !!simulation,
  });
  // Auto-trigger checkStatus when WS closes with terminal state so Convex updates promptly
  const didAutoCheck = useRef(false);
  useEffect(() => {
    const terminalFromWs = ["completed", "failed", "canceled"].includes(wsStatus?.status ?? "");
    if (terminalFromWs && !isTerminalStatus && !didAutoCheck.current) {
      didAutoCheck.current = true;
      checkStatus({ simulationId: id as Id<"simulations"> }).catch(() => {});
    }
    if (!terminalFromWs) didAutoCheck.current = false;
  }, [wsStatus?.status, isTerminalStatus, checkStatus, id]);
  const molstarRef = useRef<MolstarViewerRef>(null);
  const [representation, setRepresentation] = useState<"cartoon" | "ball-and-stick" | "surface">("cartoon");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);

  // UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);

  // Artifact URL resolution — typed via Convex schema artifacts field
  type SimArtifacts = {
    structurePdb?: string;
    trajectoryXtc?: string;
    resultTar?: string;
    rmsdPng?: string;
    rmsfPng?: string;
    rgPng?: string;
    ssPng?: string;
    energyPng?: string;
  };
  type SimData = {
    _id: string;
    name: string;
    status: string;
    parameters: { temperature: number; duration: number; timestep: number; ensemble: string };
    creditsReserved: number;
    creditsCaptured?: number;
    progressPercent?: number;
    currentStep?: string;
    timeElapsedSeconds?: number;
    artifacts?: SimArtifacts;
    analysisData?: { rmsd?: unknown[]; rmsf?: unknown[]; rg?: unknown[]; energy?: unknown[]; ss?: unknown[] };
    errorSummary?: string;
    errorRaw?: string;
    logTail?: string;
  };
  const sim = simulation as SimData | null;
  const artifacts = sim?.artifacts;

  // Get URL queries for viewer files
  const structureUrl = useQuery(
    api.simulations.getArtifactUrl,
    artifacts?.structurePdb && simulation
      ? { simulationId: simulation._id, storageId: artifacts.structurePdb }
      : "skip"
  );
  const trajectoryUrl = useQuery(
    api.simulations.getArtifactUrl,
    artifacts?.trajectoryXtc && simulation
      ? { simulationId: simulation._id, storageId: artifacts.trajectoryXtc }
      : "skip"
  );

  // Build analysis data from live points during run; from Convex after completion
  const liveAnalysisData: SimulationAnalysisData = {
    rmsd: liveAnalysisPoints.filter(p => p.rmsd != null).map(p => ({ frame: p.frame, time: p.time_ns, value: p.rmsd ?? 0 })),
    rg:   liveAnalysisPoints.filter(p => p.rg != null).map(p => ({ frame: p.frame, time: p.time_ns, value: p.rg ?? 0 })),
    energy: liveAnalysisPoints.filter(p => p.potential != null).map(p => ({ frame: p.frame, time: p.time_ns, potential: p.potential ?? 0, kinetic: p.kinetic ?? 0, total: p.total ?? 0 })),
    ss: liveAnalysisPoints.filter(p => p.helix != null).map(p => ({ frame: p.frame, time: p.time_ns, helix: p.helix ?? 0, sheet: p.sheet ?? 0, coil: p.coil ?? 0 })),
    rmsf: undefined,
  };
  const wsAnalysis = wsStatus?.analysis_data as Record<string, unknown> | undefined;
  const analysisData: SimulationAnalysisData = {
    rmsd: (sim?.analysisData?.rmsd ?? wsAnalysis?.rmsd) as SimulationAnalysisData["rmsd"],
    rmsf: (sim?.analysisData?.rmsf ?? wsAnalysis?.rmsf) as SimulationAnalysisData["rmsf"],
    rg: (sim?.analysisData?.rg ?? wsAnalysis?.radiusOfGyration) as SimulationAnalysisData["rg"],
    energy: sim?.analysisData?.energy as SimulationAnalysisData["energy"],
    ss: sim?.analysisData?.ss as SimulationAnalysisData["ss"],
  };
  const hasLiveAnalysis = liveAnalysisPoints.length > 0;

  // Live progress values: WS data while running, Convex data otherwise
  const liveProgress = wsStatus?.progress_percent ?? simulation?.progressPercent ?? 0;
  const liveStep = wsStatus?.current_step ?? simulation?.currentStep;
  const liveElapsed = wsStatus?.time_elapsed_seconds ?? simulation?.timeElapsedSeconds;
  const liveSpeed = wsStatus?.speed_ns_per_day;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkStatus({ simulationId: id as Id<"simulations"> });
      toast.success("Status refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFrameChange = useCallback((frame: number, total: number) => {
    setCurrentFrame(frame);
    if (total > 0) setTotalFrames(total);
  }, []);

  const handleTimelineFrame = useCallback((frame: number) => {
    setCurrentFrame(frame);
    molstarRef.current?.setFrame(frame);
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    molstarRef.current?.play();
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    molstarRef.current?.pause();
  }, []);

  const handleChartFrameSelect = useCallback(
    (frame: number) => {
      if (!syncEnabled) return;
      setCurrentFrame(frame);
      molstarRef.current?.setFrame(frame);
    },
    [syncEnabled]
  );

  const handleRepresentationChange = (type: "cartoon" | "ball-and-stick" | "surface") => {
    setRepresentation(type);
    molstarRef.current?.setRepresentation(type);
  };

  const downloadArtifact = async (storageId: Id<"_storage">, filename: string) => {
    if (!simulation) return;
    try {
      // We don't have a direct download mutation here; use the Convex URL query pattern
      // We'll make a simple fetch from the signed URL
      toast.info("Preparing download...");
      const convexUrl = (await import("@/lib/convex")).convex;
      const { api: convexApi } = await import("../../convex/_generated/api");
      const url = await convexUrl.mutation(convexApi.results.getResultsDownloadUrl, {
        storageId,
      });
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
      }
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDownloadPng = async (metric: "rmsd" | "rmsf" | "rg" | "ss" | "energy") => {
    const keyMap: Record<string, string> = {
      rmsd: "rmsdPng",
      rmsf: "rmsfPng",
      rg: "rgPng",
      ss: "ssPng",
      energy: "energyPng",
    };
    const storageId = artifacts?.[keyMap[metric]];
    if (!storageId) {
      toast.error(`${metric.toUpperCase()} PNG not available`);
      return;
    }
    await downloadArtifact(storageId, `${metric}.png`);
  };

  const handleDownloadTar = async () => {
    if (!artifacts) {
      toast.error("Results archive not available yet");
      return;
    }
    toast.info("Preparing results archive...");
    try {
      const zip = new JSZip();
      const convexUrl = (await import("@/lib/convex")).convex;
      const { api: convexApi } = await import("../../convex/_generated/api");

      const filePromises = Object.entries(artifacts).map(async ([key, storageId]) => {
        if (!storageId || key === "resultTar") return;
        const url = await convexUrl.mutation(convexApi.results.getResultsDownloadUrl, {
          storageId: storageId as Id<"_storage">,
        });
        if (url) {
          const res = await fetch(url);
          const blob = await res.blob();
          let filename = key;
          if (key === "structurePdb") filename = "complex.pdb";
          else if (key === "trajectoryXtc") filename = "prod.xtc";
          else if (key === "simulationLog") filename = "simulation.log";
          else if (key.endsWith("Csv")) filename = key.replace("Csv", ".csv");
          else if (key.endsWith("Png")) filename = key.replace("Png", ".png");
          zip.file(filename, blob);
        }
      });

      await Promise.all(filePromises);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = "results.zip";
      a.click();
      toast.success("Results downloaded");
    } catch {
      toast.error("Download failed");
    }
  };

  // Loading state
  if (simulation === undefined) {
    return (
      <div className="fusion-canvas min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading simulation...</p>
        </div>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="fusion-canvas min-h-screen bg-background flex items-center justify-center">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Simulation Not Found</h2>
          <p className="text-muted-foreground mb-6">This simulation doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate({ to: "/jobs" })}>Back to Jobs</Button>
        </Card>
      </div>
    );
  }

  // Use Convex status as source of truth (WS only supplements during run)
  const status = simulation.status as SimulationStatus;
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const isTerminal = ["completed", "failed", "canceled"].includes(status);
  const isCompleted = status === "completed";
  const isFailed = status === "failed";

  return (
    <div className="fusion-canvas min-h-screen bg-background">
      <section className="pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/jobs" })}
              className="mb-3 -ml-1 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Jobs
            </Button>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-1">{simulation.name}</h1>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
                  <span className={`text-sm font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  {simulation.currentStep && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="text-sm text-muted-foreground">{simulation.currentStep}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {/* Live connection indicator — only relevant while running */}
                {!isTerminal && (
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${
                    wsConnected
                      ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/5"
                      : "text-muted-foreground border-border/30"
                  }`}>
                    {wsConnected
                      ? <><Wifi className="h-3 w-3" /> Live</>  
                      : <><WifiOff className="h-3 w-3" /> Polling</>}
                  </span>
                )}
                {!isTerminal && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                )}
                {isCompleted && (
                  <Button
                    size="sm"
                    className="bg-gradient-primary gap-2"
                    onClick={handleDownloadTar}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Results
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── Progress Bar (running/queued) ── */}
          <AnimatePresence>
            {!isTerminal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <Card className="border-border/40 bg-card/50 backdrop-blur-xl overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-primary" />
                  <CardContent className="p-5">
                    <div className="flex items-end justify-between mb-3">
                      <div className="flex items-center gap-2 text-primary">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm font-semibold uppercase tracking-wide">
                          {liveStep ?? "Simulation Progress"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {liveSpeed != null && liveSpeed > 0 && (
                          <span className="flex items-center gap-1 text-xs text-primary/70 font-mono">
                            <Zap className="h-3 w-3" />
                            {liveSpeed.toFixed(1)} ns/day
                          </span>
                        )}
                        <span className="text-2xl font-bold tabular-nums">
                          {Math.round(liveProgress)}%
                        </span>
                      </div>
                    </div>
                    {/* Animated gradient progress bar */}
                    <div className="relative h-3 rounded-full bg-primary/10 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${liveProgress}%`,
                          background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(265 90% 70%) 100%)",
                          boxShadow: "0 0 12px hsl(var(--primary) / 0.5)",
                        }}
                      />
                      {/* Shimmer animation */}
                      {!isTerminal && (
                        <div
                          className="absolute inset-y-0 w-20 animate-shimmer"
                          style={{
                            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                            left: `${(liveProgress - 10)}%`,
                          }}
                        />
                      )}
                    </div>
                    <div className="flex gap-6 mt-3 text-xs text-muted-foreground flex-wrap">
                      {liveElapsed != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor(liveElapsed)}s elapsed
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Settings2 className="h-3 w-3" />
                        Target: {simulation.parameters.duration}ns
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Failed Error Card ── */}
          <AnimatePresence>
            {isFailed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6"
              >
                <Card className="border-red-500/30 bg-red-500/5 backdrop-blur-xl overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500" />
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-red-400 mb-1">Simulation Failed</p>
                        <p className="text-sm text-muted-foreground">
                          {sim?.errorSummary ??
                            "The simulation encountered an error during processing."}
                        </p>
                        {sim?.errorRaw && (
                          <button
                            type="button"
                            className="flex items-center gap-1 mt-3 text-xs text-red-400/70 hover:text-red-400 transition-colors"
                            onClick={() => setErrorExpanded((v) => !v)}
                          >
                            {errorExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                            {errorExpanded ? "Hide" : "Show"} technical details
                          </button>
                        )}
                        <AnimatePresence>
                          {errorExpanded && sim?.errorRaw && (
                            <motion.pre
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 p-3 bg-black/40 rounded-lg text-xs text-red-300/80 font-mono overflow-auto max-h-48 whitespace-pre-wrap"
                            >
                              {sim.errorRaw}
                            </motion.pre>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Main Content ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left sidebar: parameters */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-1 space-y-4"
            >
              <Card className="border-border/40 bg-card/50 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                    Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3 text-sm">
                    {[
                      { label: "Temperature", value: `${simulation.parameters.temperature} K` },
                      { label: "Duration", value: `${simulation.parameters.duration} ns` },
                      { label: "Timestep", value: `${simulation.parameters.timestep} fs` },
                      { label: "Ensemble", value: simulation.parameters.ensemble },
                      {
                        label: "Credits Reserved",
                        value: `${simulation.creditsReserved}`,
                      },
                      ...(simulation.creditsCaptured != null
                        ? [{ label: "Credits Used", value: `${simulation.creditsCaptured}` }]
                        : []),
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="text-xs font-mono font-semibold">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right content area */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="lg:col-span-3"
            >
              {isCompleted ? (
                <Tabs defaultValue="trajectory" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-6">
                    <TabsTrigger value="trajectory" className="gap-2">
                      <Monitor className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Trajectory</span>
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="gap-2">
                      <FlaskConical className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Analysis</span>
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Logs</span>
                    </TabsTrigger>
                    <TabsTrigger value="downloads" className="gap-2">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Downloads</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Trajectory Tab */}
                  <TabsContent value="trajectory">
                    <Card className="border-border/40 bg-card/50 backdrop-blur-xl overflow-hidden">
                      <CardHeader className="border-b border-border/20 py-3 px-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle className="text-base">Molecular Dynamics Trajectory</CardTitle>
                          <div className="flex gap-2 items-center">
                            <div className="flex gap-1 bg-background/50 p-1 rounded-lg border border-border/40">
                              {(["cartoon", "ball-and-stick", "surface"] as const).map((type) => (
                                <Button
                                  key={type}
                                  size="sm"
                                  variant={representation === type ? "default" : "ghost"}
                                  onClick={() => handleRepresentationChange(type)}
                                  className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider"
                                >
                                  {type.replace("-", " ")}
                                </Button>
                              ))}
                            </div>
                            {totalFrames > 1 && (
                              <Button
                                size="sm"
                                variant={syncEnabled ? "default" : "outline"}
                                onClick={() => setSyncEnabled((v) => !v)}
                                className="h-7 px-2.5 text-[10px] gap-1.5"
                              >
                                <Zap className="h-3 w-3" />
                                Sync
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="h-[520px] relative">
                          <MolstarViewer
                            ref={molstarRef}
                            structureUrl={structureUrl ?? undefined}
                            trajectoryUrl={trajectoryUrl ?? undefined}
                            className="w-full h-full"
                            onFrameChange={handleFrameChange}
                          />
                          {!structureUrl && !trajectoryUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                              <div className="text-center text-white/60 space-y-2">
                                <RefreshCw className="h-8 w-8 animate-spin mx-auto opacity-50" />
                                <p className="text-sm">Loading structure files...</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <TimelineControls
                          currentFrame={currentFrame}
                          totalFrames={totalFrames}
                          isPlaying={isPlaying}
                          onFrameChange={handleTimelineFrame}
                          onPlay={handlePlay}
                          onPause={handlePause}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Analysis Tab */}
                  <TabsContent value="analysis">
                    <SimulationCharts
                      data={analysisData}
                      selectedFrame={currentFrame}
                      syncEnabled={syncEnabled}
                      onFrameSelect={handleChartFrameSelect}
                      onDownloadPng={handleDownloadPng}
                    />
                  </TabsContent>

                  {/* Logs Tab */}
                  <TabsContent value="logs">
                    <Card className="border-border/40 bg-card/50 backdrop-blur-xl">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Simulation Log
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <LogViewer
                          content={sim?.logTail ?? ""}
                          maxHeight="500px"
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Downloads Tab */}
                  <TabsContent value="downloads">
                    <Card className="border-border/40 bg-card/50 backdrop-blur-xl">
                      <CardHeader>
                        <CardTitle className="text-base">Download Results</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Download individual analysis plots or the complete results archive.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Full archive */}
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Complete Archive
                          </h4>
                          <Button
                            className="w-full gap-2 bg-gradient-primary"
                            onClick={handleDownloadTar}
                            disabled={!artifacts}
                          >
                            <Download className="h-4 w-4" />
                            Download results.zip
                          </Button>
                        </div>

                        {/* Analysis PNGs */}
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Research-Grade Analysis Plots
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(
                              [
                                { key: "rmsdPng", label: "RMSD Plot" },
                                { key: "rmsfPng", label: "RMSF Plot" },
                                { key: "rgPng", label: "Radius of Gyration Plot" },
                                { key: "ssPng", label: "Secondary Structure Plot" },
                                { key: "energyPng", label: "Energy Plot" },
                              ] as const
                            ).map(({ key, label }) => {
                              const metric = key.replace("Png", "") as "rmsd" | "rmsf" | "rg" | "ss" | "energy";
                              const available = !!artifacts?.[key];
                              return (
                                <Button
                                  key={key}
                                  variant="outline"
                                  className="h-auto py-3 flex-col gap-1.5 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all"
                                  disabled={!available}
                                  onClick={() => handleDownloadPng(metric)}
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="text-xs">{label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : isFailed && sim?.logTail ? (
                <Card className="border-border/40 bg-card/50 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base text-red-400 flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Error Log (Last 50 Lines)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <LogViewer content={sim.logTail ?? ""} maxHeight="480px" />
                  </CardContent>
                </Card>
              ) : (
                /* ── Running / queued — live tabbed interface ── */
                <Tabs defaultValue="trajectory" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="trajectory" className="gap-2">
                      <Monitor className="h-3.5 w-3.5" />
                      <span>Trajectory</span>
                      {livePdbBase64 && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />}
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="gap-2">
                      <FlaskConical className="h-3.5 w-3.5" />
                      <span>Analysis</span>
                      {hasLiveAnalysis && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
                    </TabsTrigger>
                    <TabsTrigger value="log" className="gap-2">
                      <Terminal className="h-3.5 w-3.5" />
                      <span>Live Log</span>
                      {wsConnected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    </TabsTrigger>
                  </TabsList>

                  {/* Live Trajectory Tab */}
                  <TabsContent value="trajectory">
                    {livePdbBase64 ? (
                      <Card className="border-border/40 bg-card/50 backdrop-blur-xl overflow-hidden">
                        <CardHeader className="border-b border-border/20 py-3 px-4">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Live Structure Preview</CardTitle>
                            <span className="flex items-center gap-1.5 text-xs text-blue-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                              Frame {liveTrajectoryFrame} — updating every 1k steps
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="h-[460px] relative">
                            <MolstarViewer
                              ref={molstarRef}
                              livePdbBase64={livePdbBase64}
                              className="w-full h-full"
                              onFrameChange={handleFrameChange}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-border/40 bg-card/50 border-dashed flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                        <Monitor className="h-10 w-10 text-primary/20" />
                        <div>
                          <p className="text-sm font-medium">Structure not yet available</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            A live preview will appear after the production run starts.
                          </p>
                        </div>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Live Analysis Tab */}
                  <TabsContent value="analysis">
                    {hasLiveAnalysis ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1 mb-3">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-xs text-amber-400/80 font-mono uppercase tracking-wider">
                            Live — updating every 1k steps · RMSF available after production
                          </span>
                        </div>
                        <SimulationCharts
                          data={liveAnalysisData}
                          selectedFrame={currentFrame}
                          syncEnabled={false}
                          onDownloadPng={undefined}
                        />
                      </div>
                    ) : (
                      <Card className="border-border/40 bg-card/50 border-dashed flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                        <FlaskConical className="h-10 w-10 text-primary/20" />
                        <div>
                          <p className="text-sm font-medium">Analysis not yet available</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Charts will appear once the production run starts.
                          </p>
                        </div>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Live Log Tab */}
                  <TabsContent value="log">
                    {liveLogsText ? (
                      <LogViewer
                        content={liveLogsText}
                        maxHeight="520px"
                        isLive={wsConnected}
                        autoScroll
                      />
                    ) : (
                      <div
                        className="rounded-xl flex flex-col items-center justify-center min-h-[300px] text-center gap-4"
                        style={{
                          background: "linear-gradient(135deg, #0a0f1e 0%, #0d1117 100%)",
                          border: "1px solid rgba(99,102,241,0.2)",
                        }}
                      >
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full border-2 border-indigo-400/20 border-t-indigo-400 animate-spin" />
                          <Terminal className="h-5 w-5 text-indigo-400 absolute inset-0 m-auto" />
                        </div>
                        <div>
                          <p className="text-sm font-mono text-indigo-300/80">
                            {wsConnected ? "Connected — waiting for log output..." : "Connecting to simulation log stream..."}
                          </p>
                          <p className="text-xs text-white/20 font-mono mt-1">
                            {wsConnected ? "● LIVE" : "○ CONNECTING"}
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
