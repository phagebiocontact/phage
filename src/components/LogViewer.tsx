import { useEffect, useRef } from "react";
import { ScrollText, Terminal } from "lucide-react";

interface LogViewerProps {
  content: string;
  maxHeight?: string;
  autoScroll?: boolean;
  isLive?: boolean;
}

export function LogViewer({
  content,
  maxHeight = "400px",
  autoScroll = true,
  isLive = false,
}: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    });
    return () => cancelAnimationFrame(id);
  });

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
    <div className="rounded-xl overflow-hidden font-mono text-xs bg-muted/30 border border-border/40"
      style={{ boxShadow: "0 4px 24px hsl(var(--primary) / 0.06)" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/40">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary/70" />
        </div>
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <ScrollText className="h-3 w-3 text-primary/50" />
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
            simulation.log
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
              <span className="text-[10px] text-secondary tracking-wider uppercase">live</span>
            </>
          )}
          <span className="text-[10px] text-muted-foreground/50">{lines.length} lines</span>
        </div>
      </div>

      {/* Log lines */}
      <div
        ref={scrollRef}
        className="overflow-y-auto"
        style={{ maxHeight: `calc(${maxHeight} - 40px)` }}
      >
        <div className="p-4 space-y-0.5">
          {lines.map((line, i) => {
            let lineClass = "text-muted-foreground";
            let prefix = "";

            if (/\[ERROR\]|error|Error|ERROR/.test(line)) {
              lineClass = "text-destructive";
              prefix = "✗ ";
            } else if (/\[WARNING\]|warn|WARN|warning/i.test(line)) {
              lineClass = "text-amber-400 dark:text-amber-300";
              prefix = "⚠ ";
            } else if (/\[INFO\]|INFO|info/.test(line) || /Starting|Completed|Loading|Loaded|Saving/i.test(line)) {
              lineClass = "text-primary";
              prefix = "› ";
            } else if (/\[RMSD\]|\[RMSF\]|\[Rg\]|\[SASA\]|\[DSSP\]/.test(line)) {
              lineClass = "text-secondary";
              prefix = "⟡ ";
            } else if (/\d+%|step|Step/.test(line)) {
              lineClass = "text-accent";
              prefix = "✓ ";
            }

            const isLast = i === lines.length - 1;
            const key = `${i}-${line.slice(0, 20)}`;

            return (
              <div key={key} className="flex gap-2 leading-5 group">
                <span className="select-none text-muted-foreground/20 w-8 text-right shrink-0 group-hover:text-muted-foreground/40 transition-colors">
                  {i + 1}
                </span>
                <span className={`${lineClass} break-all`}>
                  <span className="opacity-50">{prefix}</span>
                  {line || " "}
                  {isLast && isLive && (
                    <span
                      className="inline-block w-2 h-[0.85em] bg-secondary ml-0.5 align-middle animate-pulse"
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
