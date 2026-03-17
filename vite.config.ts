import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteImagemin from "vite-plugin-imagemin";

const config = defineConfig({
	plugins: [
		TanStackRouterVite({
			routesDirectory: "./src/routes",
			generatedRouteTree: "./src/routeTree.gen.ts",
		}),
		devtools(),
		tailwindcss(),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		viteImagemin({
			optipng: { optimizationLevel: 7 },
			gifsicle: { optimizationLevel: 3, interlaced: false },
			svgo: { plugins: [{ name: "removeViewBox" }] },
		}),
	],
	ssr: {
		noExternal: ["@convex-dev/auth"],
	},
	resolve: {
		tsconfigPaths: true,
	},
});

export default config;
	