import { cx } from "../app/utils";

export function Dot({ tone }: { tone: "ok" | "warn" | "bad" | "neutral" | "blue" | "purple" }) {
  return <span className={cx("dot", `dot-${tone}`)} aria-hidden="true" />;
}

