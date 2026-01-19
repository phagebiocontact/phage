import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	Box,
	CheckCircle2,
	FlaskConical,
	Palette,
	Play,
	RotateCcw,
	Shield,
	Sparkles,
	Users,
	Zap,
} from "lucide-react";
import {
	motion,
	useMotionTemplate,
	useMotionValue,
	useSpring,
} from "motion/react";
import { lazy, Suspense, useRef, useState } from "react";
import type { MolstarViewerRef } from "@/components/MolstarViewer";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";

const MolstarViewer = lazy(() => import("@/components/MolstarViewer"));

export const Route = createFileRoute("/")({
	component: Index,
});

const fadeInUp = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.5 },
};

const staggerContainer = {
	animate: {
		transition: {
			staggerChildren: 0.1,
		},
	},
};

function Index() {
	const heroRef = useRef<HTMLDivElement>(null);
	const molstarRef = useRef<MolstarViewerRef>(null);
	const [currentRepr, setCurrentRepr] = useState<
		"cartoon" | "ball-and-stick" | "surface"
	>("cartoon");
	const [currentColor, setCurrentColor] = useState<
		"chain" | "element" | "rainbow"
	>("chain");

	// Mouse movement for hero gradient
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const { left, top, width, height } =
			e.currentTarget.getBoundingClientRect();
		mouseX.set((e.clientX - left) / width);
		mouseY.set((e.clientY - top) / height);
	};

	const background = useMotionTemplate`radial-gradient(600px circle at ${useSpring(mouseX, { stiffness: 50, damping: 20 }).get() * 100}% ${useSpring(mouseY, { stiffness: 50, damping: 20 }).get() * 100}%, hsl(var(--primary) / 0.15), transparent 40%)`;

	const stats = [
		{
			value: "10k+",
			label: "Simulations Run",
			icon: <Sparkles className="h-5 w-5" />,
		},
		{ value: "99.9%", label: "Uptime", icon: <Shield className="h-5 w-5" /> },
		{
			value: "50x",
			label: "Faster Results",
			icon: <Zap className="h-5 w-5" />,
		},
		{
			value: "24/7",
			label: "Expert Support",
			icon: <Users className="h-5 w-5" />,
		},
	];

	const features = [
		{
			icon: <Zap className="h-8 w-8" />,
			title: "Flash Speed",
			description:
				"Leverage our distributed GPU cloud to run simulations in minutes, not days.",
			gradient: "from-yellow-500 to-orange-500",
		},
		{
			icon: <Shield className="h-8 w-8" />,
			title: "Enterprise Security",
			description:
				"Your data is encrypted end-to-end with industry-standard protocols.",
			gradient: "from-emerald-500 to-teal-500",
		},
		{
			icon: <FlaskConical className="h-8 w-8" />,
			title: "High Accuracy",
			description:
				"Validated force fields and algorithms ensure publication-quality results.",
			gradient: "from-violet-500 to-purple-500",
		},
	];

	const visualizations = [
		"Interactive 3D viewer with multiple rendering modes",
		"Automatic trajectory analysis and plotting",
		"One-click export for publication figures",
		"Seamless collaboration with team members",
	];

	return (
		<div className="min-h-screen bg-background overflow-x-hidden">
			{/* Hero Section */}
			<section
				ref={heroRef}
				onMouseMove={handleMouseMove}
				className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32 min-h-[90vh] flex items-center"
			>
				{/* Dynamic Background */}
				<div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none" />
				<motion.div
					className="absolute inset-0 pointer-events-none"
					style={{ background }}
				/>

				{/* Floating Elements - Animated with Framer Motion */}
				<motion.div
					animate={{
						y: [0, -20, 0],
						opacity: [0.2, 0.3, 0.2],
					}}
					transition={{
						duration: 5,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
					className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none"
				/>
				<motion.div
					animate={{
						y: [0, 30, 0],
						opacity: [0.1, 0.2, 0.1],
					}}
					transition={{
						duration: 7,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
						delay: 1,
					}}
					className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none"
				/>

				<div className="container relative mx-auto px-4">
					<div className="grid lg:grid-cols-2 gap-12 items-center">
						{/* Left Content */}
						<motion.div
							initial="initial"
							animate="animate"
							variants={staggerContainer}
							className="text-left"
						>
							{/* Badge */}
							<motion.div
								variants={fadeInUp}
								className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2.5 font-medium text-primary text-sm backdrop-blur-sm"
							>
								<span className="relative flex h-2 w-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
									<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
								</span>
								Next Generation Molecular Dynamics
								<Sparkles className="h-4 w-4 text-primary/70" />
							</motion.div>

							{/* Title */}
							<motion.h1
								variants={fadeInUp}
								className="mb-8 font-bold text-5xl leading-tight tracking-tight md:text-7xl lg:text-8xl"
							>
								Simulate Molecules <br className="hidden md:block" />
								<span className="relative inline-block">
									<span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 bg-clip-text text-transparent animate-gradient-x">
										At Scale
									</span>
									<motion.svg
										initial={{ pathLength: 0, opacity: 0 }}
										animate={{ pathLength: 1, opacity: 1 }}
										transition={{ duration: 1, delay: 0.5 }}
										className="absolute -bottom-2 left-0 w-full"
										viewBox="0 0 300 12"
										fill="none"
									>
										<path
											d="M2 10C50 4 100 2 150 6C200 10 250 4 298 2"
											stroke="url(#underline-gradient)"
											strokeWidth="4"
											strokeLinecap="round"
										/>
										<defs>
											<linearGradient
												id="underline-gradient"
												x1="0%"
												y1="0%"
												x2="100%"
												y2="0%"
											>
												<stop offset="0%" stopColor="hsl(var(--primary))" />
												<stop offset="100%" stopColor="hsl(var(--secondary))" />
											</linearGradient>
										</defs>
									</motion.svg>
								</span>
							</motion.h1>

							{/* Description */}
							<motion.p
								variants={fadeInUp}
								className="mb-12 max-w-2xl text-muted-foreground text-xl md:text-2xl leading-relaxed"
							>
								Run complex molecular simulations in the cloud with
								unprecedented speed and accuracy.
								<span className="text-foreground font-medium">
									{" "}
									No expensive hardware required.
								</span>
							</motion.p>

							{/* CTAs */}
							<motion.div
								variants={fadeInUp}
								className="flex flex-col items-center justify-start gap-4 sm:flex-row"
							>
								<NavLink href="/auth">
									<Button
										size="lg"
										className="group h-14 w-full min-w-[200px] bg-gradient-primary text-lg font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 sm:w-auto"
									>
										Start Free Trial
										<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
									</Button>
								</NavLink>
								<NavLink href="/features">
									<Button
										size="lg"
										variant="outline"
										className="group h-14 w-full min-w-[200px] text-lg font-semibold border-2 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 sm:w-auto"
									>
										<div className="relative">
											<Play className="mr-2 h-5 w-5 fill-current transition-transform group-hover:scale-110" />
										</div>
										Watch Demo
									</Button>
								</NavLink>
							</motion.div>
						</motion.div>

						{/* Right Interactive Element */}
						<motion.div
							initial={{ opacity: 0, x: 50 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.8, delay: 0.2 }}
							className="relative perspective-1000"
						>
							{/* Interaction Hint */}
							<motion.div
								animate={{ y: [0, -10, 0] }}
								transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
								className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-30"
							>
								<span className="font-handwriting text-lg text-primary/80 whitespace-nowrap rotate-[-3deg]">
									✨ Interact with this!
								</span>
								<svg
									className="w-8 h-8 text-primary/60"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M12 5v14M19 12l-7 7-7-7" />
								</svg>
							</motion.div>

							<div className="relative aspect-[4/3] w-full max-w-[600px] mx-auto">
								<div className="absolute inset-0 rounded-3xl bg-primary/20 blur-3xl -z-10 animate-pulse" />
								<motion.div
									whileHover={{ rotateY: 2, rotateX: -2 }}
									transition={{ type: "spring", stiffness: 300 }}
									className="relative h-full w-full rounded-3xl overflow-hidden border border-primary/20 bg-card/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] group transform-style-3d"
								>
									{/* Window Header */}
									<div className="absolute inset-x-0 top-0 h-10 bg-white/5 backdrop-blur-sm flex items-center px-6 gap-2 z-20">
										<div className="flex gap-1.5">
											<div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
											<div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
											<div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
										</div>
										<div className="flex-1 text-center font-mono text-[10px] text-white/40 uppercase tracking-widest">
											nucleosome_1aoi
										</div>
									</div>

									{/* Viewer */}
									<div className="h-full w-full pt-10">
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

									{/* Overlay Grid */}
									<div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] opacity-50" />
								</motion.div>

								{/* Controls */}
								<div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
									{/* Representation Toggle */}
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										type="button"
										onClick={() => {
											const next =
												currentRepr === "cartoon"
													? "ball-and-stick"
													: currentRepr === "ball-and-stick"
														? "surface"
														: "cartoon";
											setCurrentRepr(next);
											molstarRef.current?.setRepresentation(next);
										}}
										className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/60 backdrop-blur-sm border border-primary/20 text-sm font-medium text-foreground/80 hover:bg-primary/10 hover:border-primary/40 transition-colors"
									>
										<Box className="w-4 h-4" />
										<span className="capitalize">
											{currentRepr.replace("-", " ")}
										</span>
									</motion.button>

									{/* Color Toggle */}
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										type="button"
										onClick={() => {
											const next =
												currentColor === "chain"
													? "element"
													: currentColor === "element"
														? "rainbow"
														: "chain";
											setCurrentColor(next);
											molstarRef.current?.setColor(next);
										}}
										className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/60 backdrop-blur-sm border border-secondary/20 text-sm font-medium text-foreground/80 hover:bg-secondary/10 hover:border-secondary/40 transition-colors"
									>
										<Palette className="w-4 h-4" />
										<span className="capitalize">{currentColor}</span>
									</motion.button>

									{/* Reset View */}
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										type="button"
										onClick={() => molstarRef.current?.resetZoom()}
										className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/60 backdrop-blur-sm border border-accent/20 text-sm font-medium text-foreground/80 hover:bg-accent/10 hover:border-accent/40 transition-colors"
									>
										<RotateCcw className="w-4 h-4" />
										<span>Reset View</span>
									</motion.button>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* Stats Section */}
			<section className="relative border-y border-border/40 bg-muted/30 py-16 backdrop-blur-sm overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
				<div className="container relative mx-auto px-4">
					<motion.div
						initial="hidden"
						whileInView="show"
						viewport={{ once: true }}
						variants={staggerContainer}
						className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8"
					>
						{stats.map((stat, i) => (
							<motion.div
								key={i}
								variants={fadeInUp}
								className="group relative text-center p-6 rounded-2xl transition-all duration-500 hover:bg-card/50 hover:shadow-lg"
							>
								<div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
								<div className="relative">
									<div className="mb-3 mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110 group-hover:bg-primary/20">
										{stat.icon}
									</div>
									<h3 className="font-bold text-4xl md:text-5xl bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent mb-1">
										{stat.value}
									</h3>
									<p className="text-muted-foreground text-sm md:text-base">
										{stat.label}
									</p>
								</div>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-24 lg:py-32 relative">
				<div className="absolute inset-0 mesh-gradient opacity-30" />
				<div className="container relative mx-auto px-4">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="mb-20 text-center"
					>
						<span className="inline-block mb-4 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
							Why Choose Us
						</span>
						<h2 className="mb-6 font-bold text-4xl md:text-5xl lg:text-6xl">
							Why Choose <span className="text-gradient">Phage</span>?
						</h2>
						<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
							Built for researchers, by researchers. We understand what you need
							to accelerate your drug discovery pipeline.
						</p>
					</motion.div>
					<motion.div
						initial="hidden"
						whileInView="show"
						viewport={{ once: true }}
						variants={staggerContainer}
						className="grid gap-8 md:grid-cols-3"
					>
						{features.map((feature, i) => (
							<motion.div
								key={i}
								variants={fadeInUp}
								whileHover={{ y: -10, transition: { duration: 0.2 } }}
								className="group interactive-card rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 lg:p-10"
							>
								<div
									className={`mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl`}
								>
									{feature.icon}
								</div>
								<h3 className="mb-4 font-bold text-2xl group-hover:text-gradient transition-all duration-300">
									{feature.title}
								</h3>
								<p className="text-muted-foreground text-lg leading-relaxed">
									{feature.description}
								</p>
							</motion.div>
						))}
					</motion.div>
				</div>
			</section>
			{/* Visualizations Section */}
			<section className="relative overflow-hidden py-24 lg:py-32">
				{/* Background Elements */}
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
				<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
				<div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

				<div className="container relative mx-auto px-4">
					<div className="max-w-4xl mx-auto">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.6 }}
							className="space-y-10"
						>
							<div className="text-center">
								<span className="inline-block mb-4 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
									Visualization
								</span>
								<h2 className="font-bold text-4xl leading-tight md:text-5xl lg:text-6xl">
									Visualize Your Molecules in{" "}
									<span className="text-gradient-secondary">Real-Time</span>
								</h2>
							</div>
							<div className="grid gap-6 md:grid-cols-2">
								{visualizations.map((item, i) => (
									<motion.div
										key={i}
										initial={{ opacity: 0, x: -20 }}
										whileInView={{ opacity: 1, x: 0 }}
										viewport={{ once: true }}
										transition={{ delay: i * 0.1 }}
										className="group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:bg-secondary/5 border border-transparent hover:border-secondary/10 backdrop-blur-sm"
									>
										<div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-secondary flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
											<CheckCircle2 className="h-5 w-5 text-white" />
										</div>
										<span className="text-lg font-medium">{item}</span>
									</motion.div>
								))}
							</div>
							<div className="flex justify-center pt-4">
								<NavLink href="/features">
									<Button
										size="lg"
										className="group h-14 bg-gradient-secondary text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
									>
										Explore Features
										<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
									</Button>
								</NavLink>
							</div>
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
					className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl pointer-events-none"
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
							Ready to Accelerate Your{" "}
							<span className="text-gradient">Research</span>?
						</h2>
						<p className="text-muted-foreground text-xl">
							Join thousands of researchers using Phage to power their
							discoveries. Start with 5 free credits today.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<NavLink href="/auth">
								<Button
									size="lg"
									className="group h-14 px-10 bg-gradient-primary text-lg font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105"
								>
									Get Started Free
									<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
								</Button>
							</NavLink>
							<NavLink href="/contact">
								<Button
									size="lg"
									variant="ghost"
									className="h-14 px-8 text-lg font-medium hover:bg-primary/5"
								>
									Talk to Sales
								</Button>
							</NavLink>
						</div>
					</motion.div>
				</div>
			</section>
		</div>
	);
}
