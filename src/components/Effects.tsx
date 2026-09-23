"use client";

import { useEffect } from "react";

/**
 * Motion layer. Everything is readable without it: blocks below the fold rise in,
 * numbers count up and charts replay when they scroll into view.
 */
export function Effects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const countUp = (el: Element) => {
      const to = Number(el.getAttribute("data-count"));
      if (!Number.isFinite(to)) return;
      let t0: number | null = null;
      const step = (t: number) => {
        t0 ??= t;
        const k = 1 - Math.pow(1 - Math.min(1, (t - t0) / 1400), 3);
        el.textContent = String(Math.round(to * k));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const vh = window.innerHeight;
    const rises = Array.from(document.querySelectorAll(".rise")).filter((el) => el.getBoundingClientRect().top > vh);
    rises.forEach((el) => el.classList.add("pre"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.remove("pre");
          io.unobserve(e.target);
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    rises.forEach((el) => io.observe(el));

    const players = document.querySelectorAll("[data-play]");
    const io2 = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("play");
          e.target.querySelectorAll("[data-count]").forEach(countUp);
          io2.unobserve(e.target);
        }),
      { threshold: 0.2 },
    );
    players.forEach((el) => io2.observe(el));

    return () => {
      io.disconnect();
      io2.disconnect();
    };
  }, []);
  return null;
}
