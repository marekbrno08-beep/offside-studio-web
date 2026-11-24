// Browser renderer for the GitHub Pages build: the same stage.html as the Node renderer, but every
// frame is rasterised in the page (DOM → SVG foreignObject → canvas) and encoded with WebCodecs
// (H.264 + AAC) into an MP4 by mp4-muxer. Carousels become PNGs + a ZIP. Needs desktop Chrome/Edge.
import { Muxer, ArrayBufferTarget } from "./mp4-muxer.mjs";
import { decode } from "./align.js";

const FPS = 30, SR = 48000;

/* ── hidden full-size stage ──────────────────────────── */
async function openStage(height) {
  const f = document.createElement("iframe");
  Object.assign(f.style, { position: "fixed", left: "-20000px", top: "0", width: "1080px", height: height + "px", border: "0" });
  f.src = "stage.html";
  document.body.appendChild(f);
  await new Promise((ok) => f.addEventListener("load", ok, { once: true }));
  const w = f.contentWindow;
  for (let i = 0; i < 200 && !w.ready; i++) await new Promise((r) => setTimeout(r, 25));
  return { f, w, doc: f.contentDocument, close: () => f.remove() };
}

/* ── DOM → canvas ────────────────────────────────────── */
const toDataURL = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
const fontCache = new Map(), imgCache = new Map();

// stage.css + only the latin / latin-ext @font-face rules, with the woff2 files inlined
async function stageCSS(doc) {
  let css = "";
  for (const l of doc.querySelectorAll('link[rel="stylesheet"]')) {
    const href = l.href;
    if (!fontCache.has(href)) {
      let text = await fetch(href).then((r) => r.text());
      if (/@font-face/.test(text)) {
        const blocks = text.split(/(?=\/\*)/).filter((b) => /\/\*[^*]*-latin(-ext)?-/.test(b));
        text = "";
        for (const b of blocks) {
          const m = b.match(/url\(([^)]+\.woff2)\)/); if (!m) continue;
          const data = await toDataURL(await fetch(new URL(m[1], href)).then((r) => r.blob()));
          text += b.replace(/src:[^;]+;/, `src: url(${data}) format('woff2');`);
        }
      }
      fontCache.set(href, text);
    }
    css += fontCache.get(href) + "\n";
  }
  return css;
}
// photos → JPEG data URLs (max 1400 px), cached for the whole render
async function inlineImage(url) {
  if (url.startsWith("data:")) return url;
  if (!imgCache.has(url)) imgCache.set(url, (async () => {
    const bmp = await createImageBitmap(await fetch(url).then((r) => r.blob()));
    const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return toDataURL(await c.convertToBlob({ type: "image/jpeg", quality: 0.9 }));
  })());
  return imgCache.get(url);
}

