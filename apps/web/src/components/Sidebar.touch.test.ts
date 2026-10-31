import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { LONG_PRESS_MS, RowTouchGesture } from "./Sidebar.touch";

const WIDTH = 300;

function setup(canSwipe = true) {
  const handlers = {
    onLongPress: vi.fn(),
    onSwipeMove: vi.fn(),
    onSwipeEnd: vi.fn(),
  };
  const gesture = new RowTouchGesture(handlers, { canSwipe: () => canSwipe, width: () => WIDTH });
  return { gesture, handlers };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

it("opens the menu after a still long press and swallows the release click", () => {
  const { gesture, handlers } = setup();
  gesture.down(100, 50);
  vi.advanceTimersByTime(LONG_PRESS_MS);
  expect(handlers.onLongPress).toHaveBeenCalledWith({ x: 100, y: 50 });
  gesture.up();
  expect(gesture.takeClickSuppression()).toBe(true);
  expect(gesture.takeClickSuppression()).toBe(false);
  expect(gesture.openedMenuWithin(1000)).toBe(true);
  vi.advanceTimersByTime(1000);
  expect(gesture.openedMenuWithin(1000)).toBe(false);
});

it("cancels the long press when the finger moves past the slop", () => {
  const { gesture, handlers } = setup();
  gesture.down(100, 50);
  gesture.move(100, 70);
  vi.advanceTimersByTime(LONG_PRESS_MS * 2);
  expect(handlers.onLongPress).not.toHaveBeenCalled();
  expect(handlers.onSwipeMove).not.toHaveBeenCalled();
});

it("a quick tap does nothing and lets the click through", () => {
  const { gesture, handlers } = setup();
  gesture.down(100, 50);
  vi.advanceTimersByTime(100);
  gesture.up();
  vi.advanceTimersByTime(LONG_PRESS_MS * 2);
  expect(handlers.onLongPress).not.toHaveBeenCalled();
  expect(gesture.takeClickSuppression()).toBe(false);
});

it("a leftward swipe past 40 percent of the width commits", () => {
  const { gesture, handlers } = setup();
  gesture.down(250, 50);
  gesture.move(200, 52);
  expect(handlers.onSwipeMove).toHaveBeenLastCalledWith(-50);
  vi.advanceTimersByTime(600);
  gesture.move(120, 52);
  expect(handlers.onSwipeMove).toHaveBeenLastCalledWith(-130);
  gesture.up();
  expect(handlers.onSwipeEnd).toHaveBeenCalledWith(true);
  expect(handlers.onLongPress).not.toHaveBeenCalled();
  expect(gesture.takeClickSuppression()).toBe(true);
});

it("a swipe that grows in small steps still starts", () => {
  const { gesture, handlers } = setup();
  gesture.down(250, 50);
  gesture.move(241, 50);
  expect(handlers.onSwipeMove).not.toHaveBeenCalled();
  gesture.move(236, 51);
  expect(handlers.onSwipeMove).toHaveBeenLastCalledWith(-14);
  gesture.move(230, 51);
  expect(handlers.onSwipeMove).toHaveBeenLastCalledWith(-20);
  vi.advanceTimersByTime(LONG_PRESS_MS * 2);
  expect(handlers.onLongPress).not.toHaveBeenCalled();
});

it("a short slow swipe springs back", () => {
  const { gesture, handlers } = setup();
  gesture.down(250, 50);
  gesture.move(230, 50);
  vi.advanceTimersByTime(600);
  gesture.move(215, 50);
  gesture.up();
  expect(handlers.onSwipeEnd).toHaveBeenCalledWith(false);
});

it("a fast flick commits even when short", () => {
  const { gesture, handlers } = setup();
  gesture.down(250, 50);
  vi.advanceTimersByTime(60);
  gesture.move(190, 50);
  gesture.up();
  expect(handlers.onSwipeEnd).toHaveBeenCalledWith(true);
});

it("never moves the row to the right", () => {
  const { gesture, handlers } = setup();
  gesture.down(100, 50);
  gesture.move(160, 50);
  expect(handlers.onSwipeMove).not.toHaveBeenCalled();
});

it("vertical movement starts nothing, so the list scrolls", () => {
  const { gesture, handlers } = setup();
  gesture.down(100, 50);
  gesture.move(104, 120);
  gesture.up();
  expect(handlers.onSwipeMove).not.toHaveBeenCalled();
  expect(handlers.onSwipeEnd).not.toHaveBeenCalled();
  expect(gesture.takeClickSuppression()).toBe(false);
});

it("a row that cannot swipe still opens the menu but does not move", () => {
  const { gesture, handlers } = setup(false);
  gesture.down(250, 50);
  gesture.move(150, 50);
  expect(handlers.onSwipeMove).not.toHaveBeenCalled();
  const second = setup(false);
  second.gesture.down(100, 50);
  vi.advanceTimersByTime(LONG_PRESS_MS);
  expect(second.handlers.onLongPress).toHaveBeenCalledTimes(1);
});

it("a cancelled pointer ends an active swipe without committing", () => {
  const { gesture, handlers } = setup();
  gesture.down(250, 50);
  gesture.move(100, 50);
  gesture.cancel();
  expect(handlers.onSwipeEnd).toHaveBeenCalledWith(false);
});
