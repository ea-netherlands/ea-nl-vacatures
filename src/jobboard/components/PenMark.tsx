/**
 * The pencil underline and the yellow marker, as on the website's home page.
 *
 * Copied from the design system's snippet (ean-design, assets/snippets) so the
 * board's hero carries the same two marks as the site's: one hand-drawn teal
 * stroke under a word of the title, and a highlighter behind one phrase of the
 * lead. The stroke comes from a fixed seed, so server and client render the
 * same shape. Units: the viewBox is 240 × 50, where 50 units = 0.5em of the
 * heading; the SVG is sized in em (layout.module.css), so the line weight
 * stays in proportion at every font size.
 *
 * There is one underline per page (the hero's), so its filter and mask ids are
 * fixed rather than generated.
 */

import type { ReactNode } from 'react'
import s from './layout.module.css'

const W = 240;
const H = 50;
const SEED = 48;

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const bez = (p: number[], t: number) => {
  const u = 1 - t;
  return u * u * u * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t * t * t * p[3];
};
const f = (n: number) => n.toFixed(1);

function pencil() {
  const r = rng(SEED);
  const x0 = W * 0.03 + (r() - 0.5) * 7;
  const x1 = W * 0.97 + (r() - 0.5) * 7;
  const yb = H * 0.55;
  // A gentle rise from left to right, in units of 5 (0.05em).
  const cy = [1.8, -0.4, -0.2, -1.6].map((v) => yb + v * 5 + (r() - 0.5) * 2);
  const f1 = 1.5 + r() * 1.5;
  const f2 = 4 + r() * 4;
  const p1 = r() * 6.28;
  const p2 = r() * 6.28;
  const wobble = 0.7;

  const pts: [number, number][] = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y =
      bez(cy, t) +
      wobble * (Math.sin(6.283 * f1 * t + p1) * 0.65 + Math.sin(6.283 * f2 * t + p2) * 0.35);
    pts.push([x0 + (x1 - x0) * t, y]);
  }

  const M = pts.length - 1;
  const left: string[] = [];
  const right: string[] = [];
  const widths: number[] = [];
  for (let k = 0; k <= M; k++) {
    const a = pts[Math.max(0, k - 1)];
    const b = pts[Math.min(M, k + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const t = k / M;
    const w = Math.max(
      0.6,
      7.5 * clamp(t * 20, 0.4, 1) * clamp((1 - t) * 10, 0.3, 1),
    );
    widths.push(w);
    left.push(`${f(pts[k][0] + (nx * w) / 2)} ${f(pts[k][1] + (ny * w) / 2)}`);
    right.push(`${f(pts[k][0] - (nx * w) / 2)} ${f(pts[k][1] - (ny * w) / 2)}`);
  }
  return {
    outline: `M${left.join("L")}L${right.reverse().join("L")}Z`,
    caps: [
      { cx: pts[0][0], cy: pts[0][1], r: widths[0] / 2 },
      { cx: pts[M][0], cy: pts[M][1], r: widths[M] / 2 },
    ],
    center: `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join("L")}`,
  };
}

const STROKE = pencil();


/** One word of a heading, in teal, with the pencil stroke under it. */
export function PenMark({ children }: { children: string }) {
  const box = { x: -20, y: -20, width: W + 40, height: H + 40 }
  return (
    <span className={s.penMark}>
      {children}
      <svg
        className={s.pen}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* Slightly rough edges, then graphite grain: noise used as an alpha mask. */}
          <filter id="jb-pen-ink" filterUnits="userSpaceOnUse" {...box} colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves={2} seed={3} result="rough" />
            <feDisplacementMap in="SourceGraphic" in2="rough" scale={1.4} xChannelSelector="R" yChannelSelector="G" result="edge" />
            <feTurbulence type="fractalNoise" baseFrequency="0.84" numOctaves={3} seed={9} result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.8 0 0 0 -0.75" result="ink" />
            <feComposite in="edge" in2="ink" operator="in" />
          </filter>
          {/* Drawn in along the centre line on first paint, as on the site. */}
          <mask id="jb-pen-draw" maskUnits="userSpaceOnUse" {...box}>
            <path className={s.penDraw} d={STROKE.center} pathLength={1} />
          </mask>
        </defs>
        <g filter="url(#jb-pen-ink)">
          <g mask="url(#jb-pen-draw)">
            <path d={STROKE.outline} />
            {STROKE.caps.map((c, i) => (
              <circle key={i} cx={f(c.cx)} cy={f(c.cy)} r={f(c.r)} />
            ))}
          </g>
        </g>
      </svg>
    </span>
  )
}

/**
 * Puts `mark` in a sentence: `render` wraps the first occurrence of `phrase`.
 * If the phrase isn't there (after a copy edit, say), the sentence renders
 * plain rather than breaking.
 */
export function withMark(
  text: string,
  phrase: string | undefined,
  render: (phrase: string) => ReactNode,
): ReactNode {
  const i = phrase ? text.indexOf(phrase) : -1
  if (!phrase || i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      {render(phrase)}
      {text.slice(i + phrase.length)}
    </>
  )
}

/** The yellow highlighter, behind one phrase per section at most. */
export function Marker({ children }: { children: ReactNode }) {
  return <mark className={s.marker}>{children}</mark>
}
