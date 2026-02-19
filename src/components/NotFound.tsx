import { Link } from "@tanstack/react-router";

export default function NotFound() {
	return (
		<div className="fusion-canvas flex min-h-screen items-center justify-center bg-background">
			<div className="text-center">
				<h1 className="mb-4 font-bold text-4xl">404</h1>
				<p className="mb-4 text-muted-foreground text-xl">
					Oops! Page not found
				</p>
				<Link className="text-primary underline hover:text-secondary" to="/">
					Return to Home
				</Link>
			</div>
		</div>
	);
}
