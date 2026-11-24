// Content templates for a hockey-merch shop. Each one turns the catalog into an editable spec:
// reels = scenes (on-screen text + "say" = what the voice reads), carousels = slides.
// *word* in text = red accent word.

export const FACTS = {
  tkanicka: ["TKANIČKA Z BRUSLE", "Stejný materiál, jaký drží brusli na noze. Snese pot, mráz i vodu."],
  barva: ["BARVA PODLE DRESU", "Odstín ladíme podle aktuálního dresu, ne podle toho, co je zrovna skladem."],
  zkratka: ["ZKRATKA V PLETENÍ", "Písmena nejsou nalepená ani potištěná. Jsou zapletená, takže se nesetřou."],
  rucne: ["SPLÉTÁNO RUKOU", "Každý kus splétáme ručně. Drobné odchylky nejsou vada — je to důkaz, že to nedělal stroj."],
  velikost: ["JEDNA VELIKOST PRO VŠECHNY", "Posuvný uzel, dotáhneš si ho přímo na ruce. Sedne na zápěstí 16–21 cm."],
  voda: ["VYDRŽÍ I SPRCHU", "Tkanička i koncovka snesou déšť i sprchu. Nemusíš ho sundávat."],
  cena: ["290 KČ", "Tři znaky v ceně. Každý další za 12 Kč, maximálně dvanáct."],
  vraceni: ["30 DNÍ NA VRÁCENÍ", "Standardní edici vrátíš do 30 dnů bez udání důvodu."],
};

const FAQ = [
  ["Z čeho je náramek?", "Z originálních hokejových tkaniček — stejných, jaké hráči mají v bruslích. Zakončený kovovou koncovkou."],
  ["Kolik znaků můžu mít?", "V ceně 290 Kč jsou tři znaky. Každý další stojí 12 Kč, maximum je dvanáct."],
  ["Jakou velikost?", "Žádnou neřešíš. Univerzální velikost s posuvným uzlem, sedne na zápěstí 16–21 cm."],
  ["Kdy dorazí?", "Každý kus splétáme ručně. Termín odeslání ti potvrdíme e-mailem hned po objednání."],
  ["Vydrží ve vodě?", "Ano. Déšť i sprchu zvládne. Jen ho dlouho nemáčej ve slané vodě a chlóru."],
  ["Můžu ho vrátit?", "Standardní edici do 30 dnů bez udání důvodu. Kusy na míru při vadě výroby."],
];

const LETTER = { A: "á", B: "bé", C: "cé", D: "dé", E: "é", F: "ef", G: "gé", H: "há", I: "í", J: "jé", K: "ká", L: "el",
  M: "em", N: "en", O: "ó", P: "pé", R: "er", S: "es", T: "té", U: "ú", V: "vé", Z: "zet", Y: "ypsilon", X: "iks" };
