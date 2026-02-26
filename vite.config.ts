import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import viteImagemin from "vite-plugin-imagemin";
import basicSsl from "@vitejs/plugin-basic-ssl";

const config = defineConfig({
	plugins: [
		//basicSsl(),
		devtools(),
		tailwindcss(),
		tsconfigPaths(),
		tanstackStart(),
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
});

export default config;
