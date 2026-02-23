import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	Box,
	FlaskConical,
	Palette,
	RotateCcw,
	Shield,
	Sparkles,
} from "lucide-react";
import {
	motion,
	useMotionTemplate,
	useMotionValue,
	useSpring,
} from "motion/react";
import { lazy, Suspense, useId, useRef, useState } from "react";
import type { MolstarViewerRef } from "@/components/MolstarViewer";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";

const MolstarViewer = lazy(() => import("@/components/MolstarViewer"));

export const Route = createFileRoute("/")(
	{
		component: Index,
	},
);

/* ─── Visual Tour Sections ─── */
const tourSections = [
	{
		tag: "Upload",
		title: "Drag. Drop. Simulate.",
		description: "Upload PDB or SDF files directly in your browser. Auto-detected chains, validated geometry, topology prepared — zero CLI work.",
		placeholder: "simulation_upload",
		align: "left" as const,
	},
	{
		tag: "Configure",
		title: "One-Click Launch on H100 GPUs",
		description: "Set simulation length, temperature, pressure, and force field. One click allocates a GPU, builds the solvated system, and starts production.",
		placeholder: "simulation_config",
		align: "right" as const,
	},
	{
		tag: "Monitor",
		title: "Real-Time Progress Tracking",
		description: "Watch potential energy, temperature, and density converge live. No SSH tunnels, no SLURM — just open your browser.",
		placeholder: "job_monitoring",
		align: "left" as const,
	},
	{
		tag: "Analyze",
		title: "Publication-Ready Analysis",
		description: "Automated RMSD, RMSF, Rg, SASA, and DSSP plots. Interactive Mol* trajectory viewer. Download SVGs directly into your manuscript.",
		placeholder: "analysis_results",
		align: "right" as const,
	},
	{
		tag: "Collaborate",
		title: "Access Anywhere. Share Instantly.",
		description: "Results stored securely in the cloud. Access from any device. Share simulation data with collaborators — no file transfer hassles.",
		placeholder: "collaboration_share",
		align: "left" as const,
	},
];

