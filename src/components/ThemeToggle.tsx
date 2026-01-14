"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
export const ThemeToggle = () => {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	if (!mounted) {
		return <div className="w-10 h-10 rounded-xl bg-muted/50 animate-pulse" />;
	}
	const isDark = theme === "dark";
	return (
		<button
			onClick={() => setTheme(isDark ? "light" : "dark")}
			className="group relative w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-300 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50"
			aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					setTheme(isDark ? "light" : "dark");
				}
			}}
		>
			{}
			<Sun
				className={`absolute h-5 w-5 transition-all duration-500 ${
					isDark
						? "rotate-0 scale-100 text-yellow-500"
						: "rotate-90 scale-0 text-yellow-500"
				}`}
			/>
			{}
			<Moon
				className={`absolute h-5 w-5 transition-all duration-500 ${
					isDark
						? "-rotate-90 scale-0 text-primary"
						: "rotate-0 scale-100 text-primary"
				}`}
			/>
			{}
			<div className="absolute inset-0 rounded-xl bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
		</button>
	);
};
