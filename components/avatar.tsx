import { hashColor, initials } from "@/lib/format";

export function Avatar({ name, size = 48, round = false }: { name: string; size?: number; round?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center font-semibold text-white select-none ${round ? "rounded-full" : "rounded-2xl"}`}
      style={{ width: size, height: size, background: hashColor(name), fontSize: size * 0.34, boxShadow: "inset 0 -8px 14px rgb(0 0 0 / .14), inset 0 1px 0 rgb(255 255 255 / .25)" }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
