// Renderer page. Reels: window.loadReel(spec, catalog, voice) → timeline, window.renderAt(t).
// Carousels: window.loadSlides(spec, catalog) → count, window.showSlide(i).
// Every frame is computed from t alone, so headless capture is deterministic.
import { mascotSVG, poseMascot } from "./mascot.js";

const stage = document.getElementById("stage");
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
const back = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const accent = (s) => esc(s).replace(/\*(.+?)\*/g, '<span class="red">$1</span>');
const plain = (s) => String(s ?? "").replace(/\*/g, "");
const h = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
const LOGO = `<svg viewBox="0 0 74 92" class="logo"><circle cx="10" cy="58" r="10" fill="#fff"/><rect x="30" y="0" width="14" height="92" rx="3" fill="#fff"/><circle cx="64" cy="20" r="10" fill="#E30613"/></svg>`;
const PAT = Array(6).fill("OFFSIDE OFFSIDE OFFSIDE").join("<br>");
const dark = () => `<div class="darkpat"><div class="pat">${PAT}</div></div>`;
const studio = () => `<div class="studio"><div class="pat">${PAT}</div><div class="fade"></div></div>`;
const CART = `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#E30613" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.5l2.2 11h10.6l2-8H7"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/></svg>`;

let CAT = [];
const item = (id) => CAT.find((i) => i.id === id) || {};

// shrink font until the box fits (words never overflow the width)
function fit(el, maxW, maxH, start, min = 40) {
  let fs = start;
  el.style.width = maxW + "px";
  el.style.fontSize = fs + "px";
  while (fs > min && (el.scrollWidth > maxW + 1 || el.scrollHeight > maxH)) { fs -= 4; el.style.fontSize = fs + "px"; }
  return fs;
}
// one span per word; *accent* may span several words, punctuation stays glued to its word
function wordsHTML(text) {
  let on = false;
  return String(text).split(/\s+/).filter(Boolean).map((tok) => {
    const parts = tok.split("*");
    const html = parts.map((x, k) => { if (k) on = !on; return x ? (on ? `<span class="red">${esc(x)}</span>` : esc(x)) : ""; }).join("");
    return `<span class="w" style="display:inline-block">${html}</span>`;
  }).join(" ");
}

function laceHTML(code, color) {
  return `<div class="lace" style="background:${color}">${[...code].map((c) => `<span class="ch">${esc(c === " " ? " " : c)}</span>`).join("")}</div>`;
}

function makeMascot(cls = "") {
  const el = h(`<div class="mascot ${cls}">${mascotSVG()}</div>`);
  return el;
}

