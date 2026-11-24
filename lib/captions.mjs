// Czech IG captions + hashtags. Deterministic per seed, so "Jiná varianta" = next seed.
import { rng } from "./templates.mjs";

const one = (arr, r) => arr[Math.floor(r() * arr.length)];

const HOOKS = {
  "nos-klub": ["Nos svůj klub. Kdekoliv. 🏒", "Klub na zápěstí, ne jen na tribuně. 🏒", "Fandíš i mimo stadion? 🔥"],
  "poznas-klub": ["Poznáš klub podle tří písmen? 🤔", "Kvíz pro opravdové fanoušky! 🧠🏒", "Tři písmena, jeden klub. Dáš to? 👀"],
  "komu-fandis": ["Komu fandíš ty? 🏒", "Rozhodni hlasování! 🗳️", "Tak kdo je nejlepší? 👇"],
  "jak-vznika": ["Takhle vzniká každý náš náramek. 🧵", "Proč náš náramek vydrží? Tady je odpověď. 💪", "Žádný stroj. Jen ruce a tkanička z brusle. 🙌"],
  "darek": ["Dárek pro hokejistu vyřešen! 🎁", "Nevíš, co pod stromeček? My víme. 🎄🏒", "Dárek za 290 Kč, který udělá radost. 🎁"],
  "vlastni": ["Tvoje zkratka. Tvoje barva. 🎨", "Vytvoř si náramek, který nikdo jiný nemá. ✨", "Jméno, číslo, přezdívka? Vypleteme ji. 🧵"],
  "nejsou-pro-kazdeho": ["Tyhle náramky nejsou pro každého! 👀", "Jen pro opravdové fanoušky. 🏒", "Který z nich je tvůj? 👇"],
  "najdi-klub": ["Najdi svůj klub! 🏒", "12 klubů, jeden je tvůj. ❤️", "Extraliga i Slovensko na zápěstí. 🏒"],
  "faq": ["Odpovídáme na nejčastější otázky! 💬", "Všechno, co chceš vědět o našich náramcích. 👇", "Ptali jste se, odpovídáme. 💬"],
  "anketa": ["Který je nejhezčí? Hlasuj! 🗳️", "Pomoz nám vybrat favorita! 👇", "Jednička, dvojka, trojka, nebo čtyřka? 🤔"],
};
const BODY = {
  "nos-klub": ["Náramky z originálních hokejových tkaniček v barvách tvého klubu. Ručně pletené, kus po kuse.",
    "Tkanička z brusle, barva podle dresu a zkratka tvého týmu. Ručně pletené v Česku."],
  "poznas-klub": ["Napiš do komentářů, kolik jsi poznal(a). Bez googlení! 😄", "Kolik jsi dal(a) z tří? Pochlub se v komentářích 👇"],
  "komu-fandis": ["Napiš do komentářů číslo svého klubu. Uvidíme, kdo má nejvíc fanoušků! 👇",
    "Hlasuj číslem v komentářích. Vítězný klub ukážeme v dalším videu! 🏆"],
  "jak-vznika": ["Tkanička z brusle, barva podle aktuálního dresu, písmena zapletená do pletení a ruční práce. Proto nezplihne po týdnu nošení.",
    "Stejný materiál, jaký drží brusli na noze. Snese pot, mráz i vodu."],
  "darek": ["Univerzální velikost, takže nic neřešíš. Vyber klub, my upleteme zbytek. 🎄",
    "Barvy jeho klubu, jeho zkratka a ruční výroba. Sedne na každé zápěstí."],
  "vlastni": ["V konfigurátoru si vybereš barvu i písmena. Tři znaky v ceně, každý další za 12 Kč.",
    "Až 12 znaků, barva podle tvého výběru. Cenu vidíš rovnou v košíku."],
  "nejsou-pro-kazdeho": ["Projeď si celý carousel a napiš do komentářů, který bys nosil(a) nejradši ty. 👇",
    "Projeď carousel a napiš číslo toho, který by sis vzal(a) na zápas. 🏒"],
  "najdi-klub": ["Projeď carousel a označ kamaráda, který fandí stejnému klubu! 👇",
    "Tvůj klub chybí? Vytvoř si vlastní náramek v konfigurátoru."],
  "faq": ["Nenašel(a) jsi odpověď? Napiš nám do komentářů nebo do zpráv. 💬",
    "Uložte si to na později a pošlete kamarádovi, který se ptal. 📌"],
  "anketa": ["Napiš číslo do komentářů. Vítěz dostane speciální místo na našem profilu! 🏆",
    "Hlasuj číslem v komentářích 👇"],
};
const CTA = [
  (c) => `Pro 15% slevu na celou objednávku napiš v košíku na offsidestore.cz kód ${c.toLowerCase()} 🛒`,
  (c) => `Kód ${c.toLowerCase()} = −15 % na celou objednávku. Odkaz máš v profilu 🔗`,
  (c) => `Objednávej na offsidestore.cz (odkaz v profilu) a s kódem ${c.toLowerCase()} máš 15 % dolů. 🏒`,
];

