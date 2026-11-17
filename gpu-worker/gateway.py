import hmac
import os
from typing import Iterable

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response

COMFYUI_LOCAL_URL = os.getenv("COMFYUI_LOCAL_URL", "http://127.0.0.1:8188").rstrip("/")
WORKER_TOKEN = os.getenv("KEEM_RENDER_WORKER_TOKEN", "")

app = FastAPI(title="Keem Render GPU Gateway", docs_url=None, redoc_url=None)

ALLOWED = {
    ("POST", "upload/image"),
    ("POST", "prompt"),
    ("GET", "queue"),
    ("GET", "view"),
}
ALLOWED_PREFIXES = (("GET", "history/"),)


def is_allowed(method: str, path: str) -> bool:
    normalized = path.lstrip("/")
    return (method, normalized) in ALLOWED or any(
        method == allowed_method and normalized.startswith(prefix)
        for allowed_method, prefix in ALLOWED_PREFIXES
    )


@app.get("/health")
async def health():
    return {"ok": True, "service": "keem-render-gateway"}


@app.api_route("/{path:path}", methods=["GET", "POST"])
async def proxy(path: str, request: Request):
    if not WORKER_TOKEN:
        return Response("Worker token is not configured.", status_code=503)

    supplied = request.headers.get("authorization", "")
    expected = f"Bearer {WORKER_TOKEN}"
    if not hmac.compare_digest(supplied, expected):
        return Response("Unauthorized.", status_code=401)

    if not is_allowed(request.method, path):
        return Response("Endpoint not allowed.", status_code=404)

    target = f"{COMFYUI_LOCAL_URL}/{path}"
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() in {"content-type", "accept"}
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        upstream = await client.request(
            request.method,
            target,
            params=request.query_params,
            content=await request.body(),
            headers=headers,
        )

    response_headers = {}
    for key in ("content-type", "content-disposition"):
        if key in upstream.headers:
            response_headers[key] = upstream.headers[key]

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
    )
