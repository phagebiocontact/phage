import { Link } from "@tanstack/react-router";

export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-zinc-900">
			<div className="text-center">
				<h1 className="mb-4 font-bold text-4xl">404</h1>
				<p className="mb-4 text-gray-600 dark:text-gray-400 text-xl">
					Oops! Page not found
				</p>
				<Link className="text-blue-500 underline hover:text-blue-700" to="/">
					Return to Home
				</Link>
			</div>
		</div>
	);
}
