import { NextRequest } from "next/server";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const base = process.env.COMFYUI_URL?.replace(/\/$/, "");
  if (!base) return new Response("Rendering engine is not connected.", { status: 503 });
  const params = request.nextUrl.searchParams;
  const filename = params.get("filename");
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) return new Response("Invalid image filename.", { status: 400 });
  const view = new URL(`${base}/view`);
  view.searchParams.set("filename", filename);
  view.searchParams.set("subfolder", params.get("subfolder") || "");
  view.searchParams.set("type", params.get("type") || "output");
  const key = process.env.COMFYUI_API_KEY;
  const upstream = await fetch(view, { headers: key ? { Authorization: `Bearer ${key}` } : {}, cache: "no-store" });
  if (!upstream.ok) return new Response("Unable to retrieve generated image.", { status: 502 });
  return new Response(await upstream.arrayBuffer(), {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/png",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}