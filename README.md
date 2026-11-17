# Keem Render — foundation MVP

A browser-based architectural image-to-image rendering workspace.

## Current status

This starter includes:
- Responsive dark architectural studio UI for desktop and mobile.
- Local reference-image upload and preview.
- Prompt, negative prompt, preset, denoise, step and output-size controls.
- Server-side ComfyUI image upload and workflow submission.
- Render-status polling and generated-image proxy.
- An SDXL img2img API-format workflow example.

**Rendering is not active until a ComfyUI server, compatible checkpoint and workflow are configured.** The interface reports when the engine is disconnected instead of showing fake results.

## Free-first hardware strategy

The 8 GB Intel-integrated-graphics laptop should run the web app only. Do not use it for SDXL inference.

For ₦0 experiments, try temporary Kaggle GPU or Google Colab sessions. Free GPU access is limited, interruptible and not a production service. A reliable always-on cloud GPU generally costs money. Keep the app and rendering engine separate so the GPU can move hosts later.

## Requirements

- Node.js 20.9+
- npm
- A ComfyUI server for actual image generation
- An SDXL checkpoint compatible with the workflow, for example `sd_xl_base_1.0.safetensors`

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Without `COMFYUI_URL`, the app remains in UI/preview mode and reports that the engine is not connected.

## Connect ComfyUI

1. Run ComfyUI on a GPU host you control.
2. Install an SDXL checkpoint in `ComfyUI/models/checkpoints/`.
3. Ensure the ComfyUI server is reachable from the Next.js server over a private network or authenticated tunnel.
4. Copy `.env.example` to `.env.local` and set `COMFYUI_URL`.
5. Confirm the workflow node IDs match the values in `.env.example`.
6. Start the app again.

The included workflow uses:
- `1`: CheckpointLoaderSimple
- `2`: LoadImage
- `3`: Positive CLIPTextEncode
- `4`: Negative CLIPTextEncode
- `5`: KSampler
- `6`: VAEEncode
- `7`: VAEDecode
- `8`: SaveImage
- `9`: ImageScale

The width and height controls are connected to ImageScale node 9. The workflow centre-crops to selected dimensions; inspect framing carefully for portrait/landscape references.

## Security

This foundation has no login yet. Do not deploy it as a public rendering service or expose the ComfyUI port to the public internet. The GitHub repository being public does not mean the app should be deployed without access controls.

Before public deployment, implement:
- Authentication and authorization.
- Private storage and row-level security.
- Auth checks on every render and image route.
- Per-user rate limits and upload quotas.
- Private networking or an authenticated gateway between app and ComfyUI.
- Signed result URLs and retention controls.

Never commit `.env.local`, API keys, model files or uploaded architectural images.

## Engineering milestones

1. Test the ComfyUI API workflow and output dimensions.
2. Add ControlNet Canny/Depth conditioning for stronger geometry preservation.
3. Add authentication, projects, private storage and render history.
4. Add a GPU worker lifecycle adapter for free test sessions.
5. Add compare view, selective inpainting and upscaling.

## Licence

All rights reserved by the project owner. Third-party dependencies and model weights remain subject to their own licences. Review each model's licence before commercial use.
