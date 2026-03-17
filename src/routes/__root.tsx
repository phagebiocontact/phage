import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	Outlet,
	useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import Lenis from "lenis";
import { useEffect } from "react";
import { Toaster as Sonner } from "sonner";
import Footer from "../components/Footer";
import Header from "../components/Header";
import NotFound from "../components/NotFound";
import SecurityInit from "../components/SecurityInit";
import { ThemeProvider } from "../components/themeprovider";
import { Toaster } from "../components/ui/toaster";
import { TooltipProvider } from "../components/ui/tooltip";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { AuthProvider } from "../lib/auth";

interface MyRouterContext {
	queryClient: QueryClient;
	convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	const context = useRouteContext({ from: Route.id });

	useEffect(() => {
		const lenis = new Lenis({
			duration: 1.2,
			easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
			orientation: "vertical",
			gestureOrientation: "vertical",
			smoothWheel: true,
			touchMultiplier: 2,
		});

		function raf(time: number) {
			lenis.raf(time);
			requestAnimationFrame(raf);
		}

		requestAnimationFrame(raf);

		return () => {
			lenis.destroy();
		};
	}, []);

	return (
		<ConvexAuthProvider client={context.convexQueryClient.convexClient}>
			<AuthProvider>
				<ThemeProvider>
					<TooltipProvider>
						<SecurityInit />
						<Header />
						<Outlet />
						<Footer />
						<Toaster />
						<Sonner />
						<TanStackDevtools
							config={{
								position: "bottom-right",
							}}
							plugins={[
								{
									name: "Tanstack Router",
									render: <TanStackRouterDevtoolsPanel />,
								},
								TanStackQueryDevtools,
							]}
						/>
					</TooltipProvider>
				</ThemeProvider>
			</AuthProvider>
		</ConvexAuthProvider>
	);
}
