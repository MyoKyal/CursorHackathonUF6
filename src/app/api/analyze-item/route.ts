import { analyzeItemPhoto } from "@/lib/analyze-item";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a photo first." }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo must be under 8 MB." }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    const analysis = await analyzeItemPhoto(buf.toString("base64"), mime);
    return NextResponse.json(analysis);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not analyze the photo." },
      { status: 502 },
    );
  }
}
