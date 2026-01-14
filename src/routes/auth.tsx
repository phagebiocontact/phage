import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Dna, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
	component: Auth,
});

function Auth() {
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const { user, signIn, signUp, isLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		setIsVisible(true);
	}, []);

	useEffect(() => {
		if (user && !isLoading) {
			navigate({ to: "/" });
		}
	}, [user, isLoading, navigate]);

	if (user) {
		return null;
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			if (isSignUp) {
				await signUp(email, password, name);
			} else {
				await signIn(email, password);
			}
			navigate({ to: "/" });
		} catch (_error) {
			// Error handled in auth context
		}
	};

	const passwordRequirements = [
		{ label: "At least 12 characters", valid: password.length >= 12 },
		{ label: "Uppercase letter (A-Z)", valid: /[A-Z]/.test(password) },
		{ label: "Lowercase letter (a-z)", valid: /[a-z]/.test(password) },
		{ label: "Number (0-9)", valid: /\d/.test(password) },
		{
			label: "Special character (!@#$%^&* etc)",
			valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
		},
	];

	const allRequirementsMet = passwordRequirements.every((req) => req.valid);

	return (
		<div className="min-h-screen flex">
			{/* Left side - decorative */}
			<div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
				{/* Animated background elements */}
				<div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none" />
				<div className="absolute top-20 left-20 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-float opacity-50 pointer-events-none" />
				<div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary/15 rounded-full blur-3xl animate-float delay-300 opacity-40 pointer-events-none" />
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl animate-pulse opacity-30 pointer-events-none" />
				{/* Content */}
				<div className="relative z-10 flex flex-col justify-center p-12 xl:p-20">
					<div className="space-y-8">
						<h2 className="text-4xl xl:text-5xl font-bold leading-tight">
							Accelerate Your{" "}
							<span className="text-gradient">Molecular Discovery</span>
						</h2>
						<p className="text-muted-foreground text-xl leading-relaxed max-w-md">
							Join thousands of researchers using Phage to power their
							simulations and accelerate drug discovery.
						</p>
						{/* Features list */}
						<div className="space-y-4 pt-4">
							{[
								"5 free credits to get started",
								"GPU-accelerated simulations",
								"Real-time progress monitoring",
								"Publication-ready results",
							].map((feature, i) => (
								<div key={i} className="flex items-center gap-3 text-lg">
									<div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center">
										<CheckCircle className="h-4 w-4 text-secondary" />
									</div>
									<span>{feature}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
			{/* Right side - form */}
			<div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background relative overflow-hidden">
				{/* Background effects */}
				<div className="absolute inset-0 mesh-gradient opacity-20" />
				<div className="absolute top-10 right-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
				<div className="absolute bottom-10 left-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
				<div className="relative w-full max-w-md">
					{/* Mobile logo */}
					<div className="lg:hidden mb-8 text-center">
						<NavLink href="/" className="inline-flex items-center gap-2 mb-6">
							<div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
								<Dna className="h-6 w-6 text-white" />
							</div>
							<span className="text-gradient font-bold text-xl">Phage</span>
						</NavLink>
					</div>
					{/* Header */}
					<div
						className={`mb-8 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-7" : "opacity-0 translate-y-4"}`}
					>
						<h1 className="font-bold text-3xl md:text-4xl mb-2">
							{isSignUp ? "Create Account" : "Sign In"}
						</h1>
						<p className="text-muted-foreground text-lg">
							{isSignUp
								? "Start simulating molecular dynamics today"
								: "Continue your molecular simulations"}
						</p>
					</div>
					{/* Form card */}
					<div
						className={`rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 shadow-xl transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
					>
						<form className="space-y-5" onSubmit={handleSubmit}>
							{isSignUp && (
								<div className="space-y-2">
									<Label htmlFor="name" className="text-sm font-medium">
										Full Name
									</Label>
									<Input
										className="h-12 px-4 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
										id="name"
										onChange={(e) => setName(e.target.value)}
										placeholder="John Doe"
										required
										type="text"
										value={name}
									/>
								</div>
							)}
							<div className="space-y-2">
								<Label htmlFor="email" className="text-sm font-medium">
									Email
								</Label>
								<Input
									className="h-12 px-4 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
									id="email"
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@example.com"
									required
									type="email"
									value={email}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="password" className="text-sm font-medium">
									Password
								</Label>
								<div className="relative">
									<Input
										className="h-12 px-4 pr-12 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
										id="password"
										minLength={12}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="••••••••"
										required
										type={showPassword ? "text" : "password"}
										value={password}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									>
										{showPassword ? (
											<EyeOff className="h-5 w-5" />
										) : (
											<Eye className="h-5 w-5" />
										)}
									</button>
								</div>
								{isSignUp && (
									<div className="space-y-2 pt-2">
										<div className="grid grid-cols-2 gap-2">
											{passwordRequirements.map((req, i) => (
												<div
													key={i}
													className={`flex items-center gap-2 text-xs transition-colors duration-300 ${req.valid ? "text-green-500" : "text-muted-foreground"}`}
												>
													<div
														className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${req.valid ? "bg-green-500" : "bg-muted-foreground/30"}`}
													/>
													{req.label}
												</div>
											))}
										</div>
									</div>
								)}
							</div>
							<Button
								className="w-full h-12 text-lg font-semibold bg-gradient-primary shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02]"
								disabled={isLoading || (isSignUp && !allRequirementsMet)}
								type="submit"
							>
								{isLoading ? (
									<div className="flex items-center gap-2">
										<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										Processing...
									</div>
								) : isSignUp ? (
									"Create Account"
								) : (
									"Sign In"
								)}
							</Button>
						</form>
						<div className="mt-8 text-center">
							<p className="text-muted-foreground">
								{isSignUp
									? "Already have an account? "
									: "Don't have an account? "}
								<button
									onClick={() => setIsSignUp(!isSignUp)}
									className="text-primary font-medium hover:underline focus:outline-none"
								>
									{isSignUp ? "Sign In" : "Sign Up"}
								</button>
							</p>
						</div>
					</div>
					{/* Footer links */}
					<div className="mt-8 flex justify-center gap-6 text-sm text-muted-foreground">
						<NavLink
							href="/terms"
							className="hover:text-foreground transition-colors"
						>
							Terms
						</NavLink>
						<NavLink
							href="/privacy"
							className="hover:text-foreground transition-colors"
						>
							Privacy
						</NavLink>
						<NavLink
							href="/help"
							className="hover:text-foreground transition-colors"
						>
							Help
						</NavLink>
					</div>
				</div>
			</div>
		</div>
	);
}
