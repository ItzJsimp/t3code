// @vitest-environment jsdom
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { SidebarPointerSensor } from "./Sidebar.pointer";
import { LONG_PRESS_MS, useRowTouchGestures } from "./Sidebar.touch";

const onLongPress = vi.fn();
const onSwipeCommit = vi.fn();
const onClick = vi.fn();
let canSwipe = true;

function Row() {
  const rowRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const { handlers } = useRowTouchGestures({
    rowRef,
    revealRef,
    canSwipe,
    onLongPress,
    onSwipeCommit,
  });
  return (
    <div>
      <div ref={revealRef} data-testid="reveal" />
      <div ref={rowRef} data-testid="row" {...handlers} onClick={onClick} />
    </div>
  );
}

let root: Root;
let container: HTMLDivElement;

function fire(type: string, init: { x: number; y: number; pointerType?: string }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    clientX: init.x,
    clientY: init.y,
    pointerType: init.pointerType ?? "touch",
    isPrimary: true,
    button: 0,
  });
  act(() => {
    container.querySelector('[data-testid="row"]')!.dispatchEvent(event);
  });
}
const row = () => container.querySelector<HTMLElement>('[data-testid="row"]')!;
const reveal = () => container.querySelector<HTMLElement>('[data-testid="reveal"]')!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  canSwipe = true;
  onLongPress.mockClear();
  onSwipeCommit.mockClear();
  onClick.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<Row />));
  Object.defineProperty(row(), "offsetWidth", { configurable: true, value: 300 });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("a long press on touch opens the menu where the finger is and swallows the click", () => {
  fire("pointerdown", { x: 120, y: 40 });
  act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
  expect(onLongPress).toHaveBeenCalledWith({ x: 120, y: 40 });
  fire("pointerup", { x: 120, y: 40 });
  act(() => row().click());
  expect(onClick).not.toHaveBeenCalled();
});

it("a left swipe past the threshold slides the row out and commits", () => {
  fire("pointerdown", { x: 280, y: 40 });
  fire("pointermove", { x: 200, y: 42 });
  expect(row().style.transform).toBe("translateX(-80px)");
  expect(reveal().style.display).toBe("flex");
  fire("pointermove", { x: 100, y: 42 });
  fire("pointerup", { x: 100, y: 42 });
  expect(row().style.transform).toBe("translateX(-300px)");
  act(() => vi.advanceTimersByTime(200));
  expect(onSwipeCommit).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(500));
  expect(row().style.transform).toBe("");
  expect(reveal().style.display).toBe("");
});

it("a short swipe springs back without committing", () => {
  fire("pointerdown", { x: 280, y: 40 });
  fire("pointermove", { x: 250, y: 40 });
  act(() => vi.advanceTimersByTime(800));
  fire("pointerup", { x: 250, y: 40 });
  expect(row().style.transform).toBe("");
  act(() => vi.advanceTimersByTime(600));
  expect(onSwipeCommit).not.toHaveBeenCalled();
});

it("a row that cannot swipe stays put", () => {
  canSwipe = false;
  act(() => root.render(<Row />));
  fire("pointerdown", { x: 280, y: 40 });
  fire("pointermove", { x: 100, y: 40 });
  expect(row().style.transform).toBe("");
  fire("pointerup", { x: 100, y: 40 });
  expect(onSwipeCommit).not.toHaveBeenCalled();
});

it("mouse and pen pointers never start a touch gesture", () => {
  fire("pointerdown", { x: 120, y: 40, pointerType: "mouse" });
  act(() => vi.advanceTimersByTime(LONG_PRESS_MS * 2));
  fire("pointermove", { x: 20, y: 40, pointerType: "mouse" });
  expect(onLongPress).not.toHaveBeenCalled();
  expect(row().style.transform).toBe("");
});

it("the row drag sensor ignores touch pointers and keeps mouse", () => {
  const activator = SidebarPointerSensor.activators[0];
  if (!activator) throw new Error("the sensor has no activator");
  const { handler } = activator;
  const event = (pointerType: string) =>
    ({ nativeEvent: { isPrimary: true, button: 0, pointerType } }) as never;
  expect(handler(event("touch"))).toBe(false);
  expect(handler(event("mouse"))).toBe(true);
  expect(handler(event("pen"))).toBe(true);
});