/* ───────────────────────── REELS ───────────────────────── */
let R = null;
const SCENES = {
  hook(s) {
    const el = h(`<div class="fill">${dark()}<div class="abs it" style="left:70px;top:0;text-align:center">${wordsHTML(s.text)}</div></div>`);
    return { el, after() { const t = el.querySelector(".it"); fit(t, 940, 900, 170); t.style.top = (840 - t.offsetHeight / 2) + "px"; },
      draw(lt) { el.querySelectorAll(".w").forEach((w, i) => { const p = back((lt - i * 0.1) / 0.28); w.style.opacity = clamp((lt - i * 0.1) / 0.08); w.style.transform = `scale(${1.5 - 0.5 * p})`; }); } };
  },
  product(s) {
    const it = item(s.item);
    const el = h(`<div class="fill"><div class="photo dim" style="background-image:url('${it.image}')"></div>
      ${s.num ? `<div class="abs it" style="right:60px;top:60px;font-size:180px">${s.num}</div>` : ""}
      <div class="abs chip w" style="right:60px;top:${s.num ? 260 : 70}px">${it.price ? it.price + " Kč" : ""}</div>
      <div class="abs it code" style="left:64px;top:1230px;font-size:270px;text-shadow:0 10px 40px rgba(0,0,0,.6)">${esc(s.text)}</div>
      <div class="abs chip club" style="left:70px;top:1520px">${esc(s.sub || "")}</div></div>`);
    const ph = el.querySelector(".photo"), code = el.querySelector(".code"), club = el.querySelector(".club");
    return { el, draw(lt, dur) {
      ph.style.transform = `scale(${1.22 - 0.1 * ease(lt / 0.3) - 0.05 * (lt / dur)})`;
      const p = back((lt - 0.08) / 0.3); code.style.transform = `translateX(${(1 - p) * -300}px)`; code.style.opacity = clamp(lt / 0.12);
      const q = back((lt - 0.25) / 0.3); club.style.transform = `scale(${q})`; club.style.opacity = clamp((lt - 0.25) / 0.1);
    } };
  },
  fact(s) {
    const it = s.item ? item(s.item) : null;
    const el = h(`<div class="fill">${dark()}
      ${it ? `<div class="photo" style="bottom:690px;background-image:url('${it.image}')"></div><div class="abs" style="left:0;right:0;top:760px;height:480px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.75) 55%,#000)"></div>` : ""}
      <div class="abs txt" style="left:70px;right:70px;top:${it ? 1170 : 620}px">
        ${s.num ? `<div class="it red" style="font-size:120px;margin-bottom:24px">0${s.num}</div>` : ""}
        <div class="it hl" style="font-size:104px">${accent(s.text)}</div>
        <div class="sb" style="font:600 46px/1.3 Montserrat;margin-top:30px;max-width:${it ? 600 : 940}px;opacity:.92">${esc(s.sub || "")}</div></div></div>`);
    const ph = el.querySelector(".photo"), txt = el.querySelector(".txt");
    return { el, after() { fit(el.querySelector(".hl"), 940, 340, 104); },
      draw(lt, dur) {
        if (ph) ph.style.transform = `scale(${1.15 - 0.12 * (lt / dur)})`;
        const p = ease(lt / 0.35); txt.style.transform = `translateY(${(1 - p) * 120}px)`; txt.style.opacity = p;
      } };
  },
  quiz(s) {
    const it = item(s.item);
    const el = h(`<div class="fill">${dark()}<div class="photo dim" style="opacity:0;background-image:url('${it.image}')"></div>
      <div class="abs" style="left:0;right:0;top:300px;text-align:center"><span class="chip w q">POZNÁŠ KLUB?</span></div>
      <div class="lw abs" style="left:0;right:0;top:700px">${laceHTML(s.text, it.color || "#E30613")}</div>
      <div class="abs bar" style="left:240px;top:960px;height:16px;width:600px;border-radius:9px;background:rgba(255,255,255,.18)"><div style="height:100%;width:0;background:#E30613;border-radius:9px"></div></div>
      <div class="abs it name" style="left:60px;right:60px;top:1000px;text-align:center;font-size:110px;opacity:0">${esc(it.short || s.sub)}</div>
      <div class="abs" style="left:0;right:0;top:1140px;text-align:center"><span class="chip full" style="opacity:0">${esc(s.sub || "")}</span></div></div>`);
    const chs = el.querySelectorAll(".ch"), lw = el.querySelector(".lw"), ph = el.querySelector(".photo"), bar = el.querySelector(".bar div"),
      barW = el.querySelector(".bar"), name = el.querySelector(".name"), full = el.querySelector(".full"), q = el.querySelector(".q");
    const rv = s.reveal || 1.7;
    return { el, draw(lt) {
      chs.forEach((c, i) => { const p = back((lt - 0.1 - i * 0.22) / 0.3); c.style.transform = `translateY(${(1 - p) * -260}px)`; c.style.opacity = clamp((lt - 0.1 - i * 0.22) / 0.08); });
      bar.style.width = clamp(lt / rv) * 100 + "%";
      const r = ease((lt - rv) / 0.3);
      ph.style.opacity = r; barW.style.opacity = 1 - r; q.style.opacity = 1 - r;
      lw.style.transform = `translateY(${-r * 260}px)`;
      const b = back((lt - rv) / 0.32); name.style.opacity = clamp((lt - rv) / 0.08); name.style.transform = `scale(${0.4 + 0.6 * b})`;
      full.style.opacity = clamp((lt - rv - 0.2) / 0.15);
    } };
  },
  letters(s) {
    const el = h(`<div class="fill">${dark()}<div class="lw abs" style="left:0;right:0;top:640px">${laceHTML(s.text, s.color || "#E30613")}</div>
      <div class="abs" style="left:0;right:0;top:900px;text-align:center"><span class="chip w price">290 Kč</span></div></div>`);
    const chs = [...el.querySelectorAll(".ch")], price = el.querySelector(".price"), lace = el.querySelector(".lace");
    return { el, after() { const w = lace.offsetWidth; if (w > 1020) lace.style.transform = `translateX(-50%) scale(${1020 / w})`; },
      draw(lt) {
        let n = 0;
        chs.forEach((c, i) => { const t0 = 0.15 + i * 0.3; const p = back((lt - t0) / 0.3); if (lt >= t0) n++;
          c.style.transform = `translateY(${(1 - p) * -260}px) rotate(${(1 - p) * -25}deg)`; c.style.opacity = clamp((lt - t0) / 0.08); });
        price.textContent = (290 + Math.max(0, n - 3) * 12) + " Kč";
      } };
  },
  poll(s) {
    const its = (s.items || []).map(item);
    const el = h(`<div class="fill">${dark()}<div class="abs it ttl" style="left:70px;top:170px;font-size:96px">${accent(s.text)}</div>
      ${its.map((it, i) => `<div class="row" style="top:${470 + i * 285}px"><div class="n">${i + 1}</div><div class="th" style="background-image:url('${it.image}')"></div>
        <div><div class="t">${esc(it.short || it.name)}</div><div class="s">${esc(it.club || "")}</div></div></div>`).join("")}</div>`);
    const rows = el.querySelectorAll(".row"), ttl = el.querySelector(".ttl");
    return { el, after() { fit(ttl, 940, 260, 96); },
      draw(lt) {
        ttl.style.opacity = clamp(lt / 0.2);
        rows.forEach((r, i) => { const p = back((lt - 0.2 - i * 0.32) / 0.3); r.style.opacity = clamp((lt - 0.2 - i * 0.32) / 0.1); r.style.transform = `translateX(${(1 - p) * 500}px)`; });
      } };
  },
  code(s) {
    const el = h(`<div class="fill">${dark()}<div class="ticket" style="top:520px"><div style="font:800 46px Montserrat;letter-spacing:.18em;opacity:.8">SLEVOVÝ KÓD</div>
      <div class="it" style="font-size:150px;margin:30px 0">${esc(s.text)}</div><div class="it red" style="font-size:210px">−15 %</div>
      <div style="font:600 44px Montserrat;margin-top:30px;opacity:.9">${esc(s.sub || "")}</div></div></div>`);
    const t = el.querySelector(".ticket");
    return { el, draw(lt) { const p = back(lt / 0.35); t.style.transform = `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -8}deg)`; t.style.opacity = clamp(lt / 0.1); } };
  },
  cta(s) {
    const shop = plain(s.text).replace(/\.cz$/i, "");
    const el = h(`<div class="fill">${dark()}
      <svg viewBox="0 0 74 92" class="abs big" style="left:465px;top:170px;width:150px;height:186px"><circle cx="10" cy="58" r="10" fill="#fff"/><rect x="30" y="0" width="14" height="92" rx="3" fill="#fff"/><circle cx="64" cy="20" r="10" fill="#E30613"/></svg>
      <div class="abs" style="left:0;right:0;top:450px;text-align:center"><div class="shop">${CART}<span>${esc(shop)}<b>.CZ</b></span></div></div>
      <div class="abs it sb" style="left:60px;right:60px;top:640px;text-align:center;font-size:64px">${accent(s.sub || "")}</div>
      <div class="abs" style="left:0;right:0;top:760px;text-align:center"><span class="chip w">Odkaz máš v profilu ↗</span></div></div>`);
    const parts = [el.querySelector(".big"), el.querySelector(".shop").parentElement, el.querySelector(".sb"), el.querySelector(".chip")];
    return { el, after() { const sh = el.querySelector(".shop"); if (sh.offsetWidth > 1000) sh.style.transform = `scale(${1000 / sh.offsetWidth})`; },
      draw(lt) { parts.forEach((p, i) => { const k = back((lt - i * 0.12) / 0.3); p.style.opacity = clamp((lt - i * 0.12) / 0.1); p.style.transform = `translateY(${(1 - k) * 80}px)`; }); } };
  },
};

