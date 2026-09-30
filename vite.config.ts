import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    // Left to itself the minifier writes media queries in the range syntax, which an older Safari
    // does not read — and the deck would come up in its wide layout on such a phone.
    cssTarget: "safari15",
  },
});
