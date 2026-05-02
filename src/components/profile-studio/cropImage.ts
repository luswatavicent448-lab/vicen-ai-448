/**
 * Utilities for the Profile Studio: crops an image to a circular-friendly square,
 * applies brightness/contrast/auto-adjust, optional border/glow preset, and
 * encodes a high-quality JPEG/WebP under a small size budget.
 */

export type Preset = "none" | "ring" | "glow" | "soft";

export interface Adjustments {
  brightness: number; // 0.5 - 1.5
  contrast: number;   // 0.5 - 1.5
  auto: boolean;
  preset: Preset;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OUTPUT_SIZE = 512; // square output for fast loading

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Render the cropped + adjusted image to a canvas and return it.
 * Used both for the live preview and the final upload.
 */
export async function renderProfileImage(
  src: string,
  crop: CropArea,
  adj: Adjustments,
  size = OUTPUT_SIZE
): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Filters. Auto = mild brightness + contrast bump.
  const b = adj.auto ? Math.max(adj.brightness, 1.05) : adj.brightness;
  const c = adj.auto ? Math.max(adj.contrast, 1.1) : adj.contrast;
  const sat = adj.auto ? 1.1 : 1;
  ctx.filter = `brightness(${b}) contrast(${c}) saturate(${sat})`;

  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    size,
    size
  );
  ctx.filter = "none";

  // Apply preset (ring / glow / soft vignette) on top.
  if (adj.preset !== "none") {
    const r = size / 2;
    if (adj.preset === "ring") {
      ctx.lineWidth = size * 0.04;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(r, r, r - ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (adj.preset === "glow") {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const grad = ctx.createRadialGradient(r, r, r * 0.6, r, r, r);
      grad.addColorStop(0, "rgba(99,102,241,0)");
      grad.addColorStop(1, "rgba(99,102,241,0.55)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();
    } else if (adj.preset === "soft") {
      ctx.save();
      const grad = ctx.createRadialGradient(r, r, r * 0.55, r, r, r);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();
    }
  }

  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/webp",
  quality = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))),
      type,
      quality
    );
  });
}