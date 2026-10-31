import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectDirectory = resolve(import.meta.dirname);
const distDirectory = resolve(projectDirectory, "dist");
const outputPath = resolve(projectDirectory, "..", "Lumera-Cliente.html");
const previewPath = resolve(distDirectory, "Lumera-Cliente.html");

const [html, styles, heroBundle, motionBundle] = await Promise.all([
  readFile(resolve(distDirectory, "index.html"), "utf8"),
  readFile(resolve(distDirectory, "styles.css"), "utf8"),
  readFile(resolve(distDirectory, "tilted-grid-bundle.js"), "utf8"),
  readFile(resolve(distDirectory, "motion-bundle.js"), "utf8"),
]);

const scriptDataUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;

const standalone = html
  .replace(/\s*<link rel="stylesheet" href="\.\/styles\.css[^>]*\/>/, `\n    <style>\n${styles}\n    </style>`)
  .replace(/\s*<script src="\.\/tilted-grid-bundle\.js[^>]*><\/script>/, "")
  .replace(/\s*<script src="\.\/motion-bundle\.js[^>]*><\/script>/, "")
  .replace(
    "</body>",
    `  <script src="${scriptDataUrl(heroBundle)}"></script>\n  <script src="${scriptDataUrl(motionBundle)}"></script>\n</body>`,
  );

await Promise.all([
  writeFile(outputPath, standalone, "utf8"),
  writeFile(previewPath, standalone, "utf8"),
]);
console.log(outputPath);