function Index() {
	const heroRef = useRef<HTMLDivElement>(null);
	const underlineId = useId();
	const molstarRef = useRef<MolstarViewerRef>(null);
	const [currentRepr, setCurrentRepr] = useState<
		"cartoon" | "ball-and-stick" | "surface"
	>("cartoon");
	const [currentColor, setCurrentColor] = useState<
		"chain" | "element" | "rainbow"
	>("chain");

	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const { left, top, width, height } =
			e.currentTarget.getBoundingClientRect();
		mouseX.set((e.clientX - left) / width);
		mouseY.set((e.clientY - top) / height);
	};

	const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
	const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
	const background = useMotionTemplate`radial-gradient(600px circle at ${springX}% ${springY}%, hsl(var(--primary) / 0.12), transparent 40%)`;

	return (
		<div className="fusion-canvas min-h-screen bg-background overflow-x-hidden">
			{/* ════════════════════ HERO ════════════════════ */}
			<section
				ref={heroRef}
				onMouseMove={handleMouseMove}
				className="relative overflow-hidden pt-28 pb-16 lg:pt-40 lg:pb-24 min-h-[90vh] flex items-center"
			>
				<div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none" />
				<motion.div
					className="absolute inset-0 pointer-events-none"
					style={{ background }}
				/>

				<motion.div
					animate={{ y: [0, -20, 0], opacity: [0.15, 0.25, 0.15] }}
					transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
					className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"
				/>
				<motion.div
					animate={{ y: [0, 30, 0], opacity: [0.1, 0.2, 0.1] }}
					transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1 }}
					className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none"
				/>

				<div className="container relative mx-auto px-4">
					<div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
						{/* Left Content */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							className="text-left order-2 lg:order-1"
						>
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2.5 font-medium text-primary text-sm backdrop-blur-sm"
							>
								<span className="relative flex h-2 w-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
									<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
								</span>
								Cloud Molecular Dynamics
								<Sparkles className="h-4 w-4 text-primary/70" />
							</motion.div>

							<motion.h1
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.3 }}
								className="mb-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
							>
								Simulate Proteins{" "}
								<br className="hidden sm:block" />
								<span className="relative inline-block">
									<span className="text-gradient animate-gradient-x">
										at Scale
									</span>
									<motion.svg
										initial={{ pathLength: 0, opacity: 0 }}
										animate={{ pathLength: 1, opacity: 1 }}
										transition={{ duration: 1, delay: 0.5 }}
										className="absolute -bottom-2 left-0 w-full"
										viewBox="0 0 300 12"
										fill="none"
										aria-hidden="true"
									>
										<title>Decorative underline</title>
										<path
											d="M2 10C50 4 100 2 150 6C200 10 250 4 298 2"
											stroke={`url(#${underlineId})`}
											strokeWidth="4"
											strokeLinecap="round"
										/>
										<defs>
											<linearGradient id={underlineId} x1="0%" y1="0%" x2="100%" y2="0%">
												<stop offset="0%" stopColor="hsl(var(--primary))" />
												<stop offset="100%" stopColor="hsl(var(--secondary))" />
											</linearGradient>
										</defs>
									</motion.svg>
								</span>
							</motion.h1>

							<motion.p
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.4 }}
								className="mb-8 max-w-lg text-muted-foreground text-base sm:text-lg leading-relaxed"
							>
								Upload a PDB. Configure parameters. Get publication-quality MD analysis — powered by cloud GPUs. No infrastructure required.
							</motion.p>

							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.5 }}
								className="flex flex-col items-start gap-4 sm:flex-row"
							>
								<NavLink href="/auth">
									<Button
										size="lg"
										className="group h-12 sm:h-14 w-full sm:w-auto min-w-[180px] bg-gradient-primary text-base sm:text-lg font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105"
									>
										Start Free — 5 Credits
										<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
									</Button>
								</NavLink>
								<NavLink href="/features">
									<Button
										size="lg"
										variant="outline"
										className="group h-12 sm:h-14 w-full sm:w-auto min-w-[180px] text-base sm:text-lg font-semibold border-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
									>
										Explore Features
									</Button>
								</NavLink>
							</motion.div>
						</motion.div>

						{/* Right — Mol* Viewer */}
						<motion.div
							initial={{ opacity: 0, x: 50 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.8, delay: 0.2 }}
							className="relative order-1 lg:order-2"
						>
							<div className="relative aspect-[4/3] w-full max-w-[600px] mx-auto">
								<div className="absolute inset-0 rounded-3xl bg-primary/20 blur-3xl -z-10 animate-pulse" />
								<motion.div
									whileHover={{ rotateY: 2, rotateX: -2 }}
									transition={{ type: "spring", stiffness: 300 }}
									className="relative h-full w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-primary/20 bg-card/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] group"
									style={{ perspective: 1000, transformStyle: "preserve-3d" }}
								>
									<div className="absolute inset-x-0 top-0 h-8 sm:h-10 bg-white/5 backdrop-blur-sm flex items-center px-4 sm:px-6 gap-2 z-20">
										<div className="flex gap-1.5">
											<div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/20" />
											<div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/20" />
											<div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500/20" />
										</div>
										<div className="flex-1 text-center font-mono text-[9px] sm:text-[10px] text-white/40 uppercase tracking-widest">
											nucleosome_1aoi
										</div>
									</div>

									<div className="h-full w-full pt-8 sm:pt-10">
										<Suspense
											fallback={
												<div className="w-full h-full flex items-center justify-center">
													<div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
												</div>
											}
										>
											<MolstarViewer
												ref={molstarRef}
												pdbId="1AOI"
												className="w-full h-full"
											/>
										</Suspense>
									</div>
								</motion.div>

								<div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
									<motion.button
										whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
										type="button"
										onClick={() => {
											const next = currentRepr === "cartoon" ? "ball-and-stick" : currentRepr === "ball-and-stick" ? "surface" : "cartoon";
											setCurrentRepr(next);
											molstarRef.current?.setRepresentation(next);
										}}
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/60 backdrop-blur-sm border border-primary/20 text-xs font-medium text-foreground/80 hover:bg-primary/10 hover:border-primary/40 transition-colors"
									>
										<Box className="w-3.5 h-3.5" />
										<span className="capitalize">{currentRepr.replace("-", " ")}</span>
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
										type="button"
										onClick={() => {
											const next = currentColor === "chain" ? "element" : currentColor === "element" ? "rainbow" : "chain";
											setCurrentColor(next);
											molstarRef.current?.setColor(next);
										}}
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/60 backdrop-blur-sm border border-secondary/20 text-xs font-medium text-foreground/80 hover:bg-secondary/10 hover:border-secondary/40 transition-colors"
									>
										<Palette className="w-3.5 h-3.5" />
										<span className="capitalize">{currentColor}</span>
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
										type="button"
										onClick={() => molstarRef.current?.resetZoom()}
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/60 backdrop-blur-sm border border-accent/20 text-xs font-medium text-foreground/80 hover:bg-accent/10 hover:border-accent/40 transition-colors"
									>
										<RotateCcw className="w-3.5 h-3.5" />
										<span>Reset</span>
									</motion.button>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* ════════════════════ VISUAL TOUR ════════════════════ */}
			{tourSections.map((section, idx) => (
				<section
					key={section.tag}
					className="py-8 lg:py-12 relative"
				>
					{idx === 0 && (
						<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
					)}
					<div className="container relative mx-auto px-4">
						<div className={`grid lg:grid-cols-2 gap-6 lg:gap-10 items-center ${section.align === "right" ? "lg:direction-rtl" : ""}`}>
							{/* Image Card */}
							<motion.div
								initial={{ opacity: 0, x: section.align === "left" ? -40 : 40 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true, margin: "-50px" }}
								transition={{ duration: 0.6 }}
								className={`${section.align === "right" ? "lg:order-2" : "lg:order-1"}`}
							>
								<motion.div
									whileHover={{ y: -8, rotateY: section.align === "left" ? 3 : -3, rotateX: -2 }}
									transition={{ type: "spring", stiffness: 200, damping: 20 }}
									className="relative group"
									style={{ perspective: 1200, transformStyle: "preserve-3d" }}
								>
									<div className="absolute -inset-4 rounded-3xl bg-primary/8 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
									<div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-border/30 bg-background/40 backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.3)] group-hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-shadow duration-500">
										<div className="absolute inset-0 bg-[radial-gradient(#ffffff06_1px,transparent_1px)] [background-size:16px_16px]" />
										<div className="absolute inset-x-0 top-0 h-8 bg-white/5 backdrop-blur-sm flex items-center px-4 gap-2 z-10">
											<div className="flex gap-1.5">
												<div className="w-2 h-2 rounded-full bg-red-500/30" />
												<div className="w-2 h-2 rounded-full bg-yellow-500/30" />
												<div className="w-2 h-2 rounded-full bg-green-500/30" />
											</div>
											<span className="flex-1 text-center text-[9px] font-mono text-white/30 uppercase tracking-widest">{section.placeholder}</span>
										</div>
										<div className="flex items-center justify-center h-full pt-8">
											<div className="text-center">
												<div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
													<FlaskConical className="w-7 h-7 text-primary/50" />
												</div>
												<span className="text-xs text-muted-foreground/40 font-mono">screenshot placeholder</span>
											</div>
										</div>
									</div>
								</motion.div>
							</motion.div>

							{/* Text Content */}
							<motion.div
								initial={{ opacity: 0, x: section.align === "left" ? 40 : -40 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true, margin: "-50px" }}
								transition={{ duration: 0.6, delay: 0.15 }}
								className={`${section.align === "right" ? "lg:order-1 lg:text-right" : "lg:order-2"}`}
							>
								<span className="inline-block mb-3 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider border border-primary/20">
									{section.tag}
								</span>
								<h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl mb-4 leading-tight">
									{section.title}
								</h2>
								<p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg">
									{section.description}
								</p>
							</motion.div>
						</div>
					</div>
					{/* Section divider */}
					<div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
				</section>
			))}

			{/* ════════════════════ TRUST STRIP ════════════════════ */}
			<section className="py-10 lg:py-14 relative">
				<div className="container relative mx-auto px-4 text-center">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="mb-8"
					>
						<h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl mb-3">
							Your Research Data is{" "}
							<span className="text-gradient-secondary">Confidential</span>
						</h2>
						<p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
							Unpublished results are sensitive IP. Security is a core design principle.
						</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						transition={{ delay: 0.2 }}
						className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-muted-foreground/60 text-xs sm:text-sm"
					>
						{["AES-256 Encryption", "TLS 1.3", "SOC 2 Infrastructure", "Zero-Retention GPU", "Per-User Isolation"].map((badge) => (
							<div key={badge} className="flex items-center gap-2">
								<Shield className="w-4 h-4" />
								<span>{badge}</span>
							</div>
						))}
					</motion.div>
				</div>
				<div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
			</section>

			{/* ════════════════════ CTA ════════════════════ */}
			<section className="relative py-20 lg:py-28 overflow-hidden">
				<motion.div
					animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
					transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
					className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none"
				/>

				<div className="container relative mx-auto px-4 text-center">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="max-w-2xl mx-auto space-y-6"
					>
						<h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl">
							Ready to Accelerate Your{" "}
							<span className="text-gradient">Research</span>?
						</h2>
						<p className="text-muted-foreground text-base sm:text-lg">
							Start with 5 free credits. No credit card required.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<NavLink href="/auth">
								<Button
									size="lg"
									className="group h-12 sm:h-14 px-8 sm:px-10 bg-gradient-primary text-base sm:text-lg font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105"
								>
									Get Started Free
									<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
								</Button>
							</NavLink>
							<NavLink href="/pricing">
								<Button
									size="lg"
									variant="outline"
									className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-medium border-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300"
								>
									View Pricing
								</Button>
							</NavLink>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}
