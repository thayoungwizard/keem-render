import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ promptId: string }> }) {
  const { promptId } = await context.params;
  const base = process.env.COMFYUI_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "Rendering engine is not connected." }, { status: 503 });
  const key = process.env.COMFYUI_API_KEY;
  const response = await fetch(`${base}/history/${encodeURIComponent(promptId)}`, {
    cache: "no-store",
    headers: key ? { Authorization: `Bearer ${key}` } : {}
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to read ComfyUI render history." }, { status: 502 });
  const history = await response.json();
  const item = history[promptId];
  if (!item) {
    const queueResponse = await fetch(`${base}/queue`, { cache: "no-store", headers: key ? { Authorization: `Bearer ${key}` } : {} });
    const queue = queueResponse.ok ? await queueResponse.json() : {};
    const running = (queue.queue_running || []).some((entry: any[]) => entry[1] === promptId);
    return NextResponse.json({ status: running ? "running" : "queued" });
  }
  if (item.status?.status_str === "error") return NextResponse.json({ status: "error", error: "ComfyUI reported an execution error." });
  const outputs = item.outputs || {};
  for (const node of Object.values(outputs) as any[]) {
    const image = node.images?.[0];
    if (image) {
      const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || "", type: image.type || "output" });
      return NextResponse.json({ status: "complete", imageUrl: `/api/render-image?${query.toString()}` });
    }
  }
  return NextResponse.json({ status: "running" });
}