import { notFound } from "next/navigation";

/** Any /{locale}/... path no page claims gets the localized 404, not a bare one. */
export default function CatchAll() {
  notFound();
}
