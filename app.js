// Studio UI: project list, live preview (stage.html in an iframe), scene editor, voice, caption, render.
const $ = (s) => document.querySelector(s);
// On github.io there is no server: web/local-api.js puts an in-browser implementation on window.LOCAL_API.
const WEB = !!window.LOCAL_API;
const api = window.LOCAL_API || async function (url, opts = {}) {
  const r = await fetch(url, { ...opts, body: opts.body && !(opts.body instanceof Blob) ? JSON.stringify(opts.body) : opts.body });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || r.statusText);
  return j;
};
const toast = (t) => { const e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove("on"), 2200); };
window.toast = toast; // used by the Mac app after a download
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const busy = async (btn, fn) => { btn.disabled = true; try { await fn(); } catch (e) { toast("Chyba: " + e.message); console.error(e); } finally { btn.disabled = false; } };

let META, CAT = [], P = null, TL = null, playing = false, t0 = 0, tNow = 0, slide = 0;
const frame = $("#frame");
const post = (m) => frame.contentWindow.postMessage(m, "*");
const TYPE = { hook: "Háček", product: "Produkt", fact: "Fakt", quiz: "Kvíz", letters: "Písmena", poll: "Anketa", code: "Slevový kód", cta: "Výzva",
  cover: "Obálka", grid: "Mřížka", promo: "Promo", comment: "Komentáře" };

/* tabs */
document.querySelectorAll("nav button").forEach((b) => b.onclick = () => {
  document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x === b));
  $("#projekty").hidden = b.dataset.tab !== "projekty"; $("#katalog").hidden = b.dataset.tab !== "katalog";
  if (b.dataset.tab === "katalog") drawCatalog();
});

/* list */
async function loadList() {
  const list = await api("/api/projects");
  $("#list").innerHTML = list.map((p) => `<li data-id="${p.id}" class="${P?.id === p.id ? "on" : ""}"><span class="k">${p.kind === "reel" ? "REEL" : "CAROUSEL"}${p.outputs ? " · ✓" : ""}</span>
    ${esc(p.title)}<small>${new Date(p.updated).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</small></li>`).join("") || `<li class="muted">Zatím nic.</li>`;
  $("#list").querySelectorAll("li[data-id]").forEach((li) => li.onclick = () => open(li.dataset.id));
}

async function open(id) { P = await api("/api/projects/" + id); stop(); slide = 0; tNow = 1; draw(); loadList(); }

/* new project picker */
let pick = null;
document.querySelectorAll("[data-new]").forEach((b) => b.onclick = () => {
  const kind = b.dataset.new, T = kind === "reel" ? META.reels : META.carousels;
  pick = { kind, template: Object.keys(T)[0], items: [] };
  $("#pickTitle").textContent = kind === "reel" ? "Nový reel" : "Nový carousel";
  const drawPick = () => {
    $("#pickList").innerHTML = Object.entries(T).map(([k, v]) => `<button data-t="${k}" class="${pick.template === k ? "on" : ""}">${esc(v.name)}<small>${esc(v.desc)}</small></button>`).join("");
    $("#pickList").querySelectorAll("button").forEach((x) => x.onclick = () => { pick.template = x.dataset.t; drawPick(); });
    $("#pickClubs").innerHTML = CAT.filter((c) => c.type === "naramek").map((c) => `<button data-i="${c.id}" class="${pick.items.includes(c.id) ? "on" : ""}">${esc(c.code)} · ${esc(c.short)}</button>`).join("");
    $("#pickClubs").querySelectorAll("button").forEach((x) => x.onclick = () => {
      const i = pick.items.indexOf(x.dataset.i); i >= 0 ? pick.items.splice(i, 1) : pick.items.push(x.dataset.i); drawPick(); });
    $("#pickWordRow").hidden = pick.template !== "vlastni";
  };
  drawPick();
  $("#picker").showModal();
});
$("#pickCancel").onclick = () => $("#picker").close();
$("#pickGo").onclick = () => busy($("#pickGo"), async () => {
  P = await api("/api/projects", { method: "POST", body: { ...pick, word: $("#pickWord").value } });
  $("#picker").close(); slide = 0; tNow = 1; draw(); loadList();
});

