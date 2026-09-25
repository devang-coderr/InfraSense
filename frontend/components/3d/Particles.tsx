"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  o: number;
}

export function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isDark = resolvedTheme !== "light";

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const count = reduceMotion ? 0 : Math.min(90, Math.floor(width / 16));
    const particles: P[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: isDark ? (Math.random() - 0.5) * 0.05 : 0.25 + Math.random() * 0.3,
      vy: isDark ? (Math.random() - 0.5) * 0.05 : 0.4 + Math.random() * 0.3,
      r: Math.random() * 1.4 + 0.4,
      o: Math.random() * 0.5 + 0.2,
    }));

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    const color = isDark ? "244,241,232" : "200,138,42";

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        const dx = (mouse.current.x - p.x) * 0.00002;
        const dy = (mouse.current.y - p.y) * 0.00002;
        p.x += p.vx + dx;
        p.y += p.vy + dy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        ctx.beginPath();
        if (!isDark) {
          ctx.strokeStyle = `rgba(${color},${p.o * 0.6})`;
          ctx.lineWidth = p.r * 0.6;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${color},${p.o})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      raf = requestAnimationFrame(draw);
    };
    if (!reduceMotion) draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-70"
    />
  );
}
