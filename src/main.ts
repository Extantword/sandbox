// KaTeX's stylesheet is here for its Computer Modern face, the serif the geometry decks are set in.
import "katex/dist/katex.min.css";
import "./style.css";
import { ANIMATIONS, type AnimationName, type Frame } from "./animations.ts";
import { SLIDES, TITLE, type Picture, type Slide } from "./slides.ts";

function need<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`the page has no ${selector}`);
  return found;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Prose with its **names** set apart. */
const rich = (text: string) =>
  escapeHtml(text)
    .split("**")
    .map((part, i) => (i % 2 === 1 ? `<strong>${part}</strong>` : part))
    .join("");


const picture = (each: Picture, className = "") =>
  `<img class="${className}" src="${each.src}" alt="${escapeHtml(each.alt)}" draggable="false" />`;

function build(slide: Slide): HTMLElement {
  const page = document.createElement("section");
  page.className = `slide slide--${slide.kind}`;
  switch (slide.kind) {
    case "cover":
      page.innerHTML = `
        <figure class="cover__figure">${picture(slide.picture)}</figure>
        <h1 class="cover__title">${escapeHtml(slide.title)}</h1>`;
      break;
    case "collage":
      page.innerHTML = `<div class="collage">${slide.pictures.map((each) => picture(each)).join("")}</div>`;
      break;
    case "quote":
      page.innerHTML = `
        <blockquote class="quote">
          <p class="quote__text">${rich(slide.text)}</p>
          <footer class="quote__by">— ${escapeHtml(slide.by)}</footer>
        </blockquote>`;
      break;
    case "list":
      page.innerHTML = `
        <div class="sheet">
          <h2 class="sheet__title">${escapeHtml(slide.title)}</h2>
          ${slide.source ? `<p class="sheet__source">${escapeHtml(slide.source)}</p>` : ""}
          <ol class="sheet__items${slide.numbered ? "" : " is-plain"}${slide.items.length > 6 ? " is-many" : ""}">
            ${slide.items.map((item) => `<li class="step"><span>${rich(item)}</span></li>`).join("")}
          </ol>
        </div>`;
      break;
    case "principle":
      page.innerHTML = `
        <div class="principle">
          <div class="principle__text">
            <p class="principle__count">${escapeHtml(slide.count)}</p>
            <h2 class="principle__name">${escapeHtml(slide.name)}</h2>
            <p class="principle__says">${rich(slide.says)}</p>
            ${slide.link ? `<a class="principle__link" href="${slide.link.href}" target="_blank" rel="noopener">${escapeHtml(slide.link.text)} ↗</a>` : ""}
          </div>
          <canvas class="principle__canvas" data-animation="${slide.animation}"></canvas>
        </div>`;
      break;
    case "example":
      page.innerHTML = `
        <div class="example">
          <h2 class="sheet__title">${escapeHtml(slide.title)}</h2>
          <p class="example__says">${rich(slide.says)}</p>
          <div class="example__pictures">${slide.pictures.map((each) => picture(each)).join("")}</div>
          <p class="example__named"><span class="label">Ejemplo</span> ${escapeHtml(slide.example)}</p>
        </div>`;
      break;
    case "gallery":
      page.innerHTML = `
        <div class="gallery">
          <h2 class="sheet__title">${escapeHtml(slide.title)}</h2>
          <div class="gallery__body">
            <div class="gallery__small">${slide.pictures.map((each) => picture(each)).join("")}</div>
            ${picture(slide.large, "gallery__large")}
          </div>
        </div>`;
      break;
    case "app":
      // Loaded the first time it is shown, and kept, so what was built there is still there.
      page.innerHTML = `<iframe class="app" title="${escapeHtml(slide.title)}" data-src="${slide.src}"></iframe>`;
      // A site of its own may be wanted whole, with nothing of the deck round it.
      if (/^https?:/.test(slide.src))
        page.insertAdjacentHTML(
          "beforeend",
          `<a class="app__open" href="${slide.src}" target="_blank" rel="noopener">abrir en otra pestaña ↗</a>`,
        );
      break;
  }
  return page;
}