export const spell = (code) => code.split("").map((c) => LETTER[c] || c).join(", ");

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const shuffle = (arr, r) => arr.map((v) => [r(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

export const REELS = {
  "nos-klub": { name: "Nos svůj klub (showcase)", desc: "Háček → 3 náramky → jak vzniká → výzva" },
  "poznas-klub": { name: "Poznáš klub podle zkratky?", desc: "Kvíz: písmena → odhalení klubu, sbírá komentáře" },
  "komu-fandis": { name: "Komu fandíš? (anketa)", desc: "4 kluby s čísly, „napiš číslo do komentářů“" },
  "jak-vznika": { name: "Jak vzniká náramek", desc: "4 kroky výroby z webu" },
  "darek": { name: "Dárek pro hokejistu", desc: "Vánoční/dárkový reel se slevovým kódem" },
  "vlastni": { name: "Vlastní zkratka", desc: "Konfigurátor: písmena se skládají, cena podle znaků" },
};
export const CAROUSELS = {
  "nejsou-pro-kazdeho": { name: "Nejsou pro každého…", desc: "Obálka → číslované náramky → promo (jako jejich trička)" },
  "najdi-klub": { name: "Najdi svůj klub", desc: "Mřížka všech klubů po 4 + promo" },
  "jak-vznika": { name: "Jak vzniká náramek", desc: "4 kroky výroby + promo" },
  "darek": { name: "Dárek pro hokejistu", desc: "Proč je to ideální dárek + kód + promo" },
  "faq": { name: "Časté otázky", desc: "6 otázek a odpovědí z webu" },
  "anketa": { name: "Který je nejhezčí?", desc: "4 náramky s čísly → napiš číslo do komentářů" },
};

export function buildSpec(kind, template, catalog, opts = {}) {
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const r = rng(seed);
  const code = opts.code || "OFFSIDE15";
  const clubs = catalog.filter((i) => i.type === "naramek");
  const picked = opts.items?.length ? opts.items.map((id) => catalog.find((i) => i.id === id)).filter(Boolean) : shuffle(clubs, r);
  const pick = (n) => picked.slice(0, n);
  const conf = catalog.find((i) => i.type === "konfigurator") || clubs[0];
  const base = { kind, template, seed, code, mascot: { on: true, bubble: true }, voice: null };

  if (kind === "reel") {
    const cta = (say) => ({ type: "cta", text: "OFFSIDESTORE.CZ", sub: `Kód *${code}* = −15 %`, say, dur: 3.2 });
    const S = {
      "nos-klub": () => [
        { type: "hook", text: "NOS SVŮJ *KLUB*. KDEKOLIV.", say: "Nos svůj klub. Kdekoliv.", dur: 2.2 },
        ...pick(3).map((it) => ({ type: "product", item: it.id, text: it.code, sub: it.club, say: it.short + ".", dur: 1.6 })),
        { type: "fact", text: "Z ORIGINÁLNÍCH *HOKEJOVÝCH* TKANIČEK", sub: "Ručně pletené, kus po kuse.", item: conf.id,
          say: "Z originálních hokejových tkaniček. Ručně pletené, kus po kuse.", dur: 3 },
        cta("Vyber si svůj klub. Odkaz máš v profilu."),
      ],
      "poznas-klub": () => [
        { type: "hook", text: "POZNÁŠ KLUB PODLE *ZKRATKY*?", say: "Poznáš klub podle zkratky?", dur: 2.2 },
        ...pick(3).map((it) => ({ type: "quiz", item: it.id, text: it.code, sub: it.club, reveal: 1.7, noCaption: true,
          say: `${spell(it.code)}… ${it.short}!`, dur: 2.8 })),
        cta("Kolik jsi jich dal? Napiš to do komentářů."),
      ],
      "komu-fandis": () => [
        { type: "hook", text: "KOMU *FANDÍŠ*?", say: "Tak komu fandíš?", dur: 1.8 },
        { type: "poll", items: pick(4).map((i) => i.id), text: "NAPIŠ ČÍSLO DO KOMENTÁŘŮ", say: "Jednička, dvojka, trojka, nebo čtyřka? Napiš číslo do komentářů.", dur: 4.5 },
        cta("Každý klub najdeš na Offside Store. Odkaz máš v profilu."),
      ],
      "jak-vznika": () => [
        { type: "hook", text: "JAK VZNIKÁ *NÁRAMEK*", say: "Jak vzniká náš náramek?", dur: 2 },
        ...["tkanicka", "barva", "zkratka", "rucne"].map((k, i) => ({ type: "fact", num: i + 1, text: FACTS[k][0], sub: FACTS[k][1],
          item: pick(4)[i]?.id, say: FACTS[k][1], dur: 3 })),
        cta("Vyber si ten svůj. Odkaz máš v profilu."),
      ],
      "darek": () => [
        { type: "hook", text: "DÁREK PRO *HOKEJISTU* ZA 290 KČ", say: "Nevíš, co dát hokejistovi pod stromeček?", dur: 2.4 },
        ...pick(3).map((it) => ({ type: "product", item: it.id, text: it.code, sub: it.club, say: it.short + ".", dur: 1.4 })),
        { type: "fact", text: "JEDNA VELIKOST PRO *VŠECHNY*", sub: "Nic neřešíš. Dotáhne se přímo na ruce.", item: conf.id,
          say: "Jedna velikost pro všechny, nic neřešíš.", dur: 2.6 },
        { type: "code", text: code, sub: "−15 % na celou objednávku", say: `A s kódem ${code.replace(/(\d+)$/, " $1")} máš patnáct procent dolů.`, dur: 2.6 },
        cta("Odkaz máš v profilu."),
      ],
      "vlastni": () => {
        const word = (opts.word || "TATA").toUpperCase();
        const extra = Math.max(0, word.length - 3);
        return [
          { type: "hook", text: "TVOJE *ZKRATKA*. TVOJE BARVA.", say: "Tvoje zkratka. Tvoje barva.", dur: 2.2 },
          { type: "letters", text: word, color: "#E30613", sub: `${290 + extra * 12} Kč`, say: `Třeba ${word.toLowerCase()}. Až dvanáct znaků.`, dur: 3.2 },
          { type: "fact", text: "TŘI ZNAKY V *CENĚ*", sub: "Každý další za 12 Kč.", item: conf.id, say: "Tři znaky máš v ceně, každý další za dvanáct korun.", dur: 2.8 },
          cta("Poskládej si ho v konfigurátoru. Odkaz máš v profilu."),
        ];
      },
    };
    return { ...base, scenes: S[template]() };
  }

  const promo = (bubble) => ({ type: "promo", text: "HOKEJ JE VÍC *NEŽ HRA*.", sub: "Ukaž, že k němu patříš.", bubble, items: pick(3).map((i) => i.id) });
  const S = {
    "nejsou-pro-kazdeho": () => [
      { type: "cover", text: "EXISTUJÍ NÁRAMKY, KTERÉ NEJSOU PRO *KAŽDÉHO*…", bubble: "Přejeď →" },
      ...pick(5).map((it, i) => ({ type: "product", num: i + 1, item: it.id, text: it.code, sub: it.club })),
      promo("Který si vezmeš ty?"),
    ],
    "najdi-klub": () => {
      const all = clubs;
      const pages = [];
      for (let i = 0; i < all.length; i += 4) pages.push({ type: "grid", items: all.slice(i, i + 4).map((x) => x.id) });
      return [{ type: "cover", text: `${all.length} KLUBŮ. NAJDI *TEN SVŮJ*.`, bubble: "Přejeď →" }, ...pages, promo("Tvůj klub chybí? Udělej si vlastní!")];
    },
    "jak-vznika": () => [
      { type: "cover", text: "JAK VZNIKÁ *NÁRAMEK*", bubble: "Přejeď →" },
      ...["tkanicka", "barva", "zkratka", "rucne"].map((k, i) => ({ type: "fact", num: i + 1, text: FACTS[k][0], sub: FACTS[k][1], item: pick(4)[i]?.id })),
      promo("Teď už víš, proč vydrží."),
    ],
    "darek": () => [
      { type: "cover", text: "DÁREK, KTERÝ HOKEJISTA *OCENÍ*", bubble: "Přejeď →" },
      ...["cena", "velikost", "voda", "zkratka"].map((k, i) => ({ type: "fact", num: i + 1, text: FACTS[k][0], sub: FACTS[k][1], item: pick(4)[i]?.id })),
      { type: "code", text: code, sub: "−15 % na celou objednávku" },
      promo("Pod stromeček ideální!"),
    ],
    "faq": () => [
      { type: "cover", text: "ČASTÉ *OTÁZKY*", bubble: "Přejeď →" },
      ...FAQ.map(([q, a], i) => ({ type: "fact", num: i + 1, text: q.toUpperCase(), sub: a, item: pick(6)[i]?.id })),
      promo("Další otázka? Napiš do komentářů!"),
    ],
    "anketa": () => [
      { type: "cover", text: "KTERÝ JE *NEJHEZČÍ*?", bubble: "Přejeď a hlasuj →" },
      ...pick(4).map((it, i) => ({ type: "product", num: i + 1, item: it.id, text: it.code, sub: it.club })),
      { type: "comment", text: "NAPIŠ *ČÍSLO* DO KOMENTÁŘŮ", items: pick(4).map((i) => i.id), bubble: "Hlasuj!" },
    ],
  };
  return { ...base, slides: S[template]() };
}
