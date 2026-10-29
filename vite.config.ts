import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";
import path from "path";
import pkg from "./package.json" with { type: "json" };
import { contentSecurityPolicyPlugin } from "./vite.csp.ts";

export default defineConfig(({ command, mode }) => {
  if (command === "serve") {
    const devSigningSecret = loadEnv(
      mode,
      process.cwd(),
      "LINER_",
    ).LINER_DEV_SIGNING_SECRET;
    if (devSigningSecret)
      process.env.LINER_DEV_SIGNING_SECRET = devSigningSecret;
  }

  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      react(),
      tailwindcss(),
      contentSecurityPolicyPlugin(),
      ...(process.env.VITE_WEB === "true"
        ? []
        : [
            electron({
              main: {
                entry: "electron/main.ts",
              },
              preload: {
                input: "electron/preload.ts",
                vite: {
                  build: {
                    rollupOptions: {
                      output: {
                        format: "cjs",
                        entryFileNames: "preload.cjs",
                      },
                    },
                  },
                },
              },
            }),
          ]),
    ],
    clearScreen: false,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        "next/navigation": path.resolve(
          import.meta.dirname,
          "./src/lib/navigation.tsx",
        ),
        "next/link": path.resolve(
          import.meta.dirname,
          "./src/lib/navigation.tsx",
        ),
        "next/image": path.resolve(
          import.meta.dirname,
          "./src/components/ui/AppImage.tsx",
        ),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/youtubei": {
          target: "https://music.youtube.com",
          changeOrigin: true,
          headers: {
            origin: "https://music.youtube.com",
            referer: "https://music.youtube.com",
          },
        },
        "/api/jnn": {
          target: "https://www.youtube.com",
          changeOrigin: true,
          headers: {
            origin: "https://www.youtube.com",
            referer: "https://www.youtube.com",
          },
        },
        "/google-th": {
          target: "https://www.google.com/js/th",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/google-th/, ""),
          headers: {
            origin: "https://www.google.com",
            referer: "https://www.google.com",
          },
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      chunkSizeWarningLimit: 2048,
    },
  };
});