function main() {
  const deck = need<HTMLElement>(".deck");
  const counter = need<HTMLElement>(".counter");
  need<HTMLElement>(".running-head").textContent = TITLE;
  const pages = SLIDES.map(build);
  deck.replaceChildren(...pages);

  const stepsOf = (i: number) => pages[i]!.querySelectorAll(".step").length;
  let index = 0;
  let step = 0;

  /** A list reveals its items up to the step it is at. */
  const syncSteps = () => {
    pages[index]!.querySelectorAll(".step").forEach((item, k) => item.classList.toggle("is-on", k < step));
  };

  /*
   * The one animation running: the slide on show's, begun afresh each time it is arrived at, and
   * nothing drawn at all while the slide on show has none.
   */
  let playing: { canvas: HTMLCanvasElement; frame: Frame } | null = null;
  let lastTime = 0;
  const tick = (now: number) => {
    if (!playing) return;
    const { canvas, frame } = playing;
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    frame(ctx, w, h, Math.min(0.05, (now - lastTime) / 1000));
    lastTime = now;
    requestAnimationFrame(tick);
  };
  const play = (page: HTMLElement) => {
    const canvas = page.querySelector<HTMLCanvasElement>("canvas[data-animation]");
    const wasPlaying = playing !== null;
    playing = canvas ? { canvas, frame: ANIMATIONS[canvas.dataset.animation as AnimationName]() } : null;
    if (playing && !wasPlaying) {
      lastTime = performance.now();
      requestAnimationFrame(tick);
    }
  };

  /** Arriving from behind, a slide shows everything it has; arriving from before, nothing yet. */
  const go = (to: number, fromBehind = false) => {
    index = Math.max(0, Math.min(SLIDES.length - 1, to));
    step = fromBehind ? stepsOf(index) : 0;
    pages.forEach((page, i) => page.classList.toggle("is-on", i === index));
    const app = pages[index]!.querySelector<HTMLIFrameElement>("iframe.app");
    if (app && !app.src) app.src = app.dataset.src!;
    // Leaving a sandbox takes the keyboard back from it.
    if (!app && document.activeElement instanceof HTMLIFrameElement) document.activeElement.blur();
    document.body.classList.toggle("is-bare", SLIDES[index]!.kind === "cover" || SLIDES[index]!.kind === "collage");
    syncSteps();
    play(pages[index]!);
    counter.textContent = `${index + 1} / ${SLIDES.length}`;
    history.replaceState(null, "", `#${index + 1}`);
  };

  const forward = () => {
    if (step < stepsOf(index)) {
      step += 1;
      syncSteps();
    } else if (index < SLIDES.length - 1) go(index + 1);
  };

  const backward = () => {
    if (step > 0) {
      step -= 1;
      syncSteps();
    } else if (index > 0) go(index - 1, true);
  };

  for (const [selector, move] of [
    [".nav__go--back", backward],
    [".nav__go--on", forward],
  ] as const) {
    const button = need<HTMLButtonElement>(selector);
    button.addEventListener("click", move);
    button.addEventListener("keydown", (event) => event.preventDefault());
  }

  const SWIPE = { far: 60, astray: 50, quick: 700 };
  let touch: { x: number; y: number; at: number } | null = null;
  window.addEventListener(
    "touchstart",
    (event) => {
      const [finger] = event.touches;
      touch =
        event.touches.length === 1 && finger && !(event.target instanceof Element && event.target.closest("button"))
          ? { x: finger.clientX, y: finger.clientY, at: performance.now() }
          : null;
    },
    { passive: true },
  );
  window.addEventListener(
    "touchend",
    (event) => {
      const started = touch;
      touch = null;
      const [finger] = event.changedTouches;
      if (!started || !finger) return;
      const across = finger.clientX - started.x;
      if (Math.abs(across) < SWIPE.far || Math.abs(finger.clientY - started.y) > SWIPE.astray) return;
      if (performance.now() - started.at > SWIPE.quick) return;
      // Swiping the page to the left brings the next slide in from the right.
      if (across < 0) forward();
      else backward();
    },
    { passive: true },
  );

  const onKey = (key: string) => {
    switch (key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
      case "Enter":
        forward();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
      case "Backspace":
        backward();
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(SLIDES.length - 1, true);
        break;
      case "f":
      case "F":
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
        break;
      default:
        return false;
    }
    return true;
  };

  // A sandbox hands on the keys that are not its own (`public/apps`, the script before </body>).
  window.addEventListener("message", (event) => {
    const key = (event.data as { deckKey?: unknown } | null)?.deckKey;
    if (typeof key === "string" && pages.some((page) => page.querySelector("iframe")?.contentWindow === event.source))
      onKey(key);
  });

  /*
   * A site of its own does not hand the keys on as ours do. Served from the same place as the deck
   * its keys can be listened to directly; from anywhere else they cannot, and the arrows are then
   * the site's until the deck is clicked.
   */
  pages.forEach((page, i) => {
    const frame = page.querySelector<HTMLIFrameElement>("iframe.app");
    const slide = SLIDES[i]!;
    if (!frame || slide.kind !== "app" || !/^https?:/.test(slide.src)) return;
    frame.addEventListener("load", () => {
      try {
        frame.contentWindow!.addEventListener("keydown", (event) => {
          // Another window's elements are not this one's HTMLElement, so ask what they are.
          const target = event.target as HTMLElement | null;
          const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName ?? ""));
          if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
          if (!["ArrowRight", "ArrowLeft", "PageDown", "PageUp"].includes(event.key)) return;
          event.preventDefault();
          onKey(event.key);
        });
      } catch {
        // Another origin: its keys are its own.
      }
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (onKey(event.key)) event.preventDefault();
  });

  go((Number.parseInt(location.hash.slice(1), 10) || 1) - 1);
}

main();