function timeline(spec, voice) {
  const sc = spec.scenes, off = voice?.at ?? 0.25;
  const out = [];
  if (voice?.words?.length) {
    let wi = 0;
    sc.forEach((s, i) => {
      const n = (s.say || "").split(/\s+/).filter(Boolean).length;
      s._w = [wi, wi + n];
      const first = n && voice.words[wi] ? voice.words[wi][0] + off : null;
      wi += n;
      let start = i === 0 ? 0 : first != null ? first - 0.12 : out[i - 1].start + (sc[i - 1].dur || 2);
      if (i > 0) start = Math.max(start, out[i - 1].start + 0.5);
      out.push({ start });
    });
    const last = voice.words[voice.words.length - 1][1] + off;
    out.forEach((o, i) => (o.end = i < out.length - 1 ? out[i + 1].start : Math.max(last + 1.3, o.start + 2.6)));
  } else {
    let t = 0;
    sc.forEach((s) => { out.push({ start: t, end: t + (s.dur || 2) }); t += s.dur || 2; });
  }
  return { scenes: out, total: out[out.length - 1].end, off };
}

window.loadReel = async (spec, catalog, voice) => {
  CAT = catalog;
  stage.className = "";
  stage.innerHTML = "";
  await document.fonts.ready;
  const tl = timeline(spec, voice);
  const scenes = spec.scenes.map((s) => { const sc = (SCENES[s.type] || SCENES.hook)(s); sc.el.style.display = "none"; stage.appendChild(sc.el); return sc; });
  stage.insertAdjacentHTML("beforeend", LOGO);
  const cap = h(`<div class="cap" style="top:1250px"></div>`); stage.appendChild(cap);
  const bubble = h(`<div class="bubble" style="display:none"></div>`); stage.appendChild(bubble);
  const masc = makeMascot("sticker"); stage.appendChild(masc);
  if (!spec.mascot?.on) masc.style.display = "none";
  scenes.forEach((sc) => { sc.el.style.display = ""; sc.after?.(); sc.el.style.display = "none"; });
  R = { spec, tl, scenes, cap, bubble, masc, voice, last: -1 };
  return { total: tl.total, scenes: tl.scenes };
};

