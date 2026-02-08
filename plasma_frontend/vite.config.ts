import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Ensure React Fast Refresh works correctly
      jsxRuntime: "automatic",
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Force singleton React instances to prevent "Invalid Hook Call" errors
      // This ensures all packages use the same React instance
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "./node_modules/react/jsx-dev-runtime.js"),
    },
    dedupe: [
      // Explicitly dedupe React to prevent multiple instances
      // This is critical for preventing "Invalid Hook Call" errors
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-router",
      "react-router-dom",
    ],
  },
  optimizeDeps: {
    // Force pre-bundling of these dependencies to ensure single instance
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-router",
      "react-router-dom",
      "@privy-io/react-auth",
      "react-qr-code",
    ],
    esbuildOptions: {
      // Ensure React is treated as external correctly
      jsx: "automatic",
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    commonjsOptions: {
      // Transform CommonJS dependencies to ES modules
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate React into its own chunk to ensure singleton
          "react-vendor": ["react", "react-dom", "react/jsx-runtime"],
          "router-vendor": ["react-router", "react-router-dom"],
        },
      },
    },
  },
});