const CORE = ["#hokej", "#hokejovynaramek", "#offsidestore", "#hokejovyfanousek"];
const LEAGUE = ["#extraliga", "#tipsportextraliga", "#czechhockey", "#hockey"];
const TOPIC = {
  "jak-vznika": ["#rucnivyroba", "#handmade", "#madeinczech"],
  "darek": ["#darekprohokejistu", "#vanocnidarek", "#tipnadarek"],
  "vlastni": ["#namiru", "#personalizovanydarek", "#handmade"],
  "poznas-klub": ["#hokejovykviz", "#kviz"],
  "komu-fandis": ["#hlasovani", "#fandim"],
  "anketa": ["#hlasovani", "#fandim"],
  "faq": ["#rucnivyroba", "#naramek"],
};

export function caption(spec, catalog, seed = spec.seed) {
  const r = rng(seed + 7);
  const t = spec.template;
  const ids = new Set();
  for (const s of spec.scenes || spec.slides || []) { if (s.item) ids.add(s.item); (s.items || []).forEach((i) => ids.add(i)); }
  const clubTags = [...ids].map((id) => catalog.find((c) => c.id === id)?.tag).filter(Boolean);
  const month = new Date().getMonth();
  const seasonal = month >= 10 ? ["#vanoce", "#darek"] : [];
  const tags = [...new Set([...CORE, one(LEAGUE, r), ...(TOPIC[t] || ["#naramek"]), ...clubTags.slice(0, 4), ...(t === "darek" ? [] : seasonal.slice(0, 1))])].slice(0, 14);
  const text = [one(HOOKS[t] || ["🏒"], r), one(BODY[t] || [""], r), one(CTA, r)(spec.code || "OFFSIDE15")].filter(Boolean).join("\n\n");
  return { text, hashtags: tags };
}

// Optional rewrite by the local Ollama model (gemma4 — qwen3.6 freezes this 24 GB Mac).
export async function aiCaption(spec, base) {
  const prompt = `Jsi copywriter českého e-shopu Offside Store (ručně pletené náramky z hokejových tkaniček v barvách klubů, 290 Kč, offsidestore.cz).
Přepiš tento popisek Instagram ${spec.kind === "reel" ? "reelu" : "carouselu"} jinými slovy. Pravidla:
- česky, VŽDY tykej (ty, napiš, vyber), nikdy nevykej
- max 4 krátké věty, 2–4 emoji, odstavce odděl prázdným řádkem
- nevymýšlej nic nového: žádné soutěže, dárky ani akce, které v textu nejsou; fakta a ceny nech přesně
- slevový kód napiš přesně tak, jak je, i s tím, že se zadává v košíku na offsidestore.cz
- žádné hashtagy, žádné uvozovky, vrať jen hotový text

${base.text}`;
  const res = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST", body: JSON.stringify({ model: "gemma4", prompt, stream: false, options: { temperature: 0.8 } }),
  });
  if (!res.ok) throw new Error("Ollama neběží (spusť aplikaci Ollama)");
  const j = await res.json();
  return { text: j.response.trim().replace(/^["„]|["“]$/g, ""), hashtags: base.hashtags };
}
