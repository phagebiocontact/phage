import { createFileRoute } from "@tanstack/react-router";
import {
	Activity,
	ArrowRight,
	BarChart3,
	CheckCircle2,
	Cloud,
	Cpu,
	Database,
	Globe,
	Lock,
	Server,
	Share2,
	Shield,
	ShieldCheck,
	Zap,
	X as XIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
	component: Features,
});

const containerVariants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.5 },
	},
};

/* ─── Comparison Data ─── */
const comparisonRows = [
	{
		metric: "Hardware Setup",
		traditional: "Purchase & maintain GPU workstations ($10k–$50k)",
		phage: "Zero hardware — cloud GPUs on demand",
		highlightTraditional: ["$10k–$50k"],
		highlightPhage: ["Zero hardware", "on demand"],
	},
	{
		metric: "Software Installation",
		traditional: "Manual GROMACS/AMBER install, CUDA drivers, dependency hell",
		phage: "Pre-configured OpenMM + GAFF2/OpenFF stack",
		highlightTraditional: ["dependency hell"],
		highlightPhage: ["Pre-configured"],
	},
	{
		metric: "Force Field Parametrization",
		traditional: "Manual ACPYPE/antechamber pipeline (hours of debugging)",
		phage: "Automated in < 30 seconds",
		highlightTraditional: ["hours of debugging"],
		highlightPhage: ["< 30 seconds"],
	},
	{
		metric: "Solvation & Equilibration",
		traditional: "Write topology, solvate, ionize, minimize manually",
		phage: "One-click — system auto-prepared",
		highlightTraditional: ["manually"],
		highlightPhage: ["One-click", "auto-prepared"],
	},
	{
		metric: "Job Scheduling",
		traditional: "SLURM scripts, queue management, SSH tunnels",
		phage: "Submit from browser, instant GPU allocation",
		highlightTraditional: ["SLURM scripts", "SSH tunnels"],
		highlightPhage: ["instant GPU allocation"],
	},
	{
		metric: "Time to First Result",
		traditional: "Days to weeks (setup + simulation)",
		phage: "Minutes (upload PDB → results)",
		highlightTraditional: ["Days to weeks"],
		highlightPhage: ["Minutes"],
	},
	{
		metric: "Analysis Pipeline",
		traditional: "Python scripts for RMSD/RMSF/Rg, manual plotting",
		phage: "Built-in RMSD, RMSF, Rg, SASA, DSSP — auto-plotted",
		highlightTraditional: ["manual plotting"],
		highlightPhage: ["Built-in", "auto-plotted"],
	},
	{
		metric: "Cost Model",
		traditional: "$10k+ upfront + electricity + maintenance",
		phage: "Pay-per-nanosecond (10 credits = $1)",
		highlightTraditional: ["$10k+ upfront"],
		highlightPhage: ["Pay-per-nanosecond", "$1"],
	},
];

/* ─── Accuracy Data ─── */
const accuracyMetrics = [
	{ label: "Force Fields", value: "AMBER / OpenFF", description: "Industry-standard protein and small-molecule force fields with automated parametrization" },
	{ label: "Simulation Engine", value: "OpenMM", description: "CUDA-accelerated engine with GPU-optimized kernels for maximum throughput" },
	{ label: "Equilibration", value: "NVT + NPT", description: "Full equilibration pipeline — energy minimization, NVT temperature, NPT pressure coupling" },
	{ label: "Analysis Output", value: "RMSD · RMSF · Rg", description: "Automated structural analysis with SASA, DSSP secondary structure, and hydrogen bonding" },
	{ label: "Export Formats", value: "PDB · XTC · SVG", description: "Download raw trajectories, coordinates, and publication-quality vector plots" },
	{ label: "Timestep", value: "HMR-enabled", description: "Hydrogen Mass Repartitioning for larger timesteps, increasing simulation throughput" },
];

