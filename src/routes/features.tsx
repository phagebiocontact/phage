import { createFileRoute } from "@tanstack/react-router";
import {
	Activity,
	ArrowRight,
	BarChart3,
	Cloud,
	Cpu,
	Database,
	Globe,
	Lock,
	Share2,
	Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

function Features() {
	const features = [
		{
			icon: <Cloud className="h-8 w-8" />,
			title: "Cloud Native",
			description:
				"Run simulations on our scalable cloud infrastructure. No local hardware needed.",
			gradient: "from-blue-500 to-cyan-500",
		},
		{
			icon: <Cpu className="h-8 w-8" />,
			title: "GPU Acceleration",
			description: "Powered by latest NVIDIA H100 GPUs for maximum throughput.",
			gradient: "from-purple-500 to-pink-500",
		},
		{
			icon: <Database className="h-8 w-8" />,
			title: "Automated Parametrization",
			description:
				"Auto-generate force field parameters for small molecules using GAFF2/OpenFF.",
			gradient: "from-amber-500 to-orange-500",
		},
		{
			icon: <Activity className="h-8 w-8" />,
			title: "Real-time Monitoring",
			description:
				"Watch your simulation progress with live energetic plots and trajectory streaming.",
			gradient: "from-emerald-500 to-teal-500",
		},
		{
			icon: <BarChart3 className="h-8 w-8" />,
			title: "Advanced Analysis",
			description:
				"Built-in tools for RMSD, RMSF, Hydrogen bonding, and free energy calculations.",
			gradient: "from-rose-500 to-pink-500",
		},
		{
			icon: <Lock className="h-8 w-8" />,
			title: "Secure Storage",
			description:
				"Your data is encrypted at rest and in transit. Compliant with industry standards.",
			gradient: "from-slate-500 to-zinc-500",
		},
		{
			icon: <Globe className="h-8 w-8" />,
			title: "Global CDN",
			description:
				"Access your data from anywhere in the world with low latency.",
			gradient: "from-indigo-500 to-blue-500",
		},
		{
			icon: <Share2 className="h-8 w-8" />,
			title: "Collaboration",
			description:
				"Share projects with your team or collaborators with granular permission controls.",
			gradient: "from-fuchsia-500 to-purple-500",
		},
		{
			icon: <Zap className="h-8 w-8" />,
			title: "API Access",
			description:
				"Integrate Phage into your automated workflows with our comprehensive REST API.",
			gradient: "from-yellow-500 to-amber-500",
		},
	];

	return (
		<div className="min-h-screen bg-background overflow-x-hidden">
			{/* Hero Section */}
			<section className="relative pt-32 pb-20 overflow-hidden">
				{/* Background elements */}
				<div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none" />
				<motion.div
					animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
					transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
					className="absolute top-20 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none"
				/>
				<motion.div
					animate={{ y: [0, 20, 0], opacity: [0.3, 0.5, 0.3] }}
					transition={{
						duration: 7,
						repeat: Number.POSITIVE_INFINITY,
						delay: 1,
					}}
					className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none"
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
							className="inline-block mb-6 px-5 py-2.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium"
						>
							Platform Features
						</motion.span>
						<motion.h1
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="mb-8 font-bold text-5xl md:text-6xl lg:text-7xl leading-tight"
						>
							Powerful Features for{" "}
							<span className="relative inline-block">
								<span className="text-gradient-secondary">Modern Research</span>
								<motion.svg
									initial={{ pathLength: 0, opacity: 0 }}
									animate={{ pathLength: 1, opacity: 1 }}
									transition={{ duration: 1, delay: 0.8 }}
									className="absolute -bottom-2 left-0 w-full"
									viewBox="0 0 300 12"
									fill="none"
								>
									<path
										d="M2 10C50 4 100 2 150 6C200 10 250 4 298 2"
										stroke="url(#feature-gradient)"
										strokeWidth="4"
										strokeLinecap="round"
									/>
									<defs>
										<linearGradient
											id="feature-gradient"
											x1="0%"
											y1="0%"
											x2="100%"
											y2="0%"
										>
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
							className="text-muted-foreground text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto"
						>
							Everything you need to accelerate your computational biology
							research, all in one platform.
						</motion.p>
					</motion.div>
				</div>
			</section>

			{/* Video/Demo Section */}
			<section className="py-20 bg-muted/20 border-y border-border/40">
				<div className="container mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.7 }}
						className="max-w-5xl mx-auto"
					>
						<div className="relative aspect-video rounded-3xl overflow-hidden border border-border/50 shadow-2xl bg-black">
							<iframe
								className="absolute inset-0 w-full h-full"
								src="https://www.youtube.com/embed/d95J8yzvjbQ"
								title="Phage Platform Overview"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
								allowFullScreen
							/>
						</div>
					</motion.div>
				</div>
			</section>

			{/* Feature Grid */}
			<section className="py-24 lg:py-32 relative">
				<div className="absolute inset-0 mesh-gradient opacity-20" />
				<div className="container relative mx-auto px-4">
					<motion.div
						variants={containerVariants}
						initial="hidden"
						whileInView="show"
						viewport={{ once: true }}
						className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
					>
						{features.map((feature, i) => (
							<motion.div key={i} variants={itemVariants}>
								<Card className="h-full group interactive-card border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
									<CardHeader className="pb-4">
										<div
											className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl`}
										>
											{feature.icon}
										</div>
										<CardTitle className="text-xl font-bold group-hover:text-gradient transition-all duration-300">
											{feature.title}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground leading-relaxed">
											{feature.description}
										</p>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* Workflow Section */}
			<section className="py-24 lg:py-32 relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
				<div className="container relative mx-auto px-4">
					<div className="max-w-4xl mx-auto">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							className="text-center mb-16"
						>
							<span className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
								How It Works
							</span>
							<h2 className="font-bold text-4xl md:text-5xl mb-6">
								Simple <span className="text-gradient">Workflow</span>
							</h2>
							<p className="text-muted-foreground text-xl">
								Get from structure to insights in three simple steps
							</p>
						</motion.div>

						<motion.div
							variants={containerVariants}
							initial="hidden"
							whileInView="show"
							viewport={{ once: true }}
							className="space-y-8"
						>
							{[
								{
									step: "01",
									title: "Upload Your Structure",
									description:
										"Drop your PDB files for proteins and SDF files for ligands. We handle the rest.",
									gradient: "from-blue-500 to-cyan-500",
								},
								{
									step: "02",
									title: "Configure Parameters",
									description:
										"Choose simulation length, temperature, and other parameters. Use our presets or customize.",
									gradient: "from-purple-500 to-pink-500",
								},
								{
									step: "03",
									title: "Analyze Results",
									description:
										"View trajectories, plots, and export publication-ready figures automatically.",
									gradient: "from-emerald-500 to-teal-500",
								},
							].map((item, i) => (
								<motion.div
									key={i}
									variants={itemVariants}
									whileHover={{
										x: 10,
										backgroundColor: "hsl(var(--card)/0.8)",
									}}
									className="group flex gap-6 p-6 rounded-2xl transition-colors duration-300 hover:bg-card/50 border border-transparent hover:border-border/50"
								>
									<div
										className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg transition-transform group-hover:scale-110`}
									>
										{item.step}
									</div>
									<div>
										<h3 className="font-bold text-xl mb-2 group-hover:text-gradient transition-all duration-300">
											{item.title}
										</h3>
										<p className="text-muted-foreground text-lg">
											{item.description}
										</p>
									</div>
								</motion.div>
							))}
						</motion.div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="relative py-24 lg:py-32 overflow-hidden">
				<div className="absolute inset-0 mesh-gradient opacity-40" />
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
						className="max-w-3xl mx-auto space-y-8"
					>
						<h2 className="font-bold text-4xl md:text-5xl lg:text-6xl">
							Ready to Get <span className="text-gradient">Started</span>?
						</h2>
						<p className="text-muted-foreground text-xl">
							Join researchers worldwide who trust Phage for their simulations.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<NavLink href="/auth">
								<Button
									size="lg"
									className="group h-14 px-10 bg-gradient-primary text-lg font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105"
								>
									Start Free Trial
									<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
								</Button>
							</NavLink>
							<NavLink href="/pricing">
								<Button
									size="lg"
									variant="outline"
									className="h-14 px-8 text-lg font-medium border-2 hover:bg-primary/5"
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
