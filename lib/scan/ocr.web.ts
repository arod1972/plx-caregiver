type Worker = {
  recognize(image: string): Promise<{ data: { text: string } }>;
};

type TesseractApi = {
  createWorker(langs: string, oem: number, options: Record<string, unknown>): Promise<Worker>;
};

let pending: Promise<Worker> | null = null;

function api() {
  const value = (globalThis as { Tesseract?: TesseractApi }).Tesseract;
  if (!value) throw new Error("Label reading could not start on this device.");
  return value;
}

async function loadScript() {
  if ((globalThis as { Tesseract?: TesseractApi }).Tesseract) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/ocr/tesseract.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Label reading could not start on this device."));
    document.head.appendChild(script);
  });
}

function worker() {
  if (!pending) {
    pending = (async () => {
      await loadScript();
      return api().createWorker("eng", 1, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr/tesseract-core-lstm.wasm.js",
        langPath: "/ocr",
        gzip: true,
        workerBlobURL: false,
      });
    })().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

export async function readLabelText(uri: string) {
  const current = await worker();
  const result = await current.recognize(uri);
  const text = result.data.text.replace(/\s+/g, " ").trim();
  if (!text) throw new Error("No text was found on that label.");
  return text;
}