function makeRaster(stage, css, width, height) {
  const canvas = new OffscreenCanvas(width, height), g = canvas.getContext("2d");
  const ser = new XMLSerializer(), base = stage.ownerDocument.baseURI;
  return async () => {
    let html = "";
    for (const el of stage.children) if (el.style.display !== "none") html += ser.serializeToString(el);
    // absolute → inlined images
    const found = [...html.matchAll(/url\((?:&quot;|'|")?([^"')&]+)(?:&quot;|'|")?\)/g)].map((m) => m[1]).filter((u) => !u.startsWith("data:"));
    for (const u of new Set(found)) html = html.split(u).join(await inlineImage(new URL(u, base).href));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">` +
      `<div xmlns="http://www.w3.org/1999/xhtml"><style>${css}</style><div id="stage" class="${stage.className}">${html}</div></div></foreignObject></svg>`;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    g.fillStyle = "#000"; g.fillRect(0, 0, width, height);
    g.drawImage(img, 0, 0);
    return canvas;
  };
}

/* ── audio ───────────────────────────────────────────── */
// port of lib/audio.mjs: a heavy hit on the first cut, lighter hits on the next ones
function hits(cuts, total, master) {
  const n = Math.ceil(total * SR), buf = new Float32Array(n);
  let seed = 1234567;
  const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;
  cuts.forEach((at, k) => {
    const gain = master * (k === 0 ? 0.95 : 0.6), low = k === 0 ? 42 : 52, start = Math.floor(at * SR);
    let ph = 0;
    for (let i = 0; i < 0.45 * SR && start + i < n; i++) {
      const t = i / SR; ph += (2 * Math.PI * (low + 110 * Math.exp(-t * 38))) / SR;
      buf[start + i] += gain * (Math.sin(ph) * Math.exp(-t * 9) + noise() * 0.35 * Math.exp(-t * 90));
    }
  });
  for (let i = 0; i < n; i++) buf[i] = Math.tanh(buf[i] * 1.2) * 0.85;
  return buf;
}

async function soundtrack(spec, tl, voice, voiceBlob) {
  const len = Math.ceil(tl.total * SR), ctx = new OfflineAudioContext(2, len, SR);
  const bus = ctx.createDynamicsCompressor(); // acts as a limiter on the mix
  bus.threshold.value = -8; bus.knee.value = 3; bus.ratio.value = 20; bus.attack.value = 0.001; bus.release.value = 0.12;
  const trim = ctx.createGain(); trim.gain.value = 0.85; // headroom for the compressor's overshoot + AAC
  bus.connect(trim); trim.connect(ctx.destination);
  if (spec.sound !== "none") {
    const b = ctx.createBuffer(1, len, SR); b.copyToChannel(hits(tl.scenes.map((s) => s.start), tl.total, voice ? 0.35 : 0.8), 0);
    const s = ctx.createBufferSource(); s.buffer = b; s.connect(bus); s.start(0);
  }
  if (voice && voiceBlob) {
    const vb = await decode(voiceBlob), d = vb.getChannelData(0);
    let sum = 0, cnt = 0; for (let i = 0; i < d.length; i++) { const v = d[i] * d[i]; if (v > 1e-5) { sum += v; cnt++; } }
    const level = Math.sqrt(sum / Math.max(1, cnt)); // loudness of the speech only
    const g = ctx.createGain(); g.gain.value = Math.min(8, 0.18 / Math.max(level, 1e-4));
    const s = ctx.createBufferSource(); s.buffer = vb; s.connect(g); g.connect(bus); s.start(voice.at ?? 0.25);
  }
  return ctx.startRendering();
}

async function pickCodec(list, Kind, base) {
  for (const codec of list) {
    const { supported } = await Kind.isConfigSupported({ ...base, codec }).catch(() => ({}));
    if (supported) return codec;
  }
  return null;
}

/* ── reel → MP4 ──────────────────────────────────────── */
export async function renderReel(spec, catalog, voice, voiceBlob, { onProgress = () => {} } = {}) {
  if (!("VideoEncoder" in window)) throw new Error("Tenhle prohlížeč neumí kódovat video — otevři to v Chromu na počítači");
  const W = 1080, H = 1920;
  const st = await openStage(H);
  try {
    const tl = await st.w.loadReel(spec, catalog, voice);
    await st.w.preload();
    const raster = makeRaster(st.doc.getElementById("stage"), await stageCSS(st.doc), W, H);

    const vbase = { width: W, height: H, bitrate: 9_000_000, framerate: FPS };
    const vcodec = await pickCodec(["avc1.640028", "avc1.4d0028", "avc1.640032", "avc1.42003e"], VideoEncoder, vbase);
    if (!vcodec) throw new Error("Prohlížeč neumí H.264 — použij Chrome nebo Edge");
    const audio = await soundtrack(spec, tl, voice, voiceBlob);
    const abase = { sampleRate: SR, numberOfChannels: 2, bitrate: 192_000 };
    const acodec = await pickCodec(["mp4a.40.2"], AudioEncoder, abase).then((c) => c || pickCodec(["opus"], AudioEncoder, abase));

    const muxer = new Muxer({ target: new ArrayBufferTarget(), fastStart: "in-memory",
      video: { codec: "avc", width: W, height: H, frameRate: FPS },
      audio: acodec ? { codec: acodec === "opus" ? "opus" : "aac", sampleRate: SR, numberOfChannels: 2 } : undefined });
    let err = null;
    const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => (err = e) });
    ve.configure({ ...vbase, codec: vcodec, avc: { format: "avc" }, latencyMode: "quality" });

    const frames = Math.round(tl.total * FPS);
    for (let f = 0; f < frames; f++) {
      if (err) throw err;
      st.w.renderAt((f + 0.001) / FPS);
      const canvas = await raster();
      const vf = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      ve.encode(vf, { keyFrame: f % (FPS * 2) === 0 });
      vf.close();
      while (ve.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 5));
      if (f % 5 === 0) onProgress((f / frames) * 0.95);
    }
    await ve.flush();

    if (acodec) {
      const ae = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => (err = e) });
      ae.configure({ ...abase, codec: acodec });
      const L = audio.getChannelData(0), R = audio.getChannelData(1), N = 1024;
      for (let i = 0; i < audio.length; i += N) {
        const n = Math.min(N, audio.length - i), data = new Float32Array(n * 2);
        data.set(L.subarray(i, i + n), 0); data.set(R.subarray(i, i + n), n);
        const ad = new AudioData({ format: "f32-planar", sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i * 1e6) / SR), data });
        ae.encode(ad); ad.close();
      }
      await ae.flush();
    }
    if (err) throw err;
    muxer.finalize();
    const video = new Blob([muxer.target.buffer], { type: "video/mp4" });

    // cover for the IG grid, same moment as the Node renderer
    st.w.renderAt(Math.min(tl.scenes[0].end - 0.05, 1.2));
    const cover = await (await raster()).convertToBlob({ type: "image/jpeg", quality: 0.92 });
    onProgress(1);
    return { video, cover, audioCodec: acodec };
  } finally { st.close(); }
}

/* ── carousel → PNG + ZIP ────────────────────────────── */
export async function renderCarousel(spec, catalog, { onProgress = () => {} } = {}) {
  const W = 1080, H = 1350;
  const st = await openStage(H);
  try {
    const n = await st.w.loadSlides(spec, catalog);
    const css = await stageCSS(st.doc), stage = st.doc.getElementById("stage");
    const slides = [];
    for (let i = 0; i < n; i++) {
      await st.w.showSlide(i);
      const c = await makeRaster(stage, css, W, H)();
      slides.push(await c.convertToBlob({ type: "image/png" }));
      onProgress((i + 1) / n);
    }
    const zip = await zipStore(await Promise.all(slides.map(async (b, i) => [`slide-${String(i + 1).padStart(2, "0")}.png`, new Uint8Array(await b.arrayBuffer())])));
    return { slides, zip };
  } finally { st.close(); }
}

/* ── tiny ZIP writer (stored, no compression — PNGs are compressed already) ── */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (d) => { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
async function zipStore(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  for (const [name, data] of files) {
    const nm = enc.encode(name), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
    parts.push(h, nm, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    central.push(c, nm);
    off += 30 + nm.length + data.length;
  }
  const size = central.reduce((a, x) => a + x.byteLength, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, size, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
