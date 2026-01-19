import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	Clock,
	FlaskConical,
	LayoutDashboard,
	XCircle,
	Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const successSearchSchema = z.object({
	status: z.union([z.string(), z.array(z.string())]).optional(),
	session_id: z.union([z.string(), z.array(z.string())]).optional(),
	payment_id: z.union([z.string(), z.array(z.string())]).optional(),
});

export const Route = createFileRoute("/success")({
	validateSearch: (search) => successSearchSchema.parse(search),
	component: SuccessPage,
});

const fadeInUp = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
	animate: {
		transition: {
			staggerChildren: 0.1,
		},
	},
};

function SuccessPage() {
	const [isVisible, setIsVisible] = useState(false);
	const search = Route.useSearch();
	const isFailed =
		search.status === "failed" ||
		(Array.isArray(search.status) && search.status[0] === "failed");

	useEffect(() => {
		setIsVisible(true);
	}, []);

	return (
		<div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden px-4 py-20">
			{/* Premium Background Effects */}
			<div className="absolute inset-0 mesh-gradient opacity-20 pointer-events-none" />
			<motion.div
				animate={{
					scale: [1, 1.2, 1],
					opacity: [0.1, 0.2, 0.1],
				}}
				transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
				className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"
			/>
			<motion.div
				animate={{
					scale: [1.2, 1, 1.2],
					opacity: [0.1, 0.15, 0.1],
				}}
				transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
				className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[120px] pointer-events-none"
			/>

			<motion.div
				initial="initial"
				animate={isVisible ? "animate" : "initial"}
				variants={staggerContainer}
				className="max-w-3xl w-full text-center relative z-10"
			>
				{/* Success Icon Animation */}
				<motion.div variants={fadeInUp} className="mb-12 inline-block relative">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 10,
							delay: 0.2,
						}}
						className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg ${
							isFailed
								? "bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_50px_rgba(239,68,68,0.3)]"
								: "bg-gradient-to-br from-green-500 to-emerald-600 shadow-[0_0_50px_rgba(34,197,94,0.3)]"
						}`}
					>
						{isFailed ? (
							<XCircle className="w-12 h-12 text-white" />
						) : (
							<CheckCircle2 className="w-12 h-12 text-white" />
						)}
					</motion.div>

					{/* Orbiting Elements */}
					{[0, 1, 2].map((i) => (
						<motion.div
							key={i}
							animate={{ rotate: 360 }}
							transition={{ duration: 4 + i, repeat: Infinity, ease: "linear" }}
							className="absolute inset-0"
							style={{ padding: "-20px" }}
						>
							<div
								className="w-4 h-4 bg-primary/20 rounded-full blur-sm absolute"
								style={{
									top: i === 0 ? "-10px" : "auto",
									bottom: i === 1 ? "-10px" : "auto",
									left: i === 2 ? "-10px" : "auto",
								}}
							/>
						</motion.div>
					))}
				</motion.div>

				{/* Heading */}
				<motion.div variants={fadeInUp} className="space-y-4 mb-12">
					<h1 className="text-5xl md:text-7xl font-bold tracking-tight">
						{isFailed ? (
							<>
								Payment <span className="text-red-500">Failed</span>
							</>
						) : (
							<>
								Purchase <span className="text-gradient">Successful!</span>
							</>
						)}
					</h1>
					<p className="text-xl md:text-2xl text-muted-foreground max-w-xl mx-auto">
						{isFailed
							? "Something went wrong with your transaction. Please try again or contact support."
							: "Your credits have been added to your account. You're ready to start your next breakthrough."}
					</p>
				</motion.div>

				{/* Content Cards Grid */}
				<div className="grid md:grid-cols-2 gap-6 mb-12">
					<motion.div variants={fadeInUp}>
						<Card
							className={`h-full bg-card/40 backdrop-blur-xl border-primary/20 overflow-hidden group hover:border-primary/40 transition-all duration-300 ${isFailed ? "opacity-50" : ""}`}
						>
							<CardContent className="p-8">
								<div className="flex items-start gap-4 text-left">
									<div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
										<Zap className="w-6 h-6" />
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2">
											Instant Activation
										</h3>
										<p className="text-muted-foreground leading-relaxed">
											{isFailed
												? "Credits will be activated once the payment is successfully processed."
												: "Your credits are available immediately. No waiting, no processing delays."}
										</p>
									</div>
								</div>
							</CardContent>
							<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
						</Card>
					</motion.div>

					<motion.div variants={fadeInUp}>
						<Card className="h-full bg-card/40 backdrop-blur-xl border-secondary/20 overflow-hidden group hover:border-secondary/40 transition-all duration-300">
							<CardContent className="p-8">
								<div className="flex items-start gap-4 text-left">
									<div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0 group-hover:scale-110 transition-transform">
										{isFailed ? (
											<AlertCircle className="w-6 h-6" />
										) : (
											<FlaskConical className="w-6 h-6" />
										)}
									</div>
									<div>
										<h3 className="text-xl font-bold mb-2">
											{isFailed ? "Need Help?" : "Ready to Simulate"}
										</h3>
										<p className="text-muted-foreground leading-relaxed">
											{isFailed
												? "If you continue to have issues, please reach out to our support team."
												: "Head over to the simulation lab and start your research with your new credits."}
										</p>
									</div>
								</div>
							</CardContent>
							<div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
						</Card>
					</motion.div>
				</div>

				{/* Action Buttons */}
				<motion.div
					variants={fadeInUp}
					className="flex flex-col sm:flex-row items-center justify-center gap-4"
				>
					{isFailed ? (
						<NavLink href="/pricing" className="w-full sm:w-auto">
							<Button
								size="lg"
								className="w-full h-14 px-10 bg-gradient-to-r from-red-600 to-rose-600 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group text-white"
							>
								Try Again
								<ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
							</Button>
						</NavLink>
					) : (
						<NavLink href="/simulate" className="w-full sm:w-auto">
							<Button
								size="lg"
								className="w-full h-14 px-10 bg-gradient-primary text-lg font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 group"
							>
								Start Simulation
								<ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
							</Button>
						</NavLink>
					)}
					<NavLink
						href={isFailed ? "/contact" : "/jobs"}
						className="w-full sm:w-auto"
					>
						<Button
							size="lg"
							variant="outline"
							className="w-full h-14 px-8 text-lg font-semibold border-2 hover:bg-primary/5 transition-all duration-300"
						>
							{isFailed ? (
								"Contact Support"
							) : (
								<>
									<LayoutDashboard className="mr-2 w-5 h-5" />
									View Dashboard
								</>
							)}
						</Button>
					</NavLink>
				</motion.div>

				{/* Transaction Note */}
				<motion.p
					variants={fadeInUp}
					className="mt-12 text-muted-foreground text-sm flex items-center justify-center gap-2"
				>
					<Clock className="w-4 h-4" />A receipt has been sent to your email.
					Session ID:{" "}
					<span className="font-mono text-foreground/70">
						{Array.isArray(search.session_id)
							? search.session_id[0]
							: search.session_id || "N/A"}
					</span>
				</motion.p>
			</motion.div>

			{/* Decorative Floating Particles */}
			{[...Array(20)].map((_, i) => (
				<motion.div
					key={i}
					initial={{ opacity: 0 }}
					animate={{
						opacity: [0, 1, 0],
						y: [0, -100],
						x: Math.random() * 100 - 50,
					}}
					transition={{
						duration: 3 + Math.random() * 2,
						repeat: Infinity,
						delay: Math.random() * 5,
					}}
					className="absolute w-1 h-1 bg-white rounded-full pointer-events-none"
					style={{
						left: `${Math.random() * 100}%`,
						bottom: "0%",
					}}
				/>
			))}
		</div>
	);
}
