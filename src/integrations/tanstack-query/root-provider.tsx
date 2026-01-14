import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider } from "convex/react";

export function getContext() {
	const convexUrl = import.meta.env.VITE_CONVEX_URL!;
	const convexQueryClient = new ConvexQueryClient(convexUrl, {
		expectAuth: true,
	});

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	});

	convexQueryClient.connect(queryClient);

	return {
		queryClient,
		convexQueryClient,
	};
}

function _Provider({
	children,
	queryClient,
	convexQueryClient,
}: {
	children: React.ReactNode;
	queryClient: QueryClient;
	convexQueryClient: ConvexQueryClient;
}) {
	return (
		<ConvexProvider client={convexQueryClient.convexClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</ConvexProvider>
	);
}
