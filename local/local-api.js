// In-browser replacement for server.mjs, used by the GitHub Pages build (no Node, no ffmpeg).
// Same routes as the server, so public/app.js runs unchanged: projects, voice and renders live in IndexedDB.
import { REELS, CAROUSELS, buildSpec } from "../lib/templates.mjs";
import { caption } from "../lib/captions.mjs";
import { analyseVoice } from "./align.js";
import { renderReel, renderCarousel } from "./render-web.js";

/* ── storage ─────────────────────────────────────────── */
const dbp = new Promise((ok, bad) => {
  const r = indexedDB.open("offside-studio", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("kv");
  r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error);
});
const tx = async (mode, fn) => { const db = await dbp; return new Promise((ok, bad) => {
  const t = db.transaction("kv", mode), st = t.objectStore("kv"), req = fn(st);
  t.oncomplete = () => ok(req?.result); t.onerror = () => bad(t.error);
}); };
const get = (k) => tx("readonly", (s) => s.get(k));
const put = (k, v) => tx("readwrite", (s) => s.put(v, k));
const del = (k) => tx("readwrite", (s) => s.delete(k));
const keys = () => tx("readonly", (s) => s.getAllKeys());

/* ── catalog ─────────────────────────────────────────── */
let BASE = null;
async function catalog() {
  BASE ||= await fetch("data/catalog.json").then((r) => r.json());
  const own = (await get("uploads")) || [];
  return { updated: BASE.updated, items: [...BASE.items, ...own] };
}
const items = async () => (await catalog()).items;

// own product photo → JPEG data URL (max 1400 px) so it survives reloads and renders offline
async function shrink(blob) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const out = await c.convertToBlob({ type: "image/jpeg", quality: 0.9 });
  return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(out); });
}

/* ── projects ────────────────────────────────────────── */
const scriptOf = (spec) => spec.scenes.map((s) => (s.say || "").trim()).filter(Boolean).join("\n");
const titleOf = (kind, template) => (kind === "reel" ? REELS : CAROUSELS)[template]?.name || template;
const urls = new Map(); // blob → object URL, so the same blob keeps one URL
const urlOf = (b) => { if (!b) return null; if (!urls.has(b)) urls.set(b, URL.createObjectURL(b)); return urls.get(b); };
const blobCache = new Map(); // key → Blob (IndexedDB hands out a fresh Blob per read)
const getBlob = async (k) => { if (!blobCache.has(k)) blobCache.set(k, await get(k)); return blobCache.get(k); };
const putBlob = async (k, b) => { blobCache.set(k, b); await put(k, b); };

const loadP = async (id) => { const p = await get("p:" + id); if (!p) throw new Error("projekt nenalezen"); return p; };
const saveP = async (p) => { p.updated = new Date().toISOString(); await put("p:" + p.id, p); return p; };

async function full(id) {
  const p = await loadP(id), v = await get("v:" + id);
  let voice = null;
  if (v) voice = { ...v, url: urlOf(await getBlob("vb:" + id)) };
  let outputs = null;
  if (p.outputs) {
    const o = p.outputs, b = async (n) => urlOf(await getBlob(`o:${id}:${n}`));
    outputs = { at: o.at, caption: await b("caption") };
    if (o.kind === "reel") Object.assign(outputs, { video: await b("video"), cover: await b("cover") });
    else Object.assign(outputs, { slides: await Promise.all(o.slides.map((_, i) => b("slide" + i))), zip: await b("zip") });
  }
  return { ...p, outputs, voice, voiceStale: !!(v && p.kind === "reel" && v.script !== scriptOf(p.spec)) };
}

const jobs = new Map();
let queue = Promise.resolve();

