import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRestTimer } from "./useRestTimer";
import { useActiveWorkout } from "../stores/activeWorkout";
import { useSettings } from "../stores/settings";

beforeEach(() => {
  useActiveWorkout.getState().skipRest();
  useSettings.setState({
    soundEnabled: false,
    vibrationEnabled: false,
    notificationsEnabled: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useRestTimer", () => {
  it("is inactive by default", () => {
    const { result } = renderHook(() => useRestTimer());
    expect(result.current.isActive).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it("counts down while active", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRestTimer());
    act(() => {
      useActiveWorkout.getState().startRest(60);
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isActive).toBe(true);
    expect(result.current.remainingMs).toBeLessThanOrEqual(58_000);
    expect(result.current.remainingMs).toBeGreaterThan(57_000);
  });

  it("reaches zero but stays active until skipped", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useRestTimer());
    act(() => {
      useActiveWorkout.getState().startRest(30);
    });
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.isActive).toBe(true);
    act(() => {
      result.current.skip();
    });
    expect(result.current.isActive).toBe(false);
  });

  it("adds and subtracts time", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => {
      useActiveWorkout.getState().startRest(60);
    });
    act(() => {
      result.current.add(15);
    });
    const afterAdd = useActiveWorkout.getState().restEndsAt!;
    act(() => {
      result.current.subtract(30);
    });
    const afterSub = useActiveWorkout.getState().restEndsAt!;
    // add(15) then subtract(30) → net 30s apart
    expect(afterAdd - afterSub).toBe(30_000);
  });

  it("skips instead of going negative on subtract", () => {
    const { result } = renderHook(() => useRestTimer());
    act(() => {
      useActiveWorkout.getState().startRest(10);
    });
    act(() => {
      result.current.subtract(60);
    });
    expect(useActiveWorkout.getState().restEndsAt).toBeNull();
  });
});