/* editor */
const fields = (s, i) => {
  const isReel = P.kind === "reel";
  const opt = (sel) => `<option value="">—</option>` + CAT.map((c) => `<option value="${c.id}" ${c.id === sel ? "selected" : ""}>${esc(c.code ? c.code + " · " : "")}${esc(c.short || c.name)}</option>`).join("");
  return `<div class="item" data-i="${i}">
    <div class="top">${i + 1}. ${TYPE[s.type] || s.type}${s.num ? " " + s.num : ""}<span>${isReel && P.spec.scenes.length > 2 ? `<button data-act="up" title="Nahoru">↑</button><button data-act="rm" title="Odebrat">✕</button>` : ""}</span></div>
    ${s.text !== undefined ? `<label>Text na obrazovce (*slovo* = červeně)<input data-k="text" value="${esc(s.text)}"></label>` : ""}
    ${s.sub !== undefined ? `<label>Podtitulek<input data-k="sub" value="${esc(s.sub)}"></label>` : ""}
    ${s.bubble !== undefined ? `<label>Bublina maskota<input data-k="bubble" value="${esc(s.bubble)}"></label>` : ""}
    ${isReel ? `<div class="two"><label>Hlas říká<input data-k="say" value="${esc(s.say || "")}"></label><label>Délka (s)<input data-k="dur" type="number" step="0.1" value="${s.dur || 2}"></label></div>` : ""}
    ${s.item !== undefined ? `<label>Produkt<select data-k="item">${opt(s.item)}</select></label>` : ""}
  </div>`;
};

