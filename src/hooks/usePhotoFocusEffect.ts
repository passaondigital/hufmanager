import { useCallback } from "react";

export type FocusIntensity = "off" | "light" | "strong";

interface FocusEffectConfig {
  /** 0-1: how much of the image stays clear (0.6 = 60%) */
  clearRadius: number;
  /** 0-1: vignette darkness */
  vignetteDarkness: number;
  /** blur radius in px for edge softening */
  blurRadius: number;
}

const INTENSITY_CONFIG: Record<Exclude<FocusIntensity, "off">, FocusEffectConfig> = {
  light: { clearRadius: 0.55, vignetteDarkness: 0.35, blurRadius: 8 },
  strong: { clearRadius: 0.45, vignetteDarkness: 0.55, blurRadius: 16 },
};

/**
 * Applies a radial vignette + edge blur to a photo canvas.
 * Pure Canvas2D – no external libs, works offline.
 */
export function usePhotoFocusEffect() {
  const applyEffect = useCallback(
    (sourceDataUrl: string, intensity: FocusIntensity): Promise<string> => {
      if (intensity === "off") return Promise.resolve(sourceDataUrl);

      const config = INTENSITY_CONFIG[intensity];

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const w = img.width;
          const h = img.height;
          const cx = w / 2;
          const cy = h / 2;
          const maxR = Math.sqrt(cx * cx + cy * cy);
          const innerR = maxR * config.clearRadius;

          // --- Step 1: Edge blur via downscale/upscale trick ---
          const blurCanvas = document.createElement("canvas");
          blurCanvas.width = w;
          blurCanvas.height = h;
          const blurCtx = blurCanvas.getContext("2d")!;

          // Use CSS filter blur if available (hardware-accelerated)
          blurCtx.filter = `blur(${config.blurRadius}px)`;
          blurCtx.drawImage(img, 0, 0, w, h);
          blurCtx.filter = "none";

          // --- Step 2: Composite sharp center + blurred edges ---
          const outCanvas = document.createElement("canvas");
          outCanvas.width = w;
          outCanvas.height = h;
          const ctx = outCanvas.getContext("2d")!;

          // Draw blurred version as base
          ctx.drawImage(blurCanvas, 0, 0);

          // Clip a radial circle and draw sharp image on top
          ctx.save();
          ctx.beginPath();
          // Ellipse to match aspect ratio
          const rx = innerR * (w / Math.max(w, h));
          const ry = innerR * (h / Math.max(w, h));
          ctx.ellipse(cx, cy, rx * 1.3, ry * 1.3, 0, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, 0, 0, w, h);
          ctx.restore();

          // --- Step 3: Vignette overlay ---
          const gradient = ctx.createRadialGradient(cx, cy, innerR * 0.8, cx, cy, maxR);
          gradient.addColorStop(0, "rgba(0,0,0,0)");
          gradient.addColorStop(0.5, `rgba(0,0,0,${config.vignetteDarkness * 0.3})`);
          gradient.addColorStop(1, `rgba(0,0,0,${config.vignetteDarkness})`);

          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);

          resolve(outCanvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = sourceDataUrl;
      });
    },
    []
  );

  return { applyEffect };
}
