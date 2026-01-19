"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { createContext, type ReactNode, useContext } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

type User = {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
	image?: string;
	createdAt: Date;
	updatedAt: Date;
	credits: number;
};

type AuthContextType = {
	user: User | null;
	isLoading: boolean;
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (email: string, password: string, name: string) => Promise<void>;
	signOut: () => Promise<void>;
	updateCredits: (amount: number) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const currentUser = useQuery(api.auth.getCurrentUser);
	const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();

	const isLoading = currentUser === undefined;
	const user: User | null = currentUser
		? {
			id: currentUser._id,
			email: currentUser.email ?? "",
			name: currentUser.name ?? "",
			emailVerified: currentUser.emailVerified !== undefined,
			image: currentUser.image || undefined,
			createdAt: new Date(currentUser._creationTime),
			updatedAt: new Date(currentUser._creationTime),
			credits: currentUser.credits ?? 0,
		}
		: null;

	const signIn = async (email: string, password: string) => {
		try {
			await convexSignIn("password", { email, password, flow: "signIn" });
			toast.success("Welcome back!", {
				description: `Signed in as ${email}`,
			});
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Please check your credentials";
			toast.error("Sign in failed", {
				description: message,
			});
			throw error;
		}
	};

	const signUp = async (email: string, password: string, name: string) => {
		try {
			await convexSignIn("password", { email, password, name, flow: "signUp" });
			toast.success("Account created!", {
				description: `Welcome ${name}`,
			});
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Please try again";
			toast.error("Sign up failed", {
				description: message,
			});
			throw error;
		}
	};

	const signOut = async () => {
		try {
			await convexSignOut();
			toast.success("Signed out", {
				description: "You have been successfully signed out",
			});
		} catch (error) {
			toast.error("Sign out failed", {
				description: "Please try again",
			});
			throw error;
		}
	};

	const updateCredits = (amount: number) => {
		console.log("Updating credits", amount);
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				isLoading,
				signIn,
				signUp,
				signOut,
				updateCredits,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