function draw() {
  $("#empty").hidden = !!P; $("#editor").hidden = !P; $("#frameWrap").hidden = !P;
  if (!P) return;
  const reel = P.kind === "reel";
  $("#title").value = P.title;
  const list = reel ? P.spec.scenes : P.spec.slides;
  $("#items").innerHTML = list.map(fields).join("");
  $("#items").querySelectorAll(".item").forEach((el) => {
    const i = +el.dataset.i;
    el.querySelectorAll("[data-k]").forEach((inp) => inp.oninput = () => {
      const k = inp.dataset.k; list[i][k] = k === "dur" ? Number(inp.value) : inp.value;
      if (k === "item") { // a new product brings its own code / club / spoken name
        const c = CAT.find((x) => x.id === inp.value);
        if (c && ["product", "quiz"].includes(list[i].type)) {
          Object.assign(list[i], { text: c.code || c.name, sub: c.club || c.name });
          if (P.kind === "reel") list[i].say = list[i].type === "quiz" ? list[i].say : (c.short || c.name) + ".";
          save(true); draw(); return;
        }
      }
      save(); refresh();
    });
    el.querySelectorAll("[data-act]").forEach((b) => b.onclick = () => {
      if (b.dataset.act === "rm") list.splice(i, 1);
      if (b.dataset.act === "up" && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
      save(true); draw();
    });
  });
  document.querySelectorAll(".reelOnly").forEach((e) => (e.hidden = !reel));
  $("#mOn").checked = P.spec.mascot?.on !== false; $("#mBubble").checked = !!P.spec.mascot?.bubble; $("#sound").checked = P.spec.sound !== "none";
  $("#frameWrap").classList.toggle("slide", !reel);
  $("#controls").hidden = !reel; $("#slideNav").hidden = reel;
  if (reel) {
    const v = P.voice;
    $("#voiceState").innerHTML = v ? `Hlas: <b>${v.kind === "say" ? "náhledový (Zuzana)" : "nahraný"}</b>, ${v.duration.toFixed(1)} s.` +
      (P.voiceStale ? ` <span class="warn">Text se od namluvení změnil — vytvoř hlas znovu.</span>` : "") : "Bez hlasu — délky scén podle čísel, maskot mluví v bublině.";
    $("#script").textContent = P.spec.scenes.map((s) => s.say).filter(Boolean).join("\n");
    $("#audio").src = v ? v.url || `/projects/${P.id}/${v.file}?${v.duration}` : "";
  } else {
    $("#slideNav").innerHTML = list.map((_, i) => `<button class="${i === slide ? "on" : ""}">${i + 1}</button>`).join("");
    $("#slideNav").querySelectorAll("button").forEach((b, i) => b.onclick = () => { slide = i; post({ cmd: "slide", i }); draw(); });
  }
  $("#capText").value = P.caption.text; $("#capTags").value = P.caption.hashtags.join(" ");
  drawOutputs(P.outputs);
  refresh();
}

let saveT;
function save(now) {
  clearTimeout(saveT);
  const go = async () => { const x = await api("/api/projects/" + P.id, { method: "PUT", body: { spec: P.spec, caption: P.caption, title: P.title } }); P.voiceStale = x.voiceStale; if (P.kind === "reel") $("#voiceState").querySelector(".warn") || (x.voiceStale && draw()); };
  now ? go() : (saveT = setTimeout(go, 500));
}
let refT;
function refresh() {
  clearTimeout(refT);
  refT = setTimeout(() => {
    if (P.kind === "reel") post({ cmd: "reel", spec: P.spec, catalog: CAT, voice: P.voiceStale ? null : P.voice, t: tNow });
    else post({ cmd: "slides", spec: P.spec, catalog: CAT, i: slide });
  }, 120);
}
window.addEventListener("message", (e) => { if (e.data?.cmd === "tl") { TL = e.data.tl; tNow = Math.min(tNow, TL.total); showTime(); } });

$("#title").oninput = () => { P.title = $("#title").value; save(); };
$("#mOn").onchange = () => { P.spec.mascot = { ...P.spec.mascot, on: $("#mOn").checked }; save(); refresh(); };
$("#mBubble").onchange = () => { P.spec.mascot = { ...P.spec.mascot, bubble: $("#mBubble").checked }; save(); refresh(); };
$("#sound").onchange = () => { P.spec.sound = $("#sound").checked ? "hits" : "none"; save(); };
$("#rebuild").onclick = () => busy($("#rebuild"), async () => { P = await api(`/api/projects/${P.id}/rebuild`, { method: "POST", body: {} }); draw(); });
$("#del").onclick = async () => { if (!confirm("Smazat projekt „" + P.title + "“ i s vyrenderovanými soubory?")) return; await api("/api/projects/" + P.id, { method: "DELETE" }); P = null; draw(); loadList(); };

/* playback */
const showTime = () => { $("#time").textContent = tNow.toFixed(1) + " s"; if (TL) $("#scrub").value = Math.round((tNow / TL.total) * 1000); };
function stop() { playing = false; $("#play").textContent = "▶ Přehrát"; $("#audio").pause(); }
$("#play").onclick = () => {
  if (playing) return stop();
  if (!TL) return;
  if (tNow >= TL.total - 0.05) tNow = 0;
  playing = true; $("#play").textContent = "❚❚ Pauza"; t0 = performance.now() - tNow * 1000;
  const a = $("#audio"), v = P.voiceStale ? null : P.voice;
  const tick = () => {
    if (!playing) return;
    tNow = (performance.now() - t0) / 1000;
    if (v && a.src) { const at = tNow - (v.at ?? 0.25); if (at >= 0 && a.paused) { a.currentTime = at; a.play(); } }
    if (tNow >= TL.total) { tNow = TL.total; stop(); }
    post({ cmd: "at", t: tNow }); showTime();
    requestAnimationFrame(tick);
  };
  tick();
};
$("#scrub").oninput = () => { stop(); if (!TL) return; tNow = ($("#scrub").value / 1000) * TL.total; post({ cmd: "at", t: tNow }); showTime(); };

/* voice */
$("#say").onclick = () => busy($("#say"), async () => { P = await api(`/api/projects/${P.id}/voice/say`, { method: "POST" }); stop(); tNow = 0; draw(); toast("Náhledový hlas hotový"); });
$("#voiceFile").onchange = () => busy($("#say"), async () => {
  const f = $("#voiceFile").files[0]; if (!f) return;
  toast(WEB ? "Zarovnávám hlas k textu…" : "Zarovnávám hlas k textu (whisper)…");
  P = await api(`/api/projects/${P.id}/voice/upload?ext=${f.name.split(".").pop()}`, { method: "POST", body: f });
  $("#voiceFile").value = ""; stop(); tNow = 0; draw(); toast("Hlas nahraný a zarovnaný");
});
$("#voiceDel").onclick = () => busy($("#voiceDel"), async () => { P = await api(`/api/projects/${P.id}/voice`, { method: "DELETE" }); draw(); });
$("#copyScript").onclick = () => { navigator.clipboard.writeText($("#script").textContent); toast("Text zkopírován"); };

/* caption */
$("#capText").oninput = () => { P.caption.text = $("#capText").value; save(); };
$("#capTags").oninput = () => { P.caption.hashtags = $("#capTags").value.split(/\s+/).filter(Boolean).map((t) => (t.startsWith("#") ? t : "#" + t)); save(); };
$("#capNext").onclick = () => busy($("#capNext"), async () => { P = await api(`/api/projects/${P.id}/caption`, { method: "POST", body: {} }); $("#capText").value = P.caption.text; $("#capTags").value = P.caption.hashtags.join(" "); });
$("#capAi").onclick = () => busy($("#capAi"), async () => { toast("Gemma4 píše… (chvilku to trvá)"); P = await api(`/api/projects/${P.id}/caption`, { method: "POST", body: { ai: true } }); $("#capText").value = P.caption.text; });
$("#capCopy").onclick = () => { navigator.clipboard.writeText(`${$("#capText").value}\n\n${$("#capTags").value}`); toast("Popisek zkopírován"); };

/* render */
function drawOutputs(o) {
  const el = $("#outputs");
  if (!o) { el.innerHTML = ""; return; }
  const q = WEB ? "" : "?" + o.at; // blob: URLs take no query string
  el.innerHTML = o.video
    ? `<video src="${o.video}${q}" controls playsinline></video><div class="row"><a class="pill small" href="${o.video}${q}" download="${P.id}.mp4">Stáhnout MP4</a><a class="pill small" href="${o.cover}${q}" download>Obálka JPG</a><a class="pill small" href="${o.caption}${q}" target="_blank">popisek.txt</a></div>`
    : `<div class="slides">${o.slides.map((s) => `<a href="${s}${q}" target="_blank"><img src="${s}${q}"></a>`).join("")}</div><div class="row"><a class="pill small" href="${o.zip}${q}" download="${P.id}.zip">Stáhnout ZIP (${o.slides.length} slidů)</a><a class="pill small" href="${o.caption}${q}" target="_blank">popisek.txt</a></div>`;
}
$("#render").onclick = () => busy($("#render"), async () => {
  clearTimeout(saveT);
  await api("/api/projects/" + P.id, { method: "PUT", body: { spec: P.spec, caption: P.caption, title: P.title } });
  const id = P.id;
  let job = await api(`/api/projects/${id}/render`, { method: "POST" });
  $("#progress").hidden = false;
  while (!["hotovo", "chyba"].includes(job.state)) {
    await new Promise((r) => setTimeout(r, 700));
    job = await api("/api/jobs/" + job.id);
    $("#progress div").style.width = Math.round(job.progress * 100) + "%";
  }
  $("#progress").hidden = true;
  if (job.state === "chyba") throw new Error(job.error);
  if (P?.id === id) { P.outputs = job.outputs; drawOutputs(job.outputs); }
  toast("Hotovo ✓"); loadList();
});

/* catalog */
function drawCatalog() {
  $("#catInfo").textContent = `${CAT.length} produktů` + (window.CATU ? ` · načteno ${new Date(window.CATU).toLocaleString("cs-CZ")}` : "");
  $("#catGrid").innerHTML = CAT.map((c) => `<div class="card"><div class="ph" style="background-image:url('${c.image}')"></div>
    <div class="b"><span class="sw" style="background:${c.color}"></span><b>${esc(c.code || "")}</b><div>${esc(c.club || c.name)}</div><small class="muted">${c.price ? c.price + " Kč" : ""} · ${c.source === "upload" ? "vlastní" : "e-shop"}</small></div></div>`).join("");
}
async function loadCat() { const c = await api("/api/catalog"); CAT = c.items; window.CATU = c.updated; }
$("#catRefresh").onclick = () => busy($("#catRefresh"), async () => { const c = await api("/api/catalog/refresh", { method: "POST" }); CAT = c.items; window.CATU = c.updated; drawCatalog(); toast("Katalog aktualizován"); });
$("#catFile").onchange = () => busy($("#catRefresh"), async () => {
  const f = $("#catFile").files[0]; if (!f) return;
  const name = prompt("Název produktu (např. Tričko Toxickej):", f.name.replace(/\.[^.]+$/, "")); if (!name) return;
  const price = prompt("Cena v Kč (nepovinné):", "");
  const c = await api(`/api/catalog/upload?ext=${f.name.split(".").pop()}&name=${encodeURIComponent(name)}&price=${encodeURIComponent(price || "")}&type=tricko`, { method: "POST", body: f });
  CAT = c.items; drawCatalog(); $("#catFile").value = ""; toast("Přidáno do katalogu");
});

if (WEB) { // no macOS voice, Ollama or live e-shop feed in the browser
  for (const id of ["#say", "#capAi", "#catRefresh"]) $(id).hidden = true;
  document.body.classList.add("web");
}
let started = false;
const start = async () => {
  if (started) return; started = true;
  META = await api("/api/meta");
  await loadCat();
  await loadList();
  const first = $("#list li[data-id]"); if (first) open(first.dataset.id);
};
// the stage iframe may finish loading before this module runs (always on the static build)
if (frame.contentWindow?.ready) start(); else frame.addEventListener("load", start);