function mouthAt(t) {
  const v = R.voice;
  if (v?.env?.length) {
    const k = Math.floor((t - R.tl.off) * 30);
    if (k < 0 || k >= v.env.length) return 0;
    const a = ((v.env[k - 1] || 0) + 2 * v.env[k] + (v.env[k + 1] || 0)) / 4;
    return clamp((a - 0.1) * 1.9);
  }
  return null;
}

// skip captions when (almost) every spoken word is already written in the scene
const toks = (x) => plain(x).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 1);
function onScreen(s) {
  if (s._on !== undefined) return s._on;
  const have = new Set(toks(`${s.text || ""} ${s.sub || ""} ${(s.items || []).map((id) => item(id).short).join(" ")}`));
  const said = toks(s.say);
  return (s._on = said.length > 0 && said.filter((w) => have.has(w)).length / said.length >= 0.75);
}

window.renderAt = (t) => {
  const { spec, tl, scenes, cap, bubble, masc } = R;
  let i = tl.scenes.findIndex((s) => t < s.end);
  if (i < 0) i = tl.scenes.length - 1;
  const s = spec.scenes[i], seg = tl.scenes[i], lt = t - seg.start, dur = seg.end - seg.start;
  if (R.last !== i) { scenes.forEach((sc, k) => (sc.el.style.display = k === i ? "" : "none")); R.last = i; }
  scenes[i].draw(lt, dur);

  // captions: the 1–3 word group around the current word
  const words = R.voice?.words;
  cap.style.display = "none";
  if (words?.length && !s.noCaption && s._w && s._w[1] > s._w[0] && !onScreen(s)) {
    const say = s.say.split(/\s+/).filter(Boolean);
    let cur = -1;
    for (let w = s._w[0]; w < s._w[1]; w++) if (words[w] && words[w][0] + tl.off <= t) cur = w;
    if (cur >= 0 && t < words[Math.min(cur, words.length - 1)][1] + tl.off + 0.6) {
      const groups = []; let g = [];
      say.forEach((w, k) => { g.push(k); if (g.length >= 3 || g.map((x) => say[x]).join(" ").length > 14 || /[.,!?…]$/.test(w)) { groups.push(g); g = []; } });
      if (g.length) groups.push(g);
      const rel = cur - s._w[0], grp = groups.find((x) => x.includes(rel)) || [];
      cap.innerHTML = grp.map((k) => `<span class="${k === rel ? "on" : ""}">${esc(say[k].replace(/[,.]$/, ""))}</span>`).join(" ");
      cap.style.display = "";
      cap.style.top = ({ cta: 900, poll: 1640, code: 1420, letters: 1150 }[s.type] || 1250) + "px";
    }
  }

  // mascot: sticker bottom-right, big for the CTA
  const isCta = s.type === "cta";
  const k = isCta ? back(lt / 0.45) : 0;
  const enter = back(t / 0.5);
  const w = 400 + (780 - 400) * k;
  const x = 660 + (150 - 660) * k;
  const y = 1920 - w * 700 / 640 + 40 + (1 - enter) * 500;
  Object.assign(masc.style, { width: w + "px", left: x + "px", top: y + "px" });
  let open = mouthAt(t);
  bubble.style.display = "none";
  if (open == null) { // no voice: talk while the bubble shows the line
    const talking = s.say && lt < Math.min(dur * 0.75, 0.2 + s.say.length * 0.06);
    open = talking ? Math.abs(Math.sin(t * Math.PI * 5.2)) * 0.8 : 0;
    const norm = (x) => plain(x).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const adds = !["product", "fact", "quiz", "poll"].includes(s.type) && norm(s.say) !== norm(s.text);
    if (spec.mascot?.bubble && s.say && spec.mascot?.on && !s.noBubble && adds) {
      bubble.textContent = plain(s.say);
      bubble.style.display = "";
      bubble.style.opacity = clamp((lt - 0.15) / 0.15);
      if (isCta) Object.assign(bubble.style, { left: "120px", right: "", top: "900px", bottom: "" });
      else Object.assign(bubble.style, { left: "", right: "300px", top: "", bottom: "500px" });
    }
  }
  poseMascot(masc.querySelector("svg"), { t, open, wave: isCta ? 1 : 0.35, excited: isCta ? 1 : 0 });
  return i;
};

