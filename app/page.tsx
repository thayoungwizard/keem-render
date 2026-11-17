"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Aperture, ArrowUpRight, Check, ChevronDown, CircleHelp, Clock3, Columns2,
  Download, FileImage, ImagePlus, Layers3, LoaderCircle, LockKeyhole, Menu,
  MoreHorizontal, PanelLeft, Plus, ScanLine, Settings2, ShieldCheck,
  SlidersHorizontal, Sparkles, Sun, WandSparkles, X
} from "lucide-react";

type RenderState = "idle" | "uploading" | "queued" | "running" | "complete" | "error";
const presets = ["Photorealistic", "Clay to photo", "Material study", "Golden hour"];
const defaultPrompt = "Photorealistic architectural photography of the exact building shown. Preserve the original massing, geometry, floor count, roof form, façade composition, window and door positions, structural proportions, and camera perspective. Improve only materials, lighting, realistic reflections, planting and environmental context. Physically plausible materials, natural daylight, realistic shadows, professional architectural photography.";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [negative, setNegative] = useState("redesign, altered geometry, extra floors, missing floors, moved windows, moved doors, changed roof, distorted perspective, warped lines, invented balconies, deformed people, text, watermark, illustration, cartoon, low resolution, blurry");
  const [preset, setPreset] = useState(presets[0]);
  const [strength, setStrength] = useState(42);
  const [steps, setSteps] = useState(24);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [state, setState] = useState<RenderState>("idle");
  const [message, setMessage] = useState("Ready for your first project");
  const [promptId, setPromptId] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const canRender = Boolean(file) && state !== "uploading" && state !== "queued" && state !== "running";
  const statusLabel = useMemo(() => ({
    idle: "Ready", uploading: "Uploading", queued: "Queued", running: "Rendering",
    complete: "Complete", error: "Needs attention"
  }[state]), [state]);

  function onFile(next: File | undefined) {
    if (!next) return;
    if (!next.type.startsWith("image/")) { setMessage("Please choose a JPG, PNG or WEBP image."); return; }
    if (next.size > 15 * 1024 * 1024) { setMessage("Please use an image smaller than 15 MB for this MVP."); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setOutputUrl("");
    setState("idle");
    setMessage("Reference image loaded. Review the settings and render.");
  }

  async function startRender() {
    if (!file) return;
    setState("uploading");
    setMessage("Preparing your reference image…");
    setOutputUrl("");
    const form = new FormData();
    form.append("image", file);
    form.append("prompt", prompt);
    form.append("negativePrompt", negative);
    form.append("denoise", String(strength / 100));
    form.append("steps", String(steps));
    form.append("width", String(width));
    form.append("height", String(height));
    form.append("preset", preset);
    try {
      const response = await fetch("/api/render", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Render request failed.");
      setPromptId(data.promptId);
      setState("queued");
      setMessage("Render submitted. Waiting for the GPU worker…");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to submit render.");
    }
  }

  useEffect(() => {
    if (!promptId || (state !== "queued" && state !== "running")) return;
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(`/api/render/${promptId}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not check render status.");
        if (!active) return;
        if (data.status === "complete" && data.imageUrl) {
          setOutputUrl(data.imageUrl);
          setState("complete");
          setMessage("Your render is ready.");
        } else if (data.status === "error") {
          setState("error");
          setMessage(data.error || "The render failed.");
        } else {
          setState(data.status === "running" ? "running" : "queued");
          setMessage(data.status === "running" ? "The GPU is processing your image…" : "Waiting in the render queue…");
        }
      } catch (error) {
        if (active) { setState("error"); setMessage(error instanceof Error ? error.message : "Status check failed."); }
      }
    };
    const timer = window.setInterval(poll, 3000);
    poll();
    return () => { active = false; window.clearInterval(timer); };
  }, [promptId, state]);

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Aperture size={19}/></div><div><strong>KEEM<span>RENDER</span></strong><small>ARCHITECTURAL STUDIO</small></div><button className="icon-button mobile-close" onClick={() => setMobileMenu(false)}><X size={18}/></button></div>
        <button className="new-project"><Plus size={16}/> New render project</button>
        <div className="nav-label">WORKSPACE</div>
        <a className="nav-item active"><PanelLeft size={17}/> Render studio</a>
        <a className="nav-item disabled"><Layers3 size={17}/> Project library <span className="soon">SOON</span></a>
        <a className="nav-item disabled"><Clock3 size={17}/> Render history <span className="soon">SOON</span></a>
        <div className="sidebar-spacer"/>
        <div className="private-note"><LockKeyhole size={15}/><div><strong>Studio workspace</strong><span>Foundation build · GPU pending</span></div></div>
        <div className="profile"><div className="avatar">KA</div><div><strong>Architect workspace</strong><span>Personal edition</span></div><MoreHorizontal size={18}/></div>
      </aside>

      <section className="main-area">
        <header className="topbar"><button className="icon-button menu-toggle" onClick={() => setMobileMenu(true)}><Menu size={19}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>Render studio</strong></div><div className="top-actions"><span className="engine-status"><i/> Engine not connected</span><button className="help-button"><CircleHelp size={16}/> Help</button></div></header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow">AI ARCHITECTURAL VISUALISATION</div><h1>Render studio<span>.</span></h1><p>Bring your architectural designs to life. Keep the design yours.</p></div><div className="heading-chip"><ShieldCheck size={15}/> Reference-led workflow</div></div>

          <div className="studio-grid">
            <section className="workspace-panel">
              <div className="panel-head"><div><span className="step">01</span><div><h2>Reference image</h2><p>Upload a screenshot or existing render</p></div></div><button className="subtle-button"><Settings2 size={15}/> Image settings</button></div>
              <label className={`dropzone ${preview ? "has-image" : ""}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => onFile(e.target.files?.[0])}/>
                {preview ? <><img src={preview} alt="Uploaded architectural reference"/><div className="image-overlay"><span><Check size={14}/> Reference loaded</span><span>Replace image</span></div></> : <div className="upload-empty"><div className="upload-icon"><ImagePlus size={24}/></div><strong>Drop your architectural image here</strong><span>or <u>browse files</u> from your device</span><small>JPG, PNG or WEBP · up to 15 MB</small></div>}
              </label>
              <div className="upload-foot"><span><FileImage size={14}/> {file ? file.name : "No image selected"}</span><span>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Recommended: clean clay render or shaded viewport"}</span></div>

              <div className="section-divider"/>
              <div className="panel-head compact"><div><span className="step">02</span><div><h2>Visual direction</h2><p>Choose the intended rendering treatment</p></div></div></div>
              <div className="preset-grid">{presets.map((p, i) => <button key={p} onClick={() => setPreset(p)} className={`preset ${preset === p ? "selected" : ""}`}><span className={`preset-thumb thumb-${i}`}>{i === 0 ? <Aperture/> : i === 1 ? <Columns2/> : i === 2 ? <Layers3/> : <Sun/>}</span><span>{p}</span>{preset === p && <Check size={14}/>}</button>)}</div>

              <div className="section-divider"/>
              <div className="panel-head compact"><div><span className="step">03</span><div><h2>Architectural brief</h2><p>Describe the result without redesigning the building</p></div></div></div>
              <label className="field-label">POSITIVE PROMPT</label><textarea className="prompt-area" value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}/>
              <div className="field-row"><label className="field-label">NEGATIVE PROMPT</label><button className="text-button" onClick={() => setNegative("redesign, altered geometry, extra floors, missing floors, moved windows, moved doors, changed roof, distorted perspective, warped lines, invented balconies, deformed people, text, watermark, illustration, cartoon, low resolution, blurry")}>Reset</button></div>
              <textarea className="negative-area" value={negative} onChange={e => setNegative(e.target.value)} rows={2}/>
              <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}><SlidersHorizontal size={15}/> Advanced render controls <ChevronDown size={15} className={showAdvanced ? "rotate" : ""}/></button>
              {showAdvanced && <div className="advanced-controls"><div className="range-control"><div><label>DESIGN PRESERVATION</label><strong>{100 - strength}%</strong></div><input type="range" min="15" max="75" value={strength} onChange={e => setStrength(Number(e.target.value))}/><small>Lower transformation strength generally retains more of the reference image.</small></div><div className="range-control"><div><label>INFERENCE STEPS</label><strong>{steps}</strong></div><input type="range" min="16" max="35" value={steps} onChange={e => setSteps(Number(e.target.value))}/></div><div className="dimension-row"><label>OUTPUT WIDTH<select value={width} onChange={e => setWidth(Number(e.target.value))}><option value={768}>768 px</option><option value={1024}>1024 px</option><option value={1280}>1280 px</option></select></label><label>OUTPUT HEIGHT<select value={height} onChange={e => setHeight(Number(e.target.value))}><option value={768}>768 px</option><option value={1024}>1024 px</option><option value={1280}>1280 px</option></select></label></div></div>}
              <div className="render-footer"><div className="status-line"><span className={`status-dot ${state}`}/><div><strong>{statusLabel}</strong><small>{message}</small></div></div><button className="render-button" disabled={!canRender} onClick={startRender}>{state === "uploading" || state === "queued" || state === "running" ? <LoaderCircle className="spin" size={17}/> : <WandSparkles size={17}/>} {state === "uploading" ? "Uploading…" : state === "queued" || state === "running" ? "Rendering…" : "Generate render"} <ArrowUpRight size={15}/></button></div>
            </section>

            <section className="result-panel">
              <div className="panel-head"><div><span className="step">04</span><div><h2>Render preview</h2><p>Your generated visualisation appears here</p></div></div><button className="icon-button" title="More options"><MoreHorizontal size={19}/></button></div>
              <div className={`result-canvas ${outputUrl ? "has-output" : ""}`}>
                {outputUrl ? <img src={outputUrl} alt="Generated architectural render"/> : preview ? <div className="reference-preview"><img src={preview} alt="Reference preview"/><div className="preview-caption">REFERENCE IMAGE <span>Awaiting render</span></div></div> : <div className="result-empty"><div className="orbit"><Aperture size={31}/><Sparkles size={14}/></div><strong>Your next visualisation starts here</strong><span>Upload a reference image to begin.</span><div className="empty-tags"><span><ScanLine size={13}/> Geometry aware</span><span><Sun size={13}/> Light & material</span></div></div>}
              </div>
              <div className="result-meta"><div><span className="meta-label">OUTPUT</span><strong>{outputUrl ? `${width} × ${height}` : "No render yet"}</strong></div><div><span className="meta-label">MODEL</span><strong>SDXL · planned</strong></div><div><span className="meta-label">STATUS</span><strong>{statusLabel}</strong></div></div>
              <div className="result-actions"><button className="secondary-button" disabled={!outputUrl}><Columns2 size={15}/> Compare</button><a className={`secondary-button ${!outputUrl ? "disabled-link" : ""}`} href={outputUrl || undefined} download="keem-render-output.png"><Download size={15}/> Export image</a></div>
              <div className="fidelity-note"><LockKeyhole size={16}/><div><strong>Design fidelity is the priority</strong><span>AI image generation can still alter details. Always compare the result against your original drawings before presenting it as a faithful visualisation.</span></div></div>
            </section>
          </div>
          <footer className="footer"><span>KEEM RENDER <i>·</i> ARCHITECTURAL STUDIO</span><span>FOUNDATION BUILD 0.1.0</span></footer>
        </div>
      </section>
    </main>
  );
}
