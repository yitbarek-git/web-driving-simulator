import { useEffect, useRef } from 'react';
import { HIGHWAY_TRACK } from '../../game/track';

interface MinimapProps {
  carX: number;
  carZ: number;
  carYaw: number;
  target?: { x: number; z: number };
}

export function Minimap({ carX, carZ, carYaw, target }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const { minX, maxX, minZ, maxZ } = HIGHWAY_TRACK.bounds;
    const pad = 16;
    const spanX = maxX - minX;
    const spanZ = maxZ - minZ;
    const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);

    const offsetX = (w - spanX * scale) / 2 - minX * scale;
    const offsetZ = (h - spanZ * scale) / 2 - minZ * scale;

    const toScreenX = (wx: number) => wx * scale + offsetX;
    const toScreenY = (wz: number) => wz * scale + offsetZ;

    // Highway loop base shadow
    ctx.beginPath();
    HIGHWAY_TRACK.minimapPoints.forEach((pt, idx) => {
      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.z);
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Inner road ribbon
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    HIGHWAY_TRACK.samples.forEach((sample, index) => {
      if (index % 90 !== 0) return;
      ctx.beginPath();
      ctx.arc(toScreenX(sample.point.x), toScreenY(sample.point.z), 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.44)';
      ctx.fill();
    });

    if (target) {
      ctx.beginPath();
      ctx.arc(toScreenX(target.x), toScreenY(target.z), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Start/finish marker
    const start = HIGHWAY_TRACK.samples[0].point;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(toScreenX(start.x) - 2.5, toScreenY(start.z) - 2.5, 5, 5);

    // Player directional triangle
    const px = toScreenX(carX);
    const py = toScreenY(carZ);

    ctx.save();
    ctx.translate(px, py);
    // In screen space: forward (-Z) is -Y, right (+X) is +X
    // World forward = (-sin(yaw), -cos(yaw)) -> screen angle = -yaw
    ctx.rotate(-carYaw);

    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.8, 5);
    ctx.lineTo(0, 2.6);
    ctx.lineTo(-4.8, 5);
    ctx.closePath();
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }, [carX, carZ, carYaw, target]);

  return (
    <div className="w-[116px] rounded-lg border border-white/10 bg-zinc-950/85 p-1.5 shadow-lg sm:w-[164px] sm:p-2">
      <div className="mb-1 flex items-center justify-between gap-1 px-1 text-[10px] font-medium text-zinc-400 sm:text-[11px]">
        <span>Highway Loop</span>
        <span className="font-mono-tabular text-zinc-300">
          {(HIGHWAY_TRACK.totalLength / 1000).toFixed(1)} km
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={148}
        height={124}
        className="block h-auto w-full rounded bg-zinc-900/90"
        role="img"
        aria-label="Highway navigation minimap"
      />
    </div>
  );
}
