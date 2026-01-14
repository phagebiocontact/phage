"use client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

// In Vite we use import.meta.env
const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
export const convex = new ConvexReactClient(convexUrl);

function _ConvexProvider({ children }: { children: ReactNode }) {
	return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
