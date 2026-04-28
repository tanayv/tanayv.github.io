import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://tanay.io",
  integrations: [react()],
  vite: {
    server: {
      watch: { ignored: ["**/_legacy_gatsby/**"] },
    },
  },
});
