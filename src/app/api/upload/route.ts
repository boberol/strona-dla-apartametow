import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { saveUpload } from "@/lib/storage";

export async function POST(request: Request) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no-file" }, { status: 400 });
  }

  const saved = await saveUpload(file);
  if (!saved.ok) return NextResponse.json({ error: saved.reason }, { status: 400 });

  return NextResponse.json({ url: saved.url });
}
