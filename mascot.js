// "Offík" — cartoon husky in the black Offside hoodie with a hockey stick.
// Same flat, outlined sticker style as the Project Two fox; drawn as SVG so it can lip-sync
// to the voice (mouth opening = voice loudness) and wave, blink and bob deterministically per frame.
const O = 'stroke="#111" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"';
const GREY = "#7E8898", DARK = "#5C6676", PINK = "#F2A7B4";

export function mascotSVG() {
  const ear = (m) => `<g transform="${m}">
      <path d="M178 196 L146 46 Q150 30 166 40 L268 140 Z" fill="${GREY}" ${O}/>
      <path d="M182 176 L162 76 L240 146 Z" fill="${PINK}"/>
    </g>`;
  return `<svg viewBox="-40 0 640 700" xmlns="http://www.w3.org/2000/svg" class="offik">
  <g class="m-body">
    <!-- stick (behind the paw) -->
    <g class="m-stick">
      <path d="M470 300 L500 668" stroke="#111" stroke-width="30" stroke-linecap="round"/>
      <path d="M470 300 L500 668" stroke="#F4F1EA" stroke-width="16" stroke-linecap="round"/>
      <path d="M472 320 L476 372" stroke="#111" stroke-width="18"/>
      <path d="M494 600 C496 640 500 668 520 680 L590 690 C600 678 596 664 584 660 L520 652 C512 640 510 620 508 600 Z" fill="#111" ${O}/>
    </g>
    <!-- hoodie -->
    <path d="M168 478 C186 428 238 408 300 408 C362 408 414 428 432 478 L456 712 L144 712 Z" fill="#171717" ${O}/>
    <path d="M222 424 C244 398 356 398 378 424 C356 452 244 452 222 424 Z" fill="#2A2A2A" ${O}/>
    <path d="M278 444 L272 506 M322 444 L328 506" stroke="#EDEDED" stroke-width="7" stroke-linecap="round"/>
    <circle cx="272" cy="510" r="7" fill="#EDEDED"/><circle cx="328" cy="510" r="7" fill="#EDEDED"/>
    <path d="M214 650 Q300 630 386 650" stroke="#2E2E2E" stroke-width="6" fill="none"/>
    <!-- Offside logo: dot · bar · red dot -->
    <circle cx="266" cy="578" r="11" fill="#fff"/>
    <rect x="293" y="534" width="14" height="82" rx="3" fill="#fff"/>
    <circle cx="334" cy="552" r="11" fill="#E30613"/>
    <!-- right arm holding the stick -->
    <path d="M420 470 C452 512 470 572 472 626 L434 634 C428 590 414 544 398 512 Z" fill="#171717" ${O}/>
    <g transform="translate(486 640)"><ellipse rx="30" ry="27" fill="${GREY}" ${O}/><path d="M-14 -8 Q-4 0 -16 10 M2 -14 Q10 -2 0 12" stroke="#111" stroke-width="5" fill="none"/></g>
    <!-- waving arm -->
    <g class="m-arm">
      <path d="M180 470 C138 440 96 398 70 346 L112 326 C134 376 176 418 214 452 Z" fill="#171717" ${O}/>
      <g transform="translate(78 300) scale(1.12)">
        <ellipse cx="0" cy="8" rx="34" ry="30" fill="${GREY}" ${O}/>
        <ellipse cx="-26" cy="-22" rx="11" ry="17" transform="rotate(-25 -26 -22)" fill="${GREY}" ${O}/>
        <ellipse cx="-4" cy="-32" rx="11" ry="18" fill="${GREY}" ${O}/>
        <ellipse cx="20" cy="-26" rx="11" ry="17" transform="rotate(22 20 -26)" fill="${GREY}" ${O}/>
        <ellipse cx="38" cy="0" rx="10" ry="15" transform="rotate(60 38 0)" fill="${GREY}" ${O}/>
        <ellipse cx="2" cy="12" rx="14" ry="11" fill="${PINK}"/>
      </g>
    </g>
    <!-- head -->
    <g class="m-head">
      ${ear("")}
      ${ear("translate(600 0) scale(-1 1)")}
      <path d="M300 104 C382 104 446 150 466 226 L502 260 L462 276 L490 306 L444 316 C420 372 366 402 300 402 C234 402 180 372 156 316 L110 306 L138 276 L98 260 L134 226 C154 150 218 104 300 104 Z" fill="${GREY}" ${O}/>
      <path d="M300 160 C318 160 330 196 340 214 C382 204 420 226 432 262 L454 302 C420 366 364 394 300 394 C236 394 180 366 146 302 L168 262 C180 226 218 204 260 214 C270 196 282 160 300 160 Z" fill="#fff"/>
      <path d="M300 104 C330 104 318 150 300 160 C282 150 270 104 300 104 Z" fill="${DARK}"/>
      <g class="m-brows">
        <path d="M218 204 Q248 186 280 202" stroke="#2B313B" stroke-width="10" fill="none" stroke-linecap="round"/>
        <path d="M382 204 Q352 186 320 202" stroke="#2B313B" stroke-width="10" fill="none" stroke-linecap="round"/>
      </g>
      ${[250, 350].map((x) => `<g class="m-eye" style="transform-origin:${x}px 256px">
        <ellipse cx="${x}" cy="256" rx="31" ry="37" fill="#fff" ${O}/>
        <g class="m-iris"><circle cx="${x + 4}" cy="262" r="20" fill="#3D8FE0"/><circle cx="${x + 4}" cy="262" r="11" fill="#111"/>
        <circle cx="${x + 10}" cy="254" r="6" fill="#fff"/></g>
      </g>`).join("")}
      <path class="m-lids" d="" fill="${GREY}" ${O}/>
      <path class="m-mouth-open" d="" fill="#7A1E2C" ${O}/>
      <path class="m-tongue" d="" fill="#F07C8E"/>
      <path class="m-mouth" d="M258 334 Q280 352 300 334 Q320 352 342 334" stroke="#111" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M300 318 L300 334" stroke="#111" stroke-width="7" stroke-linecap="round"/>
      <ellipse cx="300" cy="306" rx="26" ry="17" fill="#111"/>
      <ellipse cx="292" cy="300" rx="8" ry="4" fill="#fff" opacity=".7"/>
    </g>
  </g>
</svg>`;
}

