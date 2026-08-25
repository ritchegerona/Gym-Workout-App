import { copyFileSync } from "node:fs";

// GitHub Pages serves 404.html for unknown routes; an index.html clone
// lets the SPA router handle deep links (e.g. /history/<id>).
copyFileSync("dist/index.html", "dist/404.html");
console.log("dist/404.html written (SPA fallback)");
