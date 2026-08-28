import { useEffect, type RefObject } from "react";

/**
 * Adds WAI-ARIA radiogroup arrow-key navigation (Left/Right/Home/End) to the
 * `[role="radio"]` children inside the given container. Focus moves roving and
 * the target is selected via a click, keeping `aria-checked` and value in sync.
 */
export function useRadiogroupArrows(
  ref: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const radios = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'),
      ).filter(
        (r) => r.getAttribute("aria-disabled") !== "true",
      );

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight" &&
        e.key !== "Home" &&
        e.key !== "End"
      ) {
        return;
      }
      const items = radios();
      const currentIdx = items.indexOf(document.activeElement as HTMLElement);
      if (items.length === 0 || currentIdx < 0) return;
      e.preventDefault();
      let nextIdx = currentIdx;
      if (e.key === "ArrowRight") nextIdx = (currentIdx + 1) % items.length;
      else if (e.key === "ArrowLeft")
        nextIdx = (currentIdx - 1 + items.length) % items.length;
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = items.length - 1;
      const next = items[nextIdx];
      next.focus();
      next.click();
    };

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [ref]);
}