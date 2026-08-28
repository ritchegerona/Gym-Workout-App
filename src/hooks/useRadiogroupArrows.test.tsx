import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRef, type RefObject } from "react";
import { useRadiogroupArrows } from "./useRadiogroupArrows";

function RadiogroupFixture({
  onSelect,
}: {
  onSelect: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  useRadiogroupArrows(ref);
  const options = ["one", "two", "three"];
  return (
    <div ref={ref} role="radiogroup" aria-label="test">
      {options.map((o) => (
        <button key={o} role="radio" aria-checked={false} onClick={() => onSelect(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

describe("useRadiogroupArrows", () => {
  it("moves focus and selection on arrow keys, wrapping at the edges", () => {
    const selected: string[] = [];
    render(<RadiogroupFixture onSelect={(v) => selected.push(v)} />);

    screen.getByRole("radio", { name: "one" }).focus();
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });
    expect(selected).toEqual(["two"]);
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "two" }));

    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowLeft" });
    expect(selected).toEqual(["two", "one"]);
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "one" }));

    // Wrap forward past the end
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "Home" });
    expect(selected).toEqual(["two", "one", "one"]);
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "End" });
    expect(selected).toEqual(["two", "one", "one", "three"]);
  });

  it("does nothing when focus is not inside the group", () => {
    const selected: string[] = [];
    render(<RadiogroupFixture onSelect={(v) => selected.push(v)} />);
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });
    expect(selected).toEqual([]);
  });
});