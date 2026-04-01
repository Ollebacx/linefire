import React, { useEffect, useRef } from 'react';

interface BackgroundAnimationProps {
  viewportWidth: number;
  viewportHeight: number;
}

const COLORS = ['#00FFCC', '#00E5FF', '#80FF44', '#FF2055', '#FF9500', '#00AAFF'];
const GRID_SIZE = 50;
const NUM_PARTICLES = 40;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  color: string;
  alpha: number;
  pulseOffset: number;
}

const BackgroundAnimation: React.FC<BackgroundAnimationProps> = ({ viewportWidth, viewportHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewportWidth === 0 || viewportHeight === 0) return;

    canvas.width = viewportWidth;
    canvas.height = viewportHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Init particles
    particlesRef.current = Array.from({ length: NUM_PARTICLES }, () => ({
      x: Math.random() * viewportWidth,
      y: Math.random() * viewportHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.5 + Math.random() * 2.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.25 + Math.random() * 0.45,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    let frame = 0;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      // Background
      ctx.fillStyle = '#080A14';
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      // Dot grid
      ctx.fillStyle = '#1E3A5F';
      for (let gx = GRID_SIZE; gx < viewportWidth; gx += GRID_SIZE) {
        for (let gy = GRID_SIZE; gy < viewportHeight; gy += GRID_SIZE) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Particles
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = viewportWidth;
        if (p.x > viewportWidth) p.x = 0;
        if (p.y < 0) p.y = viewportHeight;
        if (p.y > viewportHeight) p.y = 0;

        const pulse = 0.6 + 0.4 * Math.sin(frame * 0.025 + p.pulseOffset);
        const alpha = p.alpha * pulse;
        const glowR = p.r * 5;

        // Outer glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        grad.addColorStop(0, p.color + Math.round(alpha * 0.6 * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(1, p.color + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Subtle horizontal scan lines
      for (let sy = 0; sy < viewportHeight; sy += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, sy, viewportWidth, 1);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [viewportWidth, viewportHeight]);

  if (!viewportWidth || !viewportHeight) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
};

export default React.memo(BackgroundAnimation);