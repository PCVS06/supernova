import {planDigitReveal} from "@/features/sessions/lib/streaming/digit-reveal-plan";
import type {DigitRevealPlan} from "@/features/sessions/lib/streaming/digit-reveal-plan";

const HIGHLIGHT_NAME = "radian-digits";
const DIGIT_FRAME_MS = 45;
const graphemes = new Intl.Segmenter(undefined, {granularity: "grapheme"});

interface TextRun {
  readonly node: Text;
  readonly offset: number;
}

interface AnimateDigitRevealOptions {
  readonly element: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly digits: string;
  readonly onComplete: () => void;
}

/** Masks only pending glyphs in the real layout, without changing text, wrapping, selection, or accessibility. */
export function animateDigitReveal(options: AnimateDigitRevealOptions): () => void {
  const {element, canvas, digits, onComplete} = options;
  const content = element.querySelector<HTMLElement>(".math-response-content");
  const context = canvas.getContext("2d");
  if (!content || !context || typeof Highlight === "undefined" || !CSS.highlights) {
    element.dataset.revealPreparing = "false";
    onComplete();
    return () => undefined;
  }
  const highlight = CSS.highlights.get(HIGHLIGHT_NAME) ?? new Highlight();
  CSS.highlights.set(HIGHLIGHT_NAME, highlight);
  const alphabet = Array.from(digits.replace(/\s/g, ""));
  let plan: DigitRevealPlan = {text: "", deadlines: []};
  let runs: TextRun[] = [];
  let ownedRanges: Range[] = [];
  let frame = 0;
  let timer = 0;
  let disposed = false;

  const clear = (): void => {
    for (const range of ownedRanges) highlight.delete(range);
    ownedRanges = [];
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    mutations.disconnect();
    attributes.disconnect();
    resize.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("scroll", schedule, true);
    clear();
    element.dataset.revealing = "false";
    element.dataset.revealPreparing = "false";
    if (highlight.size === 0) CSS.highlights.delete(HIGHLIGHT_NAME);
  };

  const finish = (): void => {
    dispose();
    onComplete();
  };

  const draw = (): void => {
    frame = 0;
    if (disposed) return;
    if (document.hidden) {
      finish();
      return;
    }
    clear();
    const now = performance.now();
    const bounds = element.getBoundingClientRect();
    const top = Math.max(0, -bounds.top);
    const height = Math.max(1, Math.min(bounds.height - top, window.innerHeight));
    const width = Math.max(1, bounds.width);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.top = `${top}px`;
    context.scale(ratio, ratio);
    context.textBaseline = "middle";
    const phase = Math.floor(now / DIGIT_FRAME_MS);
    let pending = false;
    for (const {node, offset} of runs) {
      if (!node.isConnected) continue;
      const style = window.getComputedStyle(node.parentElement!);
      // Respect nested code/table scrollports, not just the outer conversation.
      context.save();
      for (let parent = node.parentElement; parent && parent !== element; parent = parent.parentElement) {
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.overflowX === "visible" && parentStyle.overflowY === "visible") continue;
        const clip = parent.getBoundingClientRect();
        context.beginPath();
        context.rect(clip.left - bounds.left, clip.top - bounds.top - top, clip.width, clip.height);
        context.clip();
      }
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.fillStyle = style.color;
      for (const {segment, index} of graphemes.segment(node.data)) {
        if ((plan.deadlines[offset + index] ?? 0) <= now || /^\s+$/.test(segment)) continue;
        pending = true;
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + segment.length);
        highlight.add(range);
        ownedRanges.push(range);
        const rect = range.getBoundingClientRect();
        if (!rect.width || rect.bottom < 0 || rect.top > window.innerHeight) continue;
        const glyph = alphabet[(offset + index + phase) % alphabet.length] ?? "0";
        const glyphWidth = Math.min(rect.width, context.measureText(glyph).width);
        context.fillText(glyph, rect.left - bounds.left + (rect.width - glyphWidth) / 2, rect.top - bounds.top - top + rect.height / 2, rect.width);
      }
      context.restore();
    }
    element.dataset.revealing = String(pending);
    element.dataset.revealPreparing = "false";
    if (pending) timer = window.setTimeout(schedule, DIGIT_FRAME_MS);
    else if (element.dataset.revealLive !== "true") finish();
  };

  const schedule = (): void => {
    if (disposed || frame) return;
    window.clearTimeout(timer);
    frame = requestAnimationFrame(draw);
  };

  const refresh = (): void => {
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    runs = [];
    let text = "";
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.parentElement?.closest("button, [aria-hidden='true'], svg")) continue;
      runs.push({node, offset: text.length});
      text += node.data;
    }
    plan = planDigitReveal(plan, text, performance.now());
    // Mutation observers run before paint: mask newly streamed text immediately.
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    draw();
  };

  const onVisibilityChange = (): void => {
    if (document.hidden) finish();
  };
  const mutations = new MutationObserver(refresh);
  const attributes = new MutationObserver(schedule);
  const resize = new ResizeObserver(schedule);
  mutations.observe(content, {subtree: true, characterData: true, childList: true});
  attributes.observe(element, {attributes: true, attributeFilter: ["data-reveal-live"]});
  resize.observe(content);
  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("scroll", schedule, true);
  refresh();
  return dispose;
}
