import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import babel from "@rollup/plugin-babel";

import pkg from "./package.json" assert { type: "json" };

export default [
    // UMD
    {
        input: "src/index.js",
        plugins: [
            nodeResolve(),
            babel({
            babelHelpers: "bundled",
            }),
            terser(),
        ],
        output: {
            file: `dist/${pkg.name}.min.js`,
            format: "umd",
            name: "arcCharts",
            esModule: false,
            exports: "named",
            sourcemap: true,
        },
    },
    // ESM and CJS
    {
        input: "src/index.js",
        plugins: [nodeResolve()],
        output: [
            {
                dir: "dist/esm",
                format: "esm",
                exports: "named",
                sourcemap: true,
            },
            {
                dir: "dist/cjs",
                format: "cjs",
                exports: "named",
                sourcemap: true,
            },
        ],
    },
]