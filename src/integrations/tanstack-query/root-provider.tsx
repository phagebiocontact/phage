import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";

export function getContext() {
	const convexUrl = import.meta.env.VITE_CONVEX_URL!;
	const convexQueryClient = new ConvexQueryClient(convexUrl, {
		expectAuth: false,
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