/* ─── Security Features ─── */
const securityFeatures = [
	{
		icon: Lock,
		title: "End-to-End Encryption",
		description: "AES-256 encryption for all data at rest. TLS 1.3 for data in transit. PDB files and results never leave encrypted channels.",
	},
	{
		icon: ShieldCheck,
		title: "Zero-Retention Policy",
		description: "Simulation files processed in ephemeral containers. No data persists on GPU nodes after job completion. You own your data.",
	},
	{
		icon: Server,
		title: "Isolated Compute",
		description: "Each simulation runs in an isolated container with dedicated GPU. No shared memory, no cross-tenant data leakage.",
	},
	{
		icon: Cloud,
		title: "SOC 2 Infrastructure",
		description: "Built on Convex (SOC 2 Type II) and Modal Labs. Enterprise-grade access controls and audit logging.",
	},
];

/* ─── Platform Features ─── */
const features = [
	{
		icon: <Cloud className="h-8 w-8" />,
		title: "Cloud Native",
		description: "Run simulations on scalable cloud infrastructure. No local hardware needed.",
		accentClass: "bg-gradient-primary",
	},
	{
		icon: <Cpu className="h-8 w-8" />,
		title: "GPU Acceleration",
		description: "Powered by NVIDIA H100 GPUs for maximum throughput.",
		accentClass: "bg-gradient-secondary",
	},
	{
		icon: <Database className="h-8 w-8" />,
		title: "Automated Parametrization",
		description: "Auto-generate force field parameters for small molecules using GAFF2/OpenFF.",
		accentClass: "bg-primary",
	},
	{
		icon: <Activity className="h-8 w-8" />,
		title: "Real-time Monitoring",
		description: "Watch simulation progress with live energetic plots and trajectory streaming.",
		accentClass: "bg-secondary",
	},
	{
		icon: <BarChart3 className="h-8 w-8" />,
		title: "Advanced Analysis",
		description: "Built-in RMSD, RMSF, Rg, SASA, DSSP with downloadable SVG plots.",
		accentClass: "bg-accent",
	},
	{
		icon: <Lock className="h-8 w-8" />,
		title: "Secure Storage",
		description: "AES-256 encrypted at rest and TLS 1.3 in transit. Per-user file isolation.",
		accentClass: "bg-gradient-secondary",
	},
	{
		icon: <Globe className="h-8 w-8" />,
		title: "Access Anywhere",
		description: "Run and monitor simulations from any browser. No CLI or SSH required.",
		accentClass: "bg-gradient-primary",
	},
	{
		icon: <Share2 className="h-8 w-8" />,
		title: "Collaboration",
		description: "Share results with collaborators. Download trajectories and analysis for any downstream tool.",
		accentClass: "bg-secondary",
	},
	{
		icon: <Zap className="h-8 w-8" />,
		title: "Pay-Per-Use",
		description: "No subscriptions. Credits consumed per nanosecond of simulation time. 5 free credits on signup.",
		accentClass: "bg-accent",
	},
];

function highlightText(text: string, highlights: string[]) {
	if (!highlights.length) return text;
	let result = text;
	for (const h of highlights) {
		result = result.replace(h, `<strong class="text-foreground font-semibold">${h}</strong>`);
	}
	return result;
}

