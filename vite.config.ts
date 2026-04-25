//import netlify from "@netlify/vite-plugin-tanstack-start";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteImagemin from "vite-plugin-imagemin";

const config = defineConfig({
	plugins: [
		basicSsl(),
		tailwindcss(),
		tanstackStart(),
		nitro(),
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
	build: {
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [
						{
							name: "viz-vendor",
							test: /node_modules[\\/](molstar|recharts)/,
							priority: 30,
						},
						{
							name: "react-vendor",
							test: /node_modules[\\/](react|react-dom|@tanstack\/react-router)/,
							priority: 20,
						},
						{
							name: "vendor",
							test: /node_modules/,
							priority: 10,
						},
					],
				},
			},
		},
	},
});

export default config;