/* ───────────────────────── CAROUSELS ───────────────────────── */
let C = null;
const mascotAt = (left, top, width, bubble, opts = {}) => {
  const m = makeMascot("sticker");
  Object.assign(m.style, { left: left + "px", top: top + "px", width: width + "px" });
  poseMascot(m.querySelector("svg"), { t: opts.t ?? 0.15, open: opts.open ?? 0.55, wave: 1, excited: 1 });
  const frag = [m];
  if (bubble) {
    const b = h(`<div class="bubble">${esc(bubble)}</div>`);
    b.classList.add("side");
    Object.assign(b.style, { right: (1080 - left - 10) + "px", top: (top + 20) + "px" });
    frag.unshift(b);
  }
  return frag;
};

const SLIDES = {
  cover(s) {
    const el = h(`<div class="fill">${dark()}<div class="abs it t" style="left:70px;text-align:center">${accent(s.text)}</div></div>`);
    return { el, extra: () => mascotAt(720, 1000, 340, s.bubble), after() { const t = el.querySelector(".t"); fit(t, 940, 640, 150); t.style.top = (500 - t.offsetHeight / 2) + "px"; } };
  },
  product(s) {
    const it = item(s.item);
    const el = h(`<div class="fill">${studio()}
      <div class="abs" style="left:160px;top:120px;width:760px;height:900px;border-radius:30px;overflow:hidden;transform:rotate(-2deg);box-shadow:0 40px 80px rgba(0,0,0,.45);border:10px solid #fff">
        <div class="photo" style="background-image:url('${it.image}')"></div>
        <div class="abs" style="left:28px;bottom:28px"><span class="chip">${esc(s.text)} · ${it.price || 290} Kč</span></div></div>
      ${s.num ? `<div class="abs it" style="left:0;right:0;top:1040px;text-align:center;font-size:230px;text-shadow:0 12px 40px rgba(0,0,0,.5)">${s.num}</div>` : ""}
      <div class="abs" style="left:0;right:0;top:${s.num ? 1270 : 1110}px;text-align:center;font:800 40px Montserrat;letter-spacing:.06em;text-transform:uppercase">${esc(s.sub || "")}</div></div>`);
    return { el };
  },
  fact(s) {
    const it = s.item ? item(s.item) : null;
    const el = h(`<div class="fill">${dark()}
      ${it ? `<div class="photo" style="bottom:640px;background-image:url('${it.image}')"></div><div class="abs" style="left:0;right:0;top:420px;height:300px;background:linear-gradient(180deg,transparent,#000)"></div>` : ""}
      <div class="abs txt" style="left:70px;right:70px;top:${it ? 690 : 380}px">
        ${s.num ? `<div class="chip" style="font-size:52px;padding:14px 34px;margin-bottom:30px">${s.num}</div>` : ""}
        <div class="it hl" style="font-size:96px">${accent(s.text)}</div>
        <div style="font:600 46px/1.32 Montserrat;margin-top:28px;opacity:.92">${esc(s.sub || "")}</div></div></div>`);
    return { el, after() { fit(el.querySelector(".hl"), 940, 300, 96); } };
  },
  grid(s) {
    const its = (s.items || []).map(item);
    const el = h(`<div class="fill">${dark()}<div class="abs" style="left:0;right:0;top:80px;text-align:center;font:800 40px Montserrat;letter-spacing:.2em">NAJDI SVŮJ KLUB</div>
      ${its.map((it, i) => `<div class="abs" style="left:${60 + (i % 2) * 500}px;top:${180 + Math.floor(i / 2) * 580}px;width:460px;height:540px;border-radius:30px;overflow:hidden">
        <div class="photo dim" style="background-image:url('${it.image}')"></div>
        <div class="abs" style="left:28px;bottom:26px"><div class="it" style="font-size:100px">${esc(it.code)}</div>
        <div style="font:700 30px Montserrat;margin-top:8px">${esc(it.club || it.name)}</div></div></div>`).join("")}</div>`);
    return { el };
  },
  code(s) {
    const el = h(`<div class="fill">${dark()}<div class="ticket" style="top:300px"><div style="font:800 46px Montserrat;letter-spacing:.18em;opacity:.8">SLEVOVÝ KÓD</div>
      <div class="it" style="font-size:140px;margin:30px 0">${esc(s.text)}</div><div class="it red" style="font-size:200px">−15 %</div>
      <div style="font:600 42px Montserrat;margin-top:30px;opacity:.9">${esc(s.sub || "")}<br>Napiš ho v košíku na offsidestore.cz</div></div></div>`);
    return { el };
  },
  promo(s) {
    const its = (s.items || []).map(item);
    const m = String(s.text).match(/^(.*?)\*(.+?)\*(.*)$/) || [0, s.text, "", ""];
    const el = h(`<div class="fill">${dark()}
      <div class="abs it l1" style="left:60px;top:120px;text-align:center">${esc(m[1].trim())}</div>
      <div class="abs it red l2" style="left:60px;top:300px;text-align:center">${esc((m[2] + m[3]).trim())}</div>
      <div class="abs" style="left:0;right:0;top:470px;text-align:center"><span class="it" style="display:inline-block;background:#fff;color:#000;font-size:54px;padding:16px 34px;transform:rotate(-2deg)">${esc(s.sub || "")}</span></div>
      ${its.map((it, i) => `<div class="abs" style="left:${60 + i * 327}px;top:610px;width:305px;height:290px;border-radius:24px;overflow:hidden;background:url('${it.image}') center/cover"></div>`).join("")}
      <div class="abs" style="left:60px;top:1200px"><div class="shop" style="font-size:54px;padding:18px 34px">${CART.replace(/64/g, "52")}<span>OFFSIDESTORE<b>.CZ</b></span></div></div></div>`);
    return { el, extra: () => mascotAt(770, 1010, 290, s.bubble, { t: 0.3 }),
      after() { const a = el.querySelector(".l1"), b = el.querySelector(".l2"); fit(a, 960, 175, 190); fit(b, 960, 140, 130); b.style.top = (130 + a.offsetHeight + 10) + "px"; } };
  },
  comment(s) {
    const its = (s.items || []).map(item);
    const el = h(`<div class="fill">${dark()}<div class="abs it t" style="left:70px;top:190px;text-align:center">${accent(s.text)}</div>
      ${its.map((it, i) => `<div class="abs" style="left:${90 + (i % 2) * 470}px;top:${430 + Math.floor(i / 2) * 330}px;width:430px;height:300px;border-radius:26px;overflow:hidden;background:url('${it.image}') center/cover">
        <div class="abs" style="left:18px;top:18px;width:96px;height:96px;border-radius:24px;background:#E30613;font:900 italic 70px/96px Montserrat;text-align:center">${i + 1}</div></div>`).join("")}</div>`);
    return { el, extra: () => mascotAt(700, 1080, 330, s.bubble), after() { fit(el.querySelector(".t"), 940, 250, 110); } };
  },
};

