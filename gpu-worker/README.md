# Keem Render — temporary Kaggle GPU worker

This worker is for controlled experiments, not a permanent production service. It keeps ComfyUI bound to localhost and exposes only a small, bearer-token-protected API through a temporary Cloudflare Quick Tunnel.

## Why Kaggle first?

Kaggle currently documents free GPU notebook access, including P100 hardware, but availability and weekly quota are limited. A free GPU session can stop or queue; it is not an always-on rendering server. See the official [Kaggle notebook guide](https://www.kaggle.com/docs/notebooks) and [GPU usage guidance](https://www.kaggle.com/docs/efficient-gpu-usage).

## Notebook setup

1. Create a Kaggle Notebook and enable **Settings → Accelerator → GPU**.
2. Enable Internet in the notebook settings.
3. Add two Kaggle Secrets (do not paste them into notebook cells):
   - `HF_TOKEN`: your Hugging Face access token, after accepting the SDXL model licence.
   - `KEEM_RENDER_WORKER_TOKEN`: a long random secret. Use the same value later as Vercel's `COMFYUI_API_KEY`. Do not commit it or send it in chat.
4. Clone ComfyUI and install its requirements:

```bash
!git clone https://github.com/comfyanonymous/ComfyUI.git /kaggle/working/ComfyUI
%cd /kaggle/working/ComfyUI
!pip install -r requirements.txt
!mkdir -p models/checkpoints
```

5. Download the official SDXL Base 1.0 checkpoint after accepting its licence on Hugging Face:

```python
from kaggle_secrets import UserSecretsClient
import os
from huggingface_hub import hf_hub_download

secrets = UserSecretsClient()
hf_token = secrets.get_secret("HF_TOKEN")
checkpoint = hf_hub_download(
    repo_id="stabilityai/stable-diffusion-xl-base-1.0",
    filename="sd_xl_base_1.0.safetensors",
    token=hf_token,
    local_dir="/kaggle/working/ComfyUI/models/checkpoints",
)
print("Checkpoint ready:", checkpoint)
```

6. Start ComfyUI locally. It must not listen on a public interface:

```bash
%cd /kaggle/working/ComfyUI
!python main.py --listen 127.0.0.1 --port 8188
```

Keep that cell running. In a second cell, clone this project and install the gateway dependencies:

```bash
!git clone https://github.com/thayoungwizard/keem-render.git /kaggle/working/keem-render
!pip install fastapi uvicorn httpx
%cd /kaggle/working/keem-render/gpu-worker
```

Then start the protected gateway (retrieve the token from Kaggle Secrets in Python, never print it):

```python
import os
from kaggle_secrets import UserSecretsClient

secrets = UserSecretsClient()
os.environ["KEEM_RENDER_WORKER_TOKEN"] = secrets.get_secret("KEEM_RENDER_WORKER_TOKEN")
os.environ["COMFYUI_LOCAL_URL"] = "http://127.0.0.1:8188"
```

Run the gateway from the directory containing `gateway.py`:

```bash
!uvicorn gateway:app --host 127.0.0.1 --port 8189
```

For the temporary tunnel, use a third cell. Install Cloudflare's tunnel client and start a Quick Tunnel to port 8189:

```bash
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
!chmod +x /usr/local/bin/cloudflared
!cloudflared tunnel --url http://127.0.0.1:8189 --no-autoupdate
```

Cloudflare prints a temporary `trycloudflare.com` URL. The URL changes when the tunnel restarts. The tunnel is public at the network layer, but the gateway rejects requests without the secret bearer token. ComfyUI itself remains bound to localhost.

## Important: do not connect Vercel yet

The current app still needs single-user access protection and server-side rate limiting before a public deployment is allowed to trigger GPU jobs. Do not add `COMFYUI_URL` or `COMFYUI_API_KEY` to Vercel until that protection is in place.

When the app is protected, Vercel will need:
- `COMFYUI_URL`: the temporary Cloudflare URL (without a trailing slash)
- `COMFYUI_API_KEY`: the same secret stored in Kaggle's `KEEM_RENDER_WORKER_TOKEN`

The worker is ephemeral. Stop the notebook when finished to release the GPU quota. Never expose port 8188 directly, print the worker token, or commit secrets, model weights, or architectural source images.
