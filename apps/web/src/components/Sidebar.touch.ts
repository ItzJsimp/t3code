import {
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

export const LONG_PRESS_MS = 450;
const SLOP_PX = 8;
const SWIPE_START_PX = 12;
// How much more horizontal than vertical a move must be to count as a swipe.
const HORIZONTAL_BIAS = 1.5;
const COMMIT_RATIO = 0.4;
const FLICK_MIN_PX = 48;
const FLICK_PX_PER_MS = 0.5;

export interface RowTouchHandlers {
  onLongPress: (point: { x: number; y: number }) => void;
  /** Distance the row follows the finger: zero or negative, never to the right. */
  onSwipeMove: (dx: number) => void;
  onSwipeEnd: (committed: boolean) => void;
}

type Phase = "pending" | "swiping" | "menu" | "scroll" | "done";

/**
 * One touch on a chat row: a still hold opens the row menu, a leftward drag
 * swipes the row, anything else is left to the browser (scroll) or the click.
 * Pure state and timers, so the pointer events and the DOM stay in Sidebar.tsx.
 */
export class RowTouchGesture {
  private phase: Phase = "done";
  private startX = 0;
  private startY = 0;
  private startedAt = 0;
  private lastDx = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private suppressClick = false;
  private menuOpenedAt = -Infinity;

  constructor(
    private readonly handlers: RowTouchHandlers,
    private readonly options: { canSwipe: () => boolean; width: () => number },
  ) {}

  down(x: number, y: number) {
    this.clearTimer();
    this.phase = "pending";
    this.startX = x;
    this.startY = y;
    this.startedAt = Date.now();
    this.lastDx = 0;
    this.suppressClick = false;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.phase !== "pending") return;
      this.phase = "menu";
      this.suppressClick = true;
      this.menuOpenedAt = Date.now();
      this.handlers.onLongPress({ x: this.startX, y: this.startY });
    }, LONG_PRESS_MS);
  }

  move(x: number, y: number) {
    const dx = x - this.startX;
    const dy = y - this.startY;
    if (this.phase === "pending") {
      const distance = Math.hypot(dx, dy);
      if (distance <= SLOP_PX) return;
      this.clearTimer();
      // Wait for a clear direction before choosing swipe or scroll.
      if (distance <= SWIPE_START_PX) return;
      const swipes =
        dx < -SWIPE_START_PX &&
        Math.abs(dx) > Math.abs(dy) * HORIZONTAL_BIAS &&
        this.options.canSwipe();
      this.phase = swipes ? "swiping" : "scroll";
    }
    if (this.phase !== "swiping") return;
    this.lastDx = Math.min(0, dx);
    this.handlers.onSwipeMove(this.lastDx);
  }

  up() {
    this.clearTimer();
    if (this.phase === "swiping") {
      const elapsed = Math.max(Date.now() - this.startedAt, 1);
      const distance = -this.lastDx;
      const committed =
        distance >= this.options.width() * COMMIT_RATIO ||
        (distance >= FLICK_MIN_PX && distance / elapsed >= FLICK_PX_PER_MS);
      this.suppressClick = true;
      this.handlers.onSwipeEnd(committed);
    }
    this.phase = "done";
  }

  cancel() {
    this.clearTimer();
    if (this.phase === "swiping") this.handlers.onSwipeEnd(false);
    this.phase = "done";
  }

  /** True once after a long press or swipe, so the release click does not open the chat. */
  takeClickSuppression() {
    const suppress = this.suppressClick;
    this.suppressClick = false;
    return suppress;
  }

  /** Android also fires `contextmenu` for the same long press: ignore that second one. */
  openedMenuWithin(ms: number) {
    return Date.now() - this.menuOpenedAt < ms;
  }

  private clearTimer() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}

const SETTLE_ANIMATION_MS = 150;
const INTERACTIVE_TARGET = "button, input, textarea, a, [contenteditable='true']";

/**
 * Touch gestures for one chat row. Spread the result on the row element. The
 * row follows the finger by `transform`, set straight on the DOM so a swipe
 * does not re-render the list. Mouse and pen pointers are left alone.
 */
export function useRowTouchGestures(input: {
  rowRef: RefObject<HTMLElement | null>;
  revealRef: RefObject<HTMLElement | null>;
  canSwipe: boolean;
  onLongPress: (point: { x: number; y: number }) => void;
  onSwipeCommit: () => void;
}) {
  const latest = useRef(input);
  latest.current = input;
  const gesture = useMemo(() => {
    const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const place = (dx: number, animate: boolean) => {
      const { rowRef, revealRef } = latest.current;
      const row = rowRef.current;
      const reveal = revealRef.current;
      if (row) {
        row.style.transition =
          animate && !reducedMotion() ? `transform ${SETTLE_ANIMATION_MS}ms ease-out` : "";
        row.style.transform = dx === 0 ? "" : `translateX(${dx}px)`;
      }
      if (reveal) reveal.style.display = dx === 0 ? "" : "flex";
    };
    return new RowTouchGesture(
      {
        onLongPress: (point) => {
          navigator.vibrate?.(10);
          latest.current.onLongPress(point);
        },
        onSwipeMove: (dx) => place(dx, false),
        onSwipeEnd: (committed) => {
          if (!committed) return place(0, true);
          const width = latest.current.rowRef.current?.offsetWidth ?? 0;
          place(-width, true);
          const commit = latest.current.onSwipeCommit;
          // Wait for the slide-out, then give the row back in case the action failed.
          setTimeout(
            () => {
              commit();
              setTimeout(() => place(0, false), 400);
            },
            reducedMotion() ? 0 : SETTLE_ANIMATION_MS,
          );
        },
      },
      {
        canSwipe: () => latest.current.canSwipe,
        width: () => latest.current.rowRef.current?.offsetWidth ?? 0,
      },
    );
  }, []);
  return {
    gesture,
    handlers: {
      onPointerDown: (event: ReactPointerEvent) => {
        if (event.pointerType !== "touch" || !event.isPrimary) return;
        if ((event.target as Element).closest(INTERACTIVE_TARGET)) return;
        gesture.down(event.clientX, event.clientY);
      },
      onPointerMove: (event: ReactPointerEvent) => {
        if (event.pointerType === "touch") gesture.move(event.clientX, event.clientY);
      },
      onPointerUp: (event: ReactPointerEvent) => {
        if (event.pointerType === "touch") gesture.up();
      },
      onPointerCancel: (event: ReactPointerEvent) => {
        if (event.pointerType === "touch") gesture.cancel();
      },
      onClickCapture: (event: ReactMouseEvent) => {
        if (!gesture.takeClickSuppression()) return;
        event.preventDefault();
        event.stopPropagation();
      },
    },
  };
}