// t: seconds, open: 0..1 mouth opening, wave: 0..1 wave strength
export function poseMascot(svg, { t = 0, open = 0, wave = 0.6, excited = 0 }) {
  const q = (s) => svg.querySelector(s);
  const bob = Math.sin(t * 2 * Math.PI * 0.9) * 6;
  q(".m-body").setAttribute("transform", `translate(0 ${bob.toFixed(2)})`);
  const head = Math.sin(t * 2 * Math.PI * 0.55) * 3 + open * 2;
  q(".m-head").setAttribute("transform", `rotate(${head.toFixed(2)} 300 400) translate(0 ${(-open * 4).toFixed(2)})`);
  const a = Math.sin(t * 2 * Math.PI * 1.6) * (6 + 14 * wave);
  q(".m-arm").setAttribute("transform", `rotate(${a.toFixed(2)} 190 470)`);
  q(".m-brows").setAttribute("transform", `translate(0 ${(-6 * excited - 5 * open).toFixed(2)})`);
  // blink ~ every 3.1 s for 0.14 s
  const ph = (t + 0.7) % 3.1, b = ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
  const lid = (x) => `M${x - 33} 256 C${x - 33} ${256 - 40} ${x + 33} ${256 - 40} ${x + 33} 256 ` +
    `C${x + 33} ${256 - 38 + 76 * b} ${x - 33} ${256 - 38 + 76 * b} ${x - 33} 256 Z`;
  q(".m-lids").setAttribute("d", b > 0.02 ? lid(250) + lid(350) : "");
  const o = Math.max(0, Math.min(1, open));
  if (o > 0.04) {
    const d = 18 + 58 * o, w = 42 + 6 * o;
    q(".m-mouth-open").setAttribute("d", `M${300 - w} 332 C${300 - w / 2} 344 ${300 + w / 2} 344 ${300 + w} 332 C${300 + w - 2} ${332 + d * 0.9} ${300 + w / 2} ${332 + d} 300 ${332 + d} C${300 - w / 2} ${332 + d} ${300 - w + 2} ${332 + d * 0.9} ${300 - w} 332 Z`);
    q(".m-tongue").setAttribute("d", `M${300 - w * 0.55} ${332 + d * 0.82} C${300 - w * 0.3} ${332 + d * 0.5} ${300 + w * 0.3} ${332 + d * 0.5} ${300 + w * 0.55} ${332 + d * 0.82} C${300 + w * 0.3} ${332 + d * 0.98} ${300 - w * 0.3} ${332 + d * 0.98} ${300 - w * 0.55} ${332 + d * 0.82} Z`);
    q(".m-mouth").setAttribute("opacity", "0");
  } else {
    q(".m-mouth-open").setAttribute("d", "");
    q(".m-tongue").setAttribute("d", "");
    q(".m-mouth").setAttribute("opacity", "1");
  }
}
