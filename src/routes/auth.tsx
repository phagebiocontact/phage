import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Dna, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useAuthActions } from "@convex-dev/auth/react";

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
	const { signIn: oauthSignIn } = useAuthActions();
	const [submitting, setSubmitting] = useState(false);
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
		setSubmitting(true);
		try {
			if (isSignUp) {
				await signUp(email, password, name);
			} else {
				await signIn(email, password);
			}
			navigate({ to: "/" });
		} catch (_error) {
			// Error handled in auth context
		} finally {
			setSubmitting(false);
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
								disabled={submitting || (isSignUp && !allRequirementsMet)}
								type="submit"
							>
								{submitting ? (
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

						{/* Divider */}
						<div className="relative my-6">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-border/50" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-card px-2 text-muted-foreground">
									Or continue with
								</span>
							</div>
						</div>

						{/* Google OAuth Button */}
						<Button
							type="button"
							variant="outline"
							className="w-full h-12 text-base font-medium border-border/50 hover:bg-accent/50 transition-all duration-300"
							onClick={() => void oauthSignIn("google")}
						>
							<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							Continue with Google
						</Button>

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
