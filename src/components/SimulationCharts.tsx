import { useState } from "react";
import { Download, BarChart3 } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types (mirror Convex analysisData shape) ─────────────────────────────────
export interface RmsdPoint {
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
  helix: number;
  sheet: number;
  coil: number;
}

export interface SimulationAnalysisData {
  rmsd?: RmsdPoint[];
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
  /** Download file handlers keyed by artifact key */
  onDownloadPng?: (metric: "rmsd" | "rmsf" | "rg" | "ss" | "energy") => void;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, xLabel }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-sm px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1 font-medium">{xLabel}: {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(4) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyChart = ({ label }: { label: string }) => (
  <div className="h-[340px] flex flex-col items-center justify-center text-muted-foreground gap-3">
    <BarChart3 className="h-10 w-10 opacity-20" />
    <p className="text-sm">{label} data not available</p>
  </div>
);

// ─── Common chart wrapper ─────────────────────────────────────────────────────
function ChartCard({
  title,
  description,
  metric,
  onDownloadPng,
  children,
}: {
  title: string;
  description: string;
  metric: "rmsd" | "rmsf" | "rg" | "ss" | "energy";
  onDownloadPng?: (m: typeof metric) => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          {onDownloadPng && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1.5 shrink-0"
              onClick={() => onDownloadPng(metric)}
            >
              <Download className="h-3 w-3" />
              PNG
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SimulationCharts({
  data,
  selectedFrame,
  syncEnabled,
  onFrameSelect,
  onDownloadPng,
}: SimulationChartsProps) {
  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "8px",
      padding: "8px 12px",
    },
  };

  const chartHeight = 340;
  const frameRefLine =
    selectedFrame !== undefined && syncEnabled ? selectedFrame : undefined;

  return (
    <Tabs defaultValue="rmsd" className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-4">
        <TabsTrigger value="rmsd">RMSD</TabsTrigger>
        <TabsTrigger value="rmsf">RMSF</TabsTrigger>
        <TabsTrigger value="energy">Energy</TabsTrigger>
        <TabsTrigger value="rg">Rg</TabsTrigger>
        <TabsTrigger value="ss">Sec. Struct.</TabsTrigger>
      </TabsList>

      {/* RMSD */}
      <TabsContent value="rmsd">
        <ChartCard
          title="Root Mean Square Deviation (RMSD)"
          description="Structural deviation from initial conformation over time"
          metric="rmsd"
          onDownloadPng={onDownloadPng}
        >
          {data.rmsd?.length ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart
                data={data.rmsd}
                onClick={(e) => {
                  if (e?.activePayload?.[0] && onFrameSelect) {
                    onFrameSelect(e.activePayload[0].payload.frame);
                  }
                }}
                className={onFrameSelect ? "cursor-pointer" : ""}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="frame" label={{ value: "Frame", position: "insideBottom", offset: -5 }} tick={{ fontSize: 11 }} />
                <YAxis label={{ value: "RMSD (Å)", angle: -90, position: "insideLeft", offset: 10 }} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="Frame" />} />
                <Legend />
                {frameRefLine !== undefined && (
                  <ReferenceLine x={frameRefLine} stroke="hsl(var(--primary))" strokeDasharray="4 2" strokeWidth={2} />
                )}
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} name="RMSD (Å)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="RMSD" />
          )}
        </ChartCard>
      </TabsContent>

      {/* RMSF */}
      <TabsContent value="rmsf">
        <ChartCard
          title="Root Mean Square Fluctuation (RMSF)"
          description="Per-residue flexibility across the trajectory"
          metric="rmsf"
          onDownloadPng={onDownloadPng}
        >
          {data.rmsf?.length ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={data.rmsf}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="residue" label={{ value: "Residue", position: "insideBottom", offset: -5 }} tick={{ fontSize: 11 }} />
                <YAxis label={{ value: "RMSF (Å)", angle: -90, position: "insideLeft", offset: 10 }} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="Residue" />} />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} name="RMSF (Å)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="RMSF" />
          )}
        </ChartCard>
      </TabsContent>

      {/* Energy */}
      <TabsContent value="energy">
        <ChartCard
          title="System Energy"
          description="Potential, kinetic, and total energy over simulation frames"
          metric="energy"
          onDownloadPng={onDownloadPng}
        >
          {data.energy?.length ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart
                data={data.energy}
                onClick={(e) => {
                  if (e?.activePayload?.[0] && onFrameSelect) {
                    onFrameSelect(e.activePayload[0].payload.frame);
                  }
                }}
                className={onFrameSelect ? "cursor-pointer" : ""}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="frame" label={{ value: "Frame", position: "insideBottom", offset: -5 }} tick={{ fontSize: 11 }} />
                <YAxis label={{ value: "Energy (kJ/mol)", angle: -90, position: "insideLeft", offset: 14 }} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="Frame" />} />
                <Legend />
                {frameRefLine !== undefined && (
                  <ReferenceLine x={frameRefLine} stroke="hsl(var(--primary))" strokeDasharray="4 2" strokeWidth={2} />
                )}
                <Line type="monotone" dataKey="potential" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={false} name="Potential (kJ/mol)" />
                <Line type="monotone" dataKey="kinetic" stroke="hsl(var(--chart-4))" strokeWidth={1.5} dot={false} name="Kinetic (kJ/mol)" />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--chart-5))" strokeWidth={1.5} dot={false} name="Total (kJ/mol)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Energy" />
          )}
        </ChartCard>
      </TabsContent>

      {/* Radius of Gyration */}
      <TabsContent value="rg">
        <ChartCard
          title="Radius of Gyration (Rg)"
          description="Protein compactness measure over the trajectory"
          metric="rg"
          onDownloadPng={onDownloadPng}
        >
          {data.rg?.length ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart
                data={data.rg}
                onClick={(e) => {
                  if (e?.activePayload?.[0] && onFrameSelect) {
                    onFrameSelect(e.activePayload[0].payload.frame);
                  }
                }}
                className={onFrameSelect ? "cursor-pointer" : ""}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="frame" label={{ value: "Frame", position: "insideBottom", offset: -5 }} tick={{ fontSize: 11 }} />
                <YAxis label={{ value: "Rg (Å)", angle: -90, position: "insideLeft", offset: 10 }} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="Frame" />} />
                <Legend />
                {frameRefLine !== undefined && (
                  <ReferenceLine x={frameRefLine} stroke="hsl(var(--primary))" strokeDasharray="4 2" strokeWidth={2} />
                )}
                <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={1.5} dot={false} name="Rg (Å)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Radius of Gyration" />
          )}
        </ChartCard>
      </TabsContent>

      {/* Secondary Structure */}
      <TabsContent value="ss">
        <ChartCard
          title="Secondary Structure Content"
          description="Fraction of helix, sheet, and coil per frame"
          metric="ss"
          onDownloadPng={onDownloadPng}
        >
          {data.ss?.length ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={data.ss}
                onClick={(e) => {
                  if (e?.activePayload?.[0] && onFrameSelect) {
                    onFrameSelect(e.activePayload[0].payload.frame);
                  }
                }}
                className={onFrameSelect ? "cursor-pointer" : ""}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="frame" label={{ value: "Frame", position: "insideBottom", offset: -5 }} tick={{ fontSize: 11 }} />
                <YAxis label={{ value: "Count", angle: -90, position: "insideLeft", offset: 10 }} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip xLabel="Frame" />} />
                <Legend />
                <Bar dataKey="helix" stackId="ss" fill="#6366f1" name="Helix" />
                <Bar dataKey="sheet" stackId="ss" fill="#22d3ee" name="Sheet" />
                <Bar dataKey="coil" stackId="ss" fill="#a3a3a3" name="Coil" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="Secondary Structure" />
          )}
        </ChartCard>
      </TabsContent>
    </Tabs>
  );
}