function Features() {
	return (
		<div className="fusion-canvas min-h-screen bg-background overflow-x-hidden">
			{/* Hero */}
			<section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 overflow-hidden">
				<div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none" />
				<motion.div
					animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
					transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
					className="absolute top-20 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none"
				/>
				<div className="container relative mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="max-w-4xl mx-auto text-center"
					>
						<motion.span
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="inline-block mb-4 px-5 py-2.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium"
						>
							Platform Features
						</motion.span>
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="mb-6 font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-tight"
						>
							Everything for{" "}
							<span className="relative inline-block">
								<span className="text-gradient-secondary">Modern MD Research</span>
								<motion.svg
									initial={{ pathLength: 0, opacity: 0 }}
									animate={{ pathLength: 1, opacity: 1 }}
									transition={{ duration: 1, delay: 0.8 }}
									className="absolute -bottom-2 left-0 w-full"
									viewBox="0 0 300 12"
									fill="none"
									aria-hidden="true"
								>
									<title>Decorative underline</title>
									<path
										d="M2 10C50 4 100 2 150 6C200 10 250 4 298 2"
										stroke="url(#feat-ul)"
										strokeWidth="4"
										strokeLinecap="round"
									/>
									<defs>
										<linearGradient id="feat-ul" x1="0%" y1="0%" x2="100%" y2="0%">
											<stop offset="0%" stopColor="hsl(var(--secondary))" />
											<stop offset="100%" stopColor="hsl(var(--primary))" />
										</linearGradient>
									</defs>
								</motion.svg>
							</span>
						</motion.h1>
						<motion.p
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
							className="text-muted-foreground text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto"
						>
							Comparison tables, accuracy benchmarks, and security guarantees — all in one place.
						</motion.p>
					</motion.div>
				</div>
			</section>

			{/* Video/Demo Section */}
			<section className="py-12 border-y border-border/30">
				<div className="container mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.97 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="max-w-5xl mx-auto"
					>
						<div className="relative aspect-video rounded-2xl overflow-hidden border border-border/50 shadow-2xl bg-black">
							<iframe
								className="absolute inset-0 w-full h-full"
								src="https://www.youtube.com/embed/d95J8yzvjbQ"
								title="Phage Platform Demo"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowFullScreen
							/>
						</div>
					</motion.div>
				</div>
			</section>

			{/* ════════════ COMPARISON TABLE ════════════ */}
			<section className="py-16 lg:py-24 relative">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
				<div className="container relative mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="mb-10 text-center"
					>
						<span className="inline-block mb-3 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
							Why Migrate
						</span>
						<h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3">
							Traditional Setup vs{" "}
							<span className="text-gradient">Phage</span>
						</h2>
						<p className="mx-auto max-w-xl text-muted-foreground text-sm sm:text-base">
							Stop spending weeks on infrastructure. Every hour debugging CUDA drivers is an hour not spent on research.
						</p>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.7 }}
						className="max-w-5xl mx-auto overflow-hidden rounded-2xl border border-border bg-background dark:bg-card/40 backdrop-blur-sm shadow-xl"
					>
						{/* Table Header — Desktop */}
						<div className="hidden sm:grid grid-cols-[1.2fr_1fr_1fr] text-sm font-semibold">
							<div className="px-5 py-4 border-b border-r border-border bg-muted/40 text-muted-foreground font-display">
								Metric
							</div>
							<div className="px-5 py-4 border-b border-r border-border bg-red-500/5 text-red-600 dark:text-red-400 font-display flex items-center gap-2">
								<XIcon className="w-4 h-4" /> Traditional
							</div>
							<div className="px-5 py-4 border-b border-border bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-display flex items-center gap-2">
								<CheckCircle2 className="w-4 h-4" /> Phage
							</div>
						</div>

						{/* Table Rows */}
						{comparisonRows.map((row, i) => (
							<motion.div
								key={row.metric}
								initial={{ opacity: 0, x: -10 }}
								whileInView={{ opacity: 1, x: 0 }}
								viewport={{ once: true }}
								transition={{ delay: i * 0.04 }}
								className={`text-sm group hover:bg-muted/30 transition-colors ${i < comparisonRows.length - 1 ? "border-b border-border" : ""}`}
							>
								{/* Desktop */}
								<div className="hidden sm:grid grid-cols-[1.2fr_1fr_1fr]">
									<div className="px-5 py-3.5 border-r border-border font-semibold text-foreground">
										{row.metric}
									</div>
									<div
										className="px-5 py-3.5 border-r border-border text-muted-foreground"
										// biome-ignore lint: This is safe static content
										dangerouslySetInnerHTML={{ __html: highlightText(row.traditional, row.highlightTraditional) }}
									/>
									<div
										className="px-5 py-3.5 text-foreground"
										// biome-ignore lint: This is safe static content
										dangerouslySetInnerHTML={{ __html: highlightText(row.phage, row.highlightPhage) }}
									/>
								</div>
								{/* Mobile */}
								<div className="sm:hidden p-4 space-y-2">
									<div className="font-semibold text-foreground text-sm">{row.metric}</div>
									<div className="flex items-start gap-2 text-xs">
										<XIcon className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
										<span
											className="text-muted-foreground"
											// biome-ignore lint: This is safe static content
											dangerouslySetInnerHTML={{ __html: highlightText(row.traditional, row.highlightTraditional) }}
										/>
									</div>
									<div className="flex items-start gap-2 text-xs">
										<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
										<span
											className="text-foreground"
											// biome-ignore lint: This is safe static content
											dangerouslySetInnerHTML={{ __html: highlightText(row.phage, row.highlightPhage) }}
										/>
									</div>
								</div>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* ════════════ FEATURE GRID ════════════ */}
			<section className="py-16 lg:py-24 relative">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
				<div className="container relative mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="mb-10 text-center"
					>
						<h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl mb-3">
							Platform <span className="text-gradient">Capabilities</span>
						</h2>
					</motion.div>
					<motion.div
						variants={containerVariants}
						initial="hidden"
						whileInView="show"
						viewport={{ once: true }}
						className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto"
					>
						{features.map((feature) => (
							<motion.div key={feature.title} variants={itemVariants}
								whileHover={{ y: -6 }}
								className="group h-full rounded-2xl border border-border/30 bg-background/30 backdrop-blur-sm p-6 sm:p-8 overflow-hidden hover:border-primary/30 transition-all duration-300"
							>
								<div
									className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.accentClass} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
								>
									{feature.icon}
								</div>
								<h3 className="text-lg font-display font-bold mb-2 group-hover:text-primary transition-colors">
									{feature.title}
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">
									{feature.description}
								</p>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* ════════════ ACCURACY & VALIDATION ════════════ */}
			<section className="py-16 lg:py-24 relative">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
				<div className="container relative mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="mb-10 text-center"
					>
						<span className="inline-block mb-3 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium border border-accent/20">
							Accuracy & Validation
						</span>
						<h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl mb-3">
							Publication-Quality <span className="text-gradient">Accuracy</span>
						</h2>
						<p className="mx-auto max-w-xl text-muted-foreground text-sm sm:text-base">
							Every simulation uses validated force fields with automated energy minimization, NVT and NPT equilibration before production.
						</p>
					</motion.div>

					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
						{accuracyMetrics.map((item) => (
							<motion.div
								key={item.label}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								className="group p-5 rounded-2xl border border-border/30 bg-background/30 backdrop-blur-sm hover:border-accent/30 transition-all duration-300"
							>
								<div className="text-gradient font-display font-bold text-2xl sm:text-3xl mb-1">{item.value}</div>
								<div className="font-display font-semibold text-foreground/90 text-sm mb-2">{item.label}</div>
								<p className="text-muted-foreground text-xs leading-relaxed">{item.description}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ════════════ SECURITY ════════════ */}
			<section className="py-16 lg:py-24 relative">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
				<div className="container relative mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="mb-10 text-center"
					>
						<span className="inline-block mb-3 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium border border-secondary/20">
							<Lock className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
							Security & Confidentiality
						</span>
						<h2 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl mb-3">
							Your Research Data is{" "}
							<span className="text-gradient-secondary">Protected</span>
						</h2>
					</motion.div>

					<div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
						{securityFeatures.map((feature) => {
							const Icon = feature.icon;
							return (
								<motion.div
									key={feature.title}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									className="group p-5 rounded-2xl border border-border/30 bg-background/30 backdrop-blur-sm hover:border-secondary/30 transition-all duration-300"
								>
									<div className="flex items-start gap-4">
										<div className="flex-shrink-0 w-11 h-11 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
											<Icon className="w-5 h-5 text-secondary" />
										</div>
										<div>
											<h3 className="font-display font-bold text-base mb-1.5">{feature.title}</h3>
											<p className="text-muted-foreground text-xs leading-relaxed">{feature.description}</p>
										</div>
									</div>
								</motion.div>
							);
						})}
					</div>

					{/* Trust Badges */}
					<motion.div
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-muted-foreground/50 text-xs sm:text-sm"
					>
						{["AES-256", "TLS 1.3", "SOC 2", "Zero-Retention", "Isolation"].map((badge) => (
							<div key={badge} className="flex items-center gap-2">
								<Shield className="w-4 h-4" />
								<span>{badge}</span>
							</div>
						))}
					</motion.div>
				</div>
			</section>

			{/* ════════════ TECH STACK removed ════════════ */}

			{/* ════════════ WORKFLOW ════════════ */}
			<section className="py-16 lg:py-24 relative overflow-hidden">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
				<div className="container relative mx-auto px-4">
					<div className="max-w-4xl mx-auto">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							className="text-center mb-10"
						>
							<span className="inline-block mb-3 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
								How It Works
							</span>
							<h2 className="font-bold text-2xl sm:text-3xl md:text-4xl mb-3">
								Simple <span className="text-gradient">3-Step Workflow</span>
							</h2>
						</motion.div>

						<motion.div
							variants={containerVariants}
							initial="hidden"
							whileInView="show"
							viewport={{ once: true }}
							className="space-y-5"
						>
							{[
								{
									step: "01",
									title: "Upload Your Structure",
									description: "PDB for proteins, SDF for ligands. Auto-validated geometry and topology.",
									accentClass: "bg-gradient-primary",
								},
								{
									step: "02",
									title: "Configure & Launch",
									description: "Set parameters or use presets. One click to GPU allocation, solvation, and production run.",
									accentClass: "bg-gradient-secondary",
								},
								{
									step: "03",
									title: "Analyze & Download",
									description: "Auto-generated analysis plots. 3D trajectory viewer. SVG export for publications.",
									accentClass: "bg-primary",
								},
							].map((item) => (
								<motion.div
									key={item.step}
									variants={itemVariants}
									whileHover={{ x: 8 }}
									className="group flex gap-5 p-5 rounded-2xl transition-colors duration-300 border border-transparent hover:border-border/30 hover:bg-background/30 backdrop-blur-sm"
								>
									<div
										className={`flex-shrink-0 w-14 h-14 rounded-2xl ${item.accentClass} flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform group-hover:scale-110`}
									>
										{item.step}
									</div>
									<div>
										<h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
											{item.title}
										</h3>
										<p className="text-muted-foreground text-sm">
											{item.description}
										</p>
									</div>
								</motion.div>
							))}
						</motion.div>
					</div>
				</div>
			</section>

			{/* ════════════ CTA ════════════ */}
			<section className="relative py-20 lg:py-28 overflow-hidden">
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
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
						className="max-w-2xl mx-auto space-y-6"
					>
						<h2 className="font-bold text-3xl sm:text-4xl lg:text-5xl">
							Ready to Get <span className="text-gradient">Started</span>?
						</h2>
						<p className="text-muted-foreground text-base sm:text-lg">
							Join researchers who trust Phage for their simulations.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<NavLink href="/auth">
								<Button
									size="lg"
									className="group h-12 sm:h-14 px-8 sm:px-10 bg-gradient-primary text-base sm:text-lg font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105"
								>
									Start Free Trial
									<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
								</Button>
							</NavLink>
							<NavLink href="/pricing">
								<Button
									size="lg"
									variant="outline"
									className="h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg font-medium border-2 hover:bg-primary/5"
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
