import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["src/index.ts", "src/info.ts"],
		format: ["esm"],
		dts: {
			sourcemap: false,
		},
	},
]);
