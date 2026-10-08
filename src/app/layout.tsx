import type { ReactNode } from "react";

/*
 * Pass-through root layout.
 *
 * The dashboard branch (/[locale]) and the guest branch (/s/...) each render
 * their own <html>, because a guest page's language is whatever the owner
 * published, which is independent of the language the owner uses the app in.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
