import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
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
	],
	ssr: {
		noExternal: ["@convex-dev/auth"],
	},
});

export default config;