async function route(url, opts) {
  const u = new URL(url, location.href), p = u.pathname.replace(/^.*?\/api\//, "/api/"), m = (opts.method || "GET").toUpperCase();
  const b = opts.body, body = b instanceof Blob ? b : typeof b === "string" ? JSON.parse(b) : b || {};
  let r;
  if (p === "/api/meta") return { reels: REELS, carousels: CAROUSELS };
  if (p === "/api/catalog") return catalog();
  if (p === "/api/catalog/upload" && m === "POST") {
    const own = (await get("uploads")) || [];
    own.push({ id: "own-" + Date.now().toString(36), source: "upload", type: u.searchParams.get("type") || "tricko", code: "",
      name: u.searchParams.get("name") || "Vlastní produkt", club: null, short: null, color: "#E30613", tag: null,
      price: Number(u.searchParams.get("price")) || null, image: await shrink(body), url: "https://offsidestore.cz" });
    await put("uploads", own);
    return catalog();
  }
  if (p === "/api/projects" && m === "GET") {
    const list = [];
    for (const k of await keys()) if (String(k).startsWith("p:")) {
      const x = await get(k); list.push({ id: x.id, kind: x.kind, template: x.template, title: x.title, updated: x.updated, outputs: x.outputs ? 1 : null });
    }
    return list.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  }
  if (p === "/api/projects" && m === "POST") {
    const cat = await items(), spec = buildSpec(body.kind, body.template, cat, body);
    const id = new Date().toISOString().slice(0, 10) + "-" + body.template + "-" + Math.random().toString(36).slice(2, 6);
    await saveP({ id, kind: body.kind, template: body.template, title: titleOf(body.kind, body.template), created: new Date().toISOString(), spec, caption: caption(spec, cat) });
    return full(id);
  }
  if ((r = p.match(/^\/api\/projects\/([\w-]+)$/))) {
    if (m === "GET") return full(r[1]);
    if (m === "PUT") { const x = await loadP(r[1]); Object.assign(x, { spec: body.spec ?? x.spec, caption: body.caption ?? x.caption, title: body.title ?? x.title }); await saveP(x); return full(r[1]); }
    if (m === "DELETE") { for (const k of await keys()) if (String(k).startsWith("p:" + r[1]) || String(k).includes(":" + r[1])) { await del(k); blobCache.delete(k); } return { ok: true }; }
  }
  if ((r = p.match(/^\/api\/projects\/([\w-]+)\/rebuild$/)) && m === "POST") {
    const x = await loadP(r[1]), cat = await items();
    x.spec = { ...buildSpec(x.kind, x.template, cat, { ...body, code: x.spec.code }), mascot: x.spec.mascot };
    x.caption = caption(x.spec, cat);
    await saveP(x); return full(r[1]);
  }
  if ((r = p.match(/^\/api\/projects\/([\w-]+)\/caption$/)) && m === "POST") {
    if (body.ai) throw new Error("AI přepis běží jen v Mac aplikaci");
    const x = await loadP(r[1]);
    x.caption = caption(x.spec, await items(), body.seed ?? Math.floor(Math.random() * 1e9));
    await saveP(x); return full(r[1]);
  }
  if ((r = p.match(/^\/api\/projects\/([\w-]+)\/voice\/upload$/)) && m === "POST") {
    const x = await loadP(r[1]), script = scriptOf(x.spec);
    const v = await analyseVoice(body, script);
    await putBlob("vb:" + r[1], body);
    await put("v:" + r[1], { ...v, kind: "upload", file: "vo", at: 0.25, script });
    return full(r[1]);
  }
  if ((r = p.match(/^\/api\/projects\/([\w-]+)\/voice\/say$/))) throw new Error("Náhledový hlas jde jen v Mac aplikaci — nahraj hlas z AI Studia");
  if ((r = p.match(/^\/api\/projects\/([\w-]+)\/voice$/)) && m === "DELETE") {
    await del("v:" + r[1]); await del("vb:" + r[1]); blobCache.delete("vb:" + r[1]);
    return full(r[1]);
  }
  if ((r = p.match(/^\/api\/projects\/([\w-]+)\/render$/)) && m === "POST") {
    const id = r[1], job = { id: id + "-" + Date.now(), progress: 0, state: "čeká" };
    jobs.set(job.id, job);
    queue = queue.then(async () => {
      job.state = "renderuji";
      try {
        const x = await loadP(id), cat = await items();
        const cap = new Blob([`${x.caption.text}\n\n${x.caption.hashtags.join(" ")}\n`], { type: "text/plain;charset=utf-8" });
        await putBlob(`o:${id}:caption`, cap);
        const onProgress = (q) => (job.progress = q);
        if (x.kind === "reel") {
          const v = await get("v:" + id), stale = v && v.script !== scriptOf(x.spec);
          const vb = v && !stale ? await getBlob("vb:" + id) : null;
          const out = await renderReel(x.spec, cat, vb ? v : null, vb, { onProgress });
          await putBlob(`o:${id}:video`, out.video); await putBlob(`o:${id}:cover`, out.cover);
          x.outputs = { kind: "reel", at: Date.now() };
        } else {
          const out = await renderCarousel(x.spec, cat, { onProgress });
          for (let i = 0; i < out.slides.length; i++) await putBlob(`o:${id}:slide${i}`, out.slides[i]);
          await putBlob(`o:${id}:zip`, out.zip);
          x.outputs = { kind: "carousel", slides: out.slides.map(() => 1), at: Date.now() };
        }
        await saveP(x);
        Object.assign(job, { state: "hotovo", progress: 1, outputs: (await full(id)).outputs });
      } catch (e) { console.error(e); Object.assign(job, { state: "chyba", error: String(e.message || e) }); }
    });
    return job;
  }
  if ((r = p.match(/^\/api\/jobs\/([\w-]+)$/))) return jobs.get(r[1]) || { state: "neznámý" };
  throw new Error("Neznámá akce " + p);
}

window.LOCAL_API = (url, opts = {}) => route(url, opts);
