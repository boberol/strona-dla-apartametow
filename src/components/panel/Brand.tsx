import Link from "next/link";
import { PanelIcon } from "./icons";

/** The StayGuide wordmark, linking home. */
export function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--p-accent)] text-[var(--p-on-accent)]">
        <PanelIcon name="qr" size={15} />
      </span>
      StayGuide
    </Link>
  );
}
