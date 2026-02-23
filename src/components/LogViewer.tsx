import { useLayoutEffect, useRef } from "react";
import { ScrollText, Terminal } from "lucide-react";

interface LogViewerProps {
  content: string;
  maxHeight?: string;
  autoScroll?: boolean;
  isLive?: boolean;
  lineCount?: number;
}

export function LogViewer({
  content,
  maxHeight = "400px",
  autoScroll = true,
  isLive = false,
}: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    const raf = requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (!node) return;
      node.scrollTop = node.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [content, autoScroll]);

  const lines = content ? content.split("\n") : [];

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <Terminal className="h-10 w-10 mb-3 opacity-20" />
        <p className="text-sm font-mono">No log data available.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden font-mono text-xs"
      style={{
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1117 100%)",
        border: "1px solid rgba(99,102,241,0.2)",
        boxShadow: "0 0 0 1px rgba(99,102,241,0.05), 0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(99,102,241,0.15)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <span className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <ScrollText className="h-3 w-3 text-indigo-400/60" />
          <span className="text-[10px] text-indigo-400/60 tracking-widest uppercase">
            simulation.log
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 tracking-wider uppercase">live</span>
            </>
          )}
          <span className="text-[10px] text-white/20">{lines.length} lines</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: `calc(${maxHeight} - 40px)` }}
      >
        <div className="p-4 space-y-0.5">
          {lines.map((line, i) => {
            let lineClass = "text-slate-400";
            let prefix = "";
            if (/\[ERROR\]|error|Error|ERROR/.test(line)) {
              lineClass = "text-red-400";
              prefix = "✗ ";
            } else if (/\[WARNING\]|warn|WARN|warning/i.test(line)) {
              lineClass = "text-amber-400";
              prefix = "⚠ ";
            } else if (/\[INFO\]|INFO|info/.test(line) || /Starting|Completed|Loading|Loaded|Saving/i.test(line)) {
              lineClass = "text-indigo-300";
              prefix = "› ";
            } else if (/\[RMSD\]|\[RMSF\]|\[Rg\]|\[SASA\]|\[DSSP\]/.test(line)) {
              lineClass = "text-cyan-400";
              prefix = "⟡ ";
            } else if (/\d+%|step|Step/.test(line)) {
              lineClass = "text-green-400";
              prefix = "✓ ";
            }

            const isLast = i === lines.length - 1;
            const key = `${i}-${line.slice(0, 20)}`;

            return (
              <div key={key} className="flex gap-2 leading-5 group">
                <span className="select-none text-white/10 w-8 text-right shrink-0 group-hover:text-white/30 transition-colors">
                  {i + 1}
                </span>
                <span className={`${lineClass} break-all`}>
                  <span className="opacity-50">{prefix}</span>
                  {line || " "}
                  {isLast && isLive && (
                    <span
                      className="inline-block w-2 h-[0.85em] bg-emerald-400 ml-0.5 align-middle animate-pulse"
                      style={{ animationDuration: "1s" }}
                    />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
