import { cn } from "@/lib/utils";
import { HoofView, HOOF_VIEW_CONFIGS } from "./types";

interface CameraGuideOverlayProps {
  view: HoofView;
  isLevel: boolean;
  tiltAngle: number;
  requiresLevel: boolean;
}

export function CameraGuideOverlay({ 
  view, 
  isLevel, 
  tiltAngle,
  requiresLevel 
}: CameraGuideOverlayProps) {
  const config = HOOF_VIEW_CONFIGS.find(c => c.id === view);
  if (!config || config.guideType === "none") return null;

  // Determine line color based on level status
  const lineColor = !requiresLevel 
    ? "rgba(255, 255, 255, 0.6)" 
    : isLevel 
      ? "rgba(34, 197, 94, 0.8)" // green-500
      : "rgba(239, 68, 68, 0.8)"; // red-500

  const shadowFilter = "drop-shadow(0 0 2px rgba(0,0,0,0.8)) drop-shadow(0 0 4px rgba(0,0,0,0.5))";

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* HM-CAM Branding Label */}
      <div className="absolute top-4 left-4 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
        <span className="text-xs font-bold text-white tracking-wider">
          HM-CAM
        </span>
      </div>

      {/* SVG Guide Overlay */}
      <svg 
        className="w-full h-full" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        style={{ filter: shadowFilter }}
      >
        {config.guideType === "t-guide" && (
          <TGuide lineColor={lineColor} />
        )}
        {config.guideType === "l-guide" && (
          <LGuide lineColor={lineColor} />
        )}
        {config.guideType === "target-guide" && (
          <TargetGuide lineColor={lineColor} />
        )}
      </svg>

      {/* Hint Text */}
      <div className="absolute bottom-20 left-4 right-4">
        <div 
          className={cn(
            "px-3 py-2 rounded-lg text-center text-sm font-medium backdrop-blur-sm",
            !requiresLevel 
              ? "bg-black/50 text-white"
              : isLevel 
                ? "bg-green-500/20 text-green-100 border border-green-500/30"
                : "bg-red-500/20 text-red-100 border border-red-500/30"
          )}
        >
          {requiresLevel && !isLevel ? (
            <span>⚠️ Bitte Handy senkrecht halten! ({Math.round(tiltAngle)}° Neigung)</span>
          ) : (
            <span>{config.hint}</span>
          )}
        </div>
      </div>

      {/* Level Indicator (Bubble) */}
      {requiresLevel && (
        <BubbleLevel isLevel={isLevel} tiltAngle={tiltAngle} />
      )}
    </div>
  );
}

// T-Guide: Horizontal bottom line + Vertical center line
function TGuide({ lineColor }: { lineColor: string }) {
  return (
    <g>
      {/* Horizontal ground line (bottom third) */}
      <line 
        x1="0" y1="75" 
        x2="100" y2="75" 
        stroke={lineColor} 
        strokeWidth="0.5"
        strokeLinecap="round"
      />
      {/* Small tick marks on horizontal line */}
      <line x1="25" y1="73" x2="25" y2="77" stroke={lineColor} strokeWidth="0.3" />
      <line x1="50" y1="72" x2="50" y2="78" stroke={lineColor} strokeWidth="0.4" />
      <line x1="75" y1="73" x2="75" y2="77" stroke={lineColor} strokeWidth="0.3" />
      
      {/* Vertical center line */}
      <line 
        x1="50" y1="10" 
        x2="50" y2="75" 
        stroke={lineColor} 
        strokeWidth="0.5"
        strokeLinecap="round"
      />
      {/* Arrow head at top */}
      <polygon 
        points="50,8 48,12 52,12" 
        fill={lineColor}
      />
    </g>
  );
}

// L-Guide: Horizontal bottom line + Vertical edge line
function LGuide({ lineColor }: { lineColor: string }) {
  return (
    <g>
      {/* Horizontal ground line */}
      <line 
        x1="0" y1="85" 
        x2="100" y2="85" 
        stroke={lineColor} 
        strokeWidth="0.5"
        strokeLinecap="round"
      />
      {/* Tick marks */}
      <line x1="20" y1="83" x2="20" y2="87" stroke={lineColor} strokeWidth="0.3" />
      <line x1="40" y1="83" x2="40" y2="87" stroke={lineColor} strokeWidth="0.3" />
      <line x1="60" y1="83" x2="60" y2="87" stroke={lineColor} strokeWidth="0.3" />
      <line x1="80" y1="83" x2="80" y2="87" stroke={lineColor} strokeWidth="0.3" />
      
      {/* Vertical edge line (right side) */}
      <line 
        x1="85" y1="10" 
        x2="85" y2="85" 
        stroke={lineColor} 
        strokeWidth="0.5"
        strokeLinecap="round"
      />
      
      {/* Corner marker */}
      <rect 
        x="83" y="83" 
        width="4" height="4" 
        fill="none" 
        stroke={lineColor} 
        strokeWidth="0.3"
      />
    </g>
  );
}

// Target-Guide: Crosshair + Dashed circle
function TargetGuide({ lineColor }: { lineColor: string }) {
  return (
    <g>
      {/* Crosshair - Horizontal */}
      <line 
        x1="35" y1="50" 
        x2="65" y2="50" 
        stroke={lineColor} 
        strokeWidth="0.4"
        strokeLinecap="round"
      />
      {/* Crosshair - Vertical */}
      <line 
        x1="50" y1="35" 
        x2="50" y2="65" 
        stroke={lineColor} 
        strokeWidth="0.4"
        strokeLinecap="round"
      />
      
      {/* Center dot */}
      <circle 
        cx="50" cy="50" r="1.5" 
        fill={lineColor}
      />
      
      {/* Dashed circle */}
      <circle 
        cx="50" cy="50" r="20" 
        fill="none" 
        stroke={lineColor} 
        strokeWidth="0.4"
        strokeDasharray="3,2"
      />
      
      {/* Outer reference circle */}
      <circle 
        cx="50" cy="50" r="30" 
        fill="none" 
        stroke={lineColor} 
        strokeWidth="0.2"
        strokeDasharray="1,3"
        opacity="0.5"
      />
    </g>
  );
}

// Bubble Level indicator
function BubbleLevel({ isLevel, tiltAngle }: { isLevel: boolean; tiltAngle: number }) {
  // Calculate bubble offset (clamped to visible range)
  const maxOffset = 12;
  const offset = Math.min(Math.max((tiltAngle / 15) * maxOffset, -maxOffset), maxOffset);

  return (
    <div className="absolute top-4 right-4 flex flex-col items-center gap-1">
      <div 
        className={cn(
          "w-10 h-10 rounded-full border-2 flex items-center justify-center relative overflow-hidden",
          isLevel 
            ? "border-green-500 bg-green-500/10" 
            : "border-red-500 bg-red-500/10"
        )}
      >
        {/* Level ring */}
        <div 
          className={cn(
            "w-6 h-6 rounded-full border-2 border-dashed",
            isLevel ? "border-green-400" : "border-red-400"
          )}
        />
        {/* Bubble */}
        <div 
          className={cn(
            "absolute w-3 h-3 rounded-full transition-all duration-150",
            isLevel ? "bg-green-500" : "bg-red-500"
          )}
          style={{
            transform: `translate(${offset}px, ${offset * 0.5}px)`,
          }}
        />
      </div>
      <span 
        className={cn(
          "text-[10px] font-bold",
          isLevel ? "text-green-500" : "text-red-500"
        )}
      >
        {Math.round(tiltAngle)}°
      </span>
    </div>
  );
}
