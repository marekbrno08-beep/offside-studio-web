// Uploaded voice → word timings without whisper (the browser build has no Python).
// The script is known, so it is enough to find the pauses in the recording and match them to
// sentence/comma ends; words inside a phrase share its time by length. Also returns the
// loudness envelope (1/30 s, p95-normalised) that drives the mascot's mouth — same as lib/voice.mjs.

export async function decode(blob) {
  const ctx = new OfflineAudioContext(1, 1, 48000);
  return ctx.decodeAudioData(await blob.arrayBuffer());
}

function mono(buf) {
  const n = buf.length, out = new Float32Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / buf.numberOfChannels; }
  return out;
}
function rms(x, sr, fps) {
  const step = Math.round(sr / fps), out = [];
  for (let i = 0; i < x.length; i += step) { let s = 0; const e = Math.min(i + step, x.length); for (let j = i; j < e; j++) s += x[j] * x[j]; out.push(Math.sqrt(s / step)); }
  return out;
}
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * q)] || 1e-9; };

export async function analyseVoice(blob, script) {
  const buf = await decode(blob), x = mono(buf), sr = buf.sampleRate;
  const e30 = rms(x, sr, 30), p95 = pct(e30, 0.95);
  const env = e30.map((v) => Math.round(Math.min(1, v / p95) * 100) / 100);

  // speech / silence at 100 Hz
  const e = rms(x, sr, 100), thr = Math.max(pct(e, 0.95) * 0.1, pct(e, 0.1) * 2.5);
  const on = e.map((v, i) => (e[i - 1] ?? v) + v + (e[i + 1] ?? v) > 3 * thr);
  const first = on.indexOf(true), last = on.lastIndexOf(true);
  if (first < 0) throw new Error("V nahrávce není slyšet řeč");
  const t0 = first / 100, t1 = (last + 1) / 100;
  const gaps = [];
  for (let i = first, s = -1; i <= last; i++) {
    if (!on[i] && s < 0) s = i;
    if (on[i] && s >= 0) { if (i - s >= 9) gaps.push({ a: s / 100, b: i / 100 }); s = -1; }
  }

  // phrases = runs of words up to , . ! ? …
  const words = script.split(/\s+/).filter(Boolean);
  const wt = (w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1.5;
  const phrases = [];
  let cur = [];
  words.forEach((w, i) => { cur.push(i); if (/[.,!?…:;]$/.test(w) || i === words.length - 1) { phrases.push(cur); cur = []; } });
  const pw = phrases.map((p) => p.reduce((a, i) => a + wt(words[i]), 0)), W = pw.reduce((a, b) => a + b, 0);

  // monotone match of phrase boundaries to pauses (DP): close to the expected time, prefer long pauses
  const nb = phrases.length - 1, m = gaps.length;
  const exp = []; let acc = 0;
  for (let k = 0; k < nb; k++) { acc += pw[k]; exp.push(t0 + (t1 - t0) * acc / W); }
  const span = t1 - t0, SKIP = 0.12 * span;
  // a used pause earns a fixed reward, so with as many pauses as phrase ends they pair up in order
  const REWARD = 0.5 * span / (nb + 1);
  const cost = (k, j) => 0.5 * Math.abs((gaps[j].a + gaps[j].b) / 2 - exp[k]) - 0.6 * (gaps[j].b - gaps[j].a) - REWARD;
  // D[k][j] = best cost for boundaries < k using gaps < j
  const D = Array.from({ length: nb + 1 }, () => new Array(m + 1).fill(Infinity)), how = Array.from({ length: nb + 1 }, () => new Array(m + 1).fill(null));
  for (let j = 0; j <= m; j++) D[0][j] = 0;
  for (let k = 1; k <= nb; k++) for (let j = 0; j <= m; j++) {
    let best = D[k - 1][j] + SKIP, h = "skip";                                    // boundary without a pause
    if (j > 0 && D[k][j - 1] < best) { best = D[k][j - 1]; h = "drop"; }           // pause not used
    if (j > 0 && D[k - 1][j - 1] + cost(k - 1, j - 1) < best) { best = D[k - 1][j - 1] + cost(k - 1, j - 1); h = "use"; }
    D[k][j] = best; how[k][j] = h;
  }
  const pick = new Array(nb).fill(null);
  for (let k = nb, j = m; k > 0;) { const h = how[k][j]; if (h === "use") { pick[k - 1] = gaps[j - 1]; k--; j--; } else if (h === "drop") j--; else k--; }

  // groups of phrases between used pauses; words share each group's time by weight
  const out = [];
  let gs = t0, grp = [];
  const flush = (end) => {
    const ids = grp.flat(), tot = ids.reduce((a, i) => a + wt(words[i]), 0) || 1;
    let t = gs;
    for (const i of ids) { const d = (end - gs) * wt(words[i]) / tot; out[i] = [+t.toFixed(2), +(t + d).toFixed(2), words[i]]; t += d; }
    grp = [];
  };
  phrases.forEach((p, k) => {
    grp.push(p);
    if (k < nb && pick[k]) { flush(pick[k].a); gs = pick[k].b; }
  });
  flush(t1);
  return { words: out, env, duration: buf.duration };
}
