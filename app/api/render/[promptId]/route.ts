import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ComfyImage = {
  filename: string;
  subfolder?: string;
  type?: string;
};

type ComfyHistoryItem = {
  status?: { status_str?: string };
  outputs?: Record<string, { images?: ComfyImage[] }>;
};

type ComfyQueue = {
  queue_running?: unknown[];
};

export async function GET(_request: NextRequest, context: { params: Promise<{ promptId: string }> }) {
  const { promptId } = await context.params;
  const base = process.env.COMFYUI_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "Rendering engine is not connected." }, { status: 503 });

  const key = process.env.COMFYUI_API_KEY;
  const headers = key ? { Authorization: `Bearer ${key}` } : {};
  const response = await fetch(`${base}/history/${encodeURIComponent(promptId)}`, {
    cache: "no-store",
    headers
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to read ComfyUI render history." }, { status: 502 });

  const history = await response.json() as Record<string, ComfyHistoryItem>;
  const item = history[promptId];

  if (!item) {
    const queueResponse = await fetch(`${base}/queue`, { cache: "no-store", headers });
    const queue = queueResponse.ok ? await queueResponse.json() as ComfyQueue : {};
    const running = (queue.queue_running ?? []).some(
      (entry) => Array.isArray(entry) && entry[1] === promptId
    );
    return NextResponse.json({ status: running ? "running" : "queued" });
  }

  if (item.status?.status_str === "error") {
    return NextResponse.json({ status: "error", error: "ComfyUI reported an execution error." });
  }

  for (const node of Object.values(item.outputs ?? {})) {
    const image = node.images?.[0];
    if (image) {
      const query = new URLSearchParams({
        filename: image.filename,
        subfolder: image.subfolder || "",
        type: image.type || "output"
      });
      return NextResponse.json({ status: "complete", imageUrl: `/api/render-image?${query.toString()}` });
    }
  }

  return NextResponse.json({ status: "running" });
}