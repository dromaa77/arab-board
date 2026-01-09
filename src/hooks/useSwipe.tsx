import { useState, useRef, useCallback, TouchEvent } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  isSwiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  deltaX: number;
  deltaY: number;
}

export function useSwipe(handlers: SwipeHandlers, threshold = 50) {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    isSwiping: false,
    direction: null,
    deltaX: 0,
    deltaY: 0,
  });

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setSwipeState(prev => ({ ...prev, isSwiping: true }));
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart.current) return;

    const deltaX = e.touches[0].clientX - touchStart.current.x;
    const deltaY = e.touches[0].clientY - touchStart.current.y;

    let direction: SwipeState['direction'] = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    setSwipeState({
      isSwiping: true,
      direction,
      deltaX,
      deltaY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current) return;

    const { deltaX, deltaY, direction } = swipeState;

    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (direction === 'left') handlers.onSwipeLeft?.();
      if (direction === 'right') handlers.onSwipeRight?.();
    } else if (Math.abs(deltaY) > threshold) {
      if (direction === 'up') handlers.onSwipeUp?.();
      if (direction === 'down') handlers.onSwipeDown?.();
    }

    touchStart.current = null;
    setSwipeState({
      isSwiping: false,
      direction: null,
      deltaX: 0,
      deltaY: 0,
    });
  }, [swipeState, handlers, threshold]);

  return {
    swipeState,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
