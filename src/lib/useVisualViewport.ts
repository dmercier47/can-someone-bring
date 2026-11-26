"use client";

import { useEffect, useState } from "react";

export type VisibleArea = {
  /** Height of the part of the screen the user can actually see (shrinks when the keyboard opens). */
  height: number;
  /** How far the visible area is scrolled down from the top of the layout viewport. */
  top: number;
  /** True when an on-screen keyboard is (very likely) covering part of the page. */
  keyboardOpen: boolean;
};

/**
 * On iOS Safari the on-screen keyboard overlays the page instead of resizing it, so
 * `position: fixed; bottom: 0` ends up hidden behind the keyboard. This tracks the
 * visual viewport so overlays can sit exactly in the visible area, above the keyboard.
 * Returns null on the server and in browsers without the VisualViewport API.
 */
export function useVisualViewport(): VisibleArea | null {
  const [area, setArea] = useState<VisibleArea | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setArea((prev) => {
        const next = {
          height: Math.round(vv.height),
          top: Math.round(vv.offsetTop),
          // Pinch-zoom also shrinks vv.height, so ignore that case.
          keyboardOpen: vv.scale <= 1.01 && window.innerHeight - vv.height > 120,
        };
        // Skip re-renders when nothing visible changed.
        return prev && prev.height === next.height && prev.top === next.top && prev.keyboardOpen === next.keyboardOpen
          ? prev
          : next;
      });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return area;
}