window.loadSlides = async (spec, catalog) => {
  CAT = catalog;
  stage.className = "slide";
  await document.fonts.ready;
  C = { spec };
  return spec.slides.length;
};
window.showSlide = async (i) => {
  const s = C.spec.slides[i];
  stage.innerHTML = "";
  const sl = (SLIDES[s.type] || SLIDES.cover)(s);
  stage.appendChild(sl.el);
  stage.insertAdjacentHTML("beforeend", LOGO);
  if (C.spec.mascot?.on && sl.extra) sl.extra().forEach((n) => stage.appendChild(n));
  sl.after?.();
  // page counter like a swipe hint
  stage.appendChild(h(`<div class="abs" style="right:54px;top:70px;font:800 30px Montserrat;opacity:.75;background:rgba(0,0,0,.45);padding:10px 20px;border-radius:999px">${i + 1}/${C.spec.slides.length}</div>`));
  await window.preload();
  return true;
};

// wait until every background photo on the stage is decoded
window.preload = () => Promise.all([...stage.querySelectorAll("[style*=url]")].map((e) => {
  const m = (e.style.backgroundImage || "").match(/url\("?(.*?)"?\)/); if (!m) return null;
  return new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = m[1]; });
}));

// preview helpers for the studio iframe
window.addEventListener("message", async (e) => {
  const d = e.data || {};
  if (d.cmd === "reel") { const tl = await window.loadReel(d.spec, d.catalog, d.voice); parent.postMessage({ cmd: "tl", tl }, "*"); window.renderAt(d.t || 0); }
  if (d.cmd === "at") window.renderAt(d.t);
  if (d.cmd === "slides") { await window.loadSlides(d.spec, d.catalog); await window.showSlide(d.i || 0); parent.postMessage({ cmd: "slid" }, "*"); }
  if (d.cmd === "slide") await window.showSlide(d.i);
});
window.ready = true;
