import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 60;

type WorkflowNode = {
  inputs: Record<string, unknown>;
};

function authHeaders(): Record<string, string> {
  const key = process.env.COMFYUI_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : {};
}

export async function POST(request: NextRequest) {
  const base = process.env.COMFYUI_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: "Rendering engine is not connected. Configure COMFYUI_URL and a ComfyUI workflow before submitting a render." }, { status: 503 });

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) return NextResponse.json({ error: "A reference image is required." }, { status: 400 });
  if (image.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Image exceeds the 15 MB MVP limit." }, { status: 413 });

  const workflowPath = process.env.COMFYUI_WORKFLOW_PATH || "./workflows/sdxl-img2img-api.json";
  const absolutePath = path.isAbsolute(workflowPath) ? workflowPath : path.join(process.cwd(), workflowPath);
  let workflow: Record<string, WorkflowNode>;
  try {
    workflow = JSON.parse(await fs.readFile(absolutePath, "utf8")) as Record<string, WorkflowNode>;
  } catch {
    return NextResponse.json({ error: "ComfyUI workflow file is missing or invalid. Check COMFYUI_WORKFLOW_PATH." }, { status: 503 });
  }

  const imageForm = new FormData();
  imageForm.append("image", image, image.name);
  imageForm.append("type", "input");
  imageForm.append("overwrite", "true");
  const uploadResponse = await fetch(`${base}/upload/image`, { method: "POST", headers: authHeaders(), body: imageForm });
  if (!uploadResponse.ok) return NextResponse.json({ error: `ComfyUI image upload failed (${uploadResponse.status}).` }, { status: 502 });
  const uploaded = await uploadResponse.json() as { name: string; subfolder?: string; type?: string };

  const loadId = process.env.COMFYUI_LOAD_IMAGE_NODE || "2";
  const positiveId = process.env.COMFYUI_POSITIVE_PROMPT_NODE || "3";
  const negativeId = process.env.COMFYUI_NEGATIVE_PROMPT_NODE || "4";
  const samplerId = process.env.COMFYUI_SAMPLER_NODE || "5";
  const saveId = process.env.COMFYUI_SAVE_IMAGE_NODE || "8";
  const scaleId = process.env.COMFYUI_IMAGE_SCALE_NODE || "9";

  if (!workflow[loadId] || !workflow[positiveId] || !workflow[negativeId] || !workflow[samplerId] || !workflow[saveId] || !workflow[scaleId]) {
    return NextResponse.json({ error: "Workflow node IDs do not match the configured node mapping." }, { status: 400 });
  }

  workflow[loadId].inputs.image = uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name;
  workflow[positiveId].inputs.text = String(form.get("prompt") || "");
  workflow[negativeId].inputs.text = String(form.get("negativePrompt") || "");
  workflow[samplerId].inputs.denoise = Math.max(0.1, Math.min(1, Number(form.get("denoise") || 0.42)));
  workflow[samplerId].inputs.steps = Math.max(10, Math.min(40, Number(form.get("steps") || 24)));
  workflow[samplerId].inputs.seed = Math.floor(Math.random() * 2 ** 32);
  workflow[scaleId].inputs.width = Math.max(512, Math.min(1280, Number(form.get("width") || 1024)));
  workflow[scaleId].inputs.height = Math.max(512, Math.min(1280, Number(form.get("height") || 1024)));
  workflow[saveId].inputs.filename_prefix = `keem-render/${Date.now()}`;

  const queued = await fetch(`${base}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ prompt: workflow, client_id: process.env.COMFYUI_CLIENT_ID || "keem-render" })
  });
  const result = await queued.json();
  if (!queued.ok || result.error) return NextResponse.json({ error: "ComfyUI rejected the workflow.", details: result }, { status: 502 });
  return NextResponse.json({ promptId: result.prompt_id, queueNumber: result.number, status: "queued" });
}