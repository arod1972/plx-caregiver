import { createRequire } from "node:module";
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const root = new URL("..", import.meta.url);
const out = new URL("public/ocr/", root);
mkdirSync(out, { recursive: true });

function fromPackage(name) {
  return dirname(require.resolve(`${name}/package.json`));
}

const tesseract = fromPackage("tesseract.js");
const core = fromPackage("tesseract.js-core");
const eng = fromPackage("@tesseract.js-data/eng");

cpSync(join(tesseract, "dist/worker.min.js"), new URL("worker.min.js", out));
cpSync(join(tesseract, "dist/tesseract.min.js"), new URL("tesseract.min.js", out));
cpSync(join(core, "tesseract-core-lstm.wasm.js"), new URL("tesseract-core-lstm.wasm.js", out));
cpSync(join(core, "tesseract-core-lstm.wasm"), new URL("tesseract-core-lstm.wasm", out));
cpSync(join(eng, "4.0.0_best_int/eng.traineddata.gz"), new URL("eng.traineddata.gz", out));
