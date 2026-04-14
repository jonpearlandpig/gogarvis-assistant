import { useEffect, useRef } from "react";

interface SwipeOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  threshold?: number;
  edgeZone?: number;
  enabled?: boolean;
}

export function useSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
  threshold = 60,
  edgeZone = 30,
  enabled = true,
}: SwipeOptions) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const startX = touch.clientX;
      // Only trigger swipe-right from left edge
      const isLeftEdge = startX <= edgeZone;
      // Only trigger swipe-left from right edge
      const isRightEdge = startX >= window.innerWidth - edgeZone;

      if (!isLeftEdge && !isRightEdge) return;

      touchStart.current = { x: startX, y: touch.clientY, time: Date.now() };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = Math.abs(touch.clientY - touchStart.current.y);
      const dt = Date.now() - touchStart.current.time;

      touchStart.current = null;

      // Ignore vertical swipes or slow drags
      if (dy > Math.abs(dx) || dt > 500) return;

      if (dx > threshold) {
        onSwipeRight?.();
      } else if (dx < -threshold) {
        onSwipeLeft?.();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, onSwipeRight, onSwipeLeft, threshold, edgeZone]);
}
