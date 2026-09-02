import p5 from 'p5';
import type { PookalamConfig, RingSpec, Palette } from './generator';

/**
 * Config-driven p5 renderer. Draws a PookalamConfig with radial symmetry,
 * a reveal animation, subtle ambient motion, mouse glow, and click bursts.
 * Exposes setConfig(), regenerate(), savePNG(), and renderThumbnail().
 */

interface Ambient { a: number; r: number; spd: number; size: number; hue: string; tw: number }
interface Burst {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  life: number; max: number; len: number; wid: number; col: string;
}

export interface RendererHandles {
  setConfig: (cfg: PookalamConfig) => void;
  getConfig: () => PookalamConfig;
  regenerate: () => void;
  savePNG: (highRes?: boolean) => void;
  renderThumbnail: (size?: number) => string;
  instance: p5;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function createRenderer(container: HTMLElement): RendererHandles {
  let config: PookalamConfig | null = null;
  let revealStart = 0;
  const REVEAL_DUR = 1500;

  let W = 0, H = 0, R = 0;
  let ambient: Ambient[] = [];
  const bursts: Burst[] = [];

  const sketch = (p: p5) => {
    // ---- Background -------------------------------------------------------
    function drawBackground(palette: Palette) {
      const ctx = p.drawingContext as CanvasRenderingContext2D;
      const g = ctx.createRadialGradient(W / 2, H / 2, R * 0.1, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, palette.ground);
      g.addColorStop(1, '#080406');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      p.noStroke();
      for (let i = 0; i < 50; i++) {
        const x = p.random(W);
        const y = p.random(H);
        const a = p.noise(x * 0.01, y * 0.01) * 28;
        p.fill(255, 220, 180, a * 0.35);
        p.circle(x, y, p.random(0.6, 1.6));
      }
    }

    function glowDisc(radius: number, col: string, alpha: number) {
      const ctx = p.drawingContext as CanvasRenderingContext2D;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      const cc = p.color(col);
      g.addColorStop(0, `rgba(${p.red(cc)},${p.green(cc)},${p.blue(cc)},${alpha})`);
      g.addColorStop(1, `rgba(${p.red(cc)},${p.green(cc)},${p.blue(cc)},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- Petal shapes by style ------------------------------------------
    function drawPetal(len: number, wid: number, col: string, style: RingSpec['petalStyle']) {
      p.noStroke();
      p.fill(col);
      const s = style ?? 'round';
      if (s === 'pointed') {
        p.beginShape();
        p.vertex(0, 0);
        p.vertex(len * 0.5, -wid * 0.28);
        p.vertex(len, 0);
        p.vertex(len * 0.5, wid * 0.28);
        p.endShape(p.CLOSE);
      } else if (s === 'lotus') {
        p.beginShape();
        p.splineVertex(0, 0); p.splineVertex(0, 0);
        p.splineVertex(len * 0.35, -wid * 0.6);
        p.splineVertex(len, 0);
        p.splineVertex(len * 0.35, wid * 0.6);
        p.splineVertex(0, 0); p.splineVertex(0, 0);
        p.endShape(p.CLOSE);
      } else if (s === 'marigold') {
        // clustered small rounded petals stacked along the length
        const n = 3;
        for (let k = 0; k < n; k++) {
          const kl = (k + 1) / n * len;
          const kw = wid * (1 - k * 0.18);
          p.ellipse(kl, 0, kw * 0.6, kw * 0.9);
        }
      } else {
        // round (default)
        p.beginShape();
        p.splineVertex(0, 0); p.splineVertex(0, 0);
        p.splineVertex(len * 0.45, -wid * 0.5);
        p.splineVertex(len, 0);
        p.splineVertex(len * 0.45, wid * 0.5);
        p.splineVertex(0, 0); p.splineVertex(0, 0);
        p.endShape(p.CLOSE);
      }
      // subtle highlight
      p.fill(255, 255, 255, 55);
      p.push();
      p.translate(len * 0.5, 0);
      p.scale(0.5, 0.55);
      p.ellipse(0, 0, wid, wid);
      p.pop();
    }

    function drawFlower(size: number, petals: number, petalCol: string, centerCol: string, style: RingSpec['petalStyle']) {
      p.push();
      for (let i = 0; i < petals; i++) {
        p.rotate(p.TWO_PI / petals);
        drawPetal(size * 0.6, size * 0.36, petalCol, style);
      }
      p.pop();
      p.fill(centerCol);
      p.noStroke();
      p.circle(0, 0, size * 0.32);
      p.fill(255, 235, 190, 200);
      for (let i = 0; i < 6; i++) {
        const a = (p.TWO_PI / 6) * i;
        p.circle(Math.cos(a) * size * 0.08, Math.sin(a) * size * 0.08, size * 0.06);
      }
    }

    // ---- Ring drawing -----------------------------------------------------
    function drawPetalRing(ring: RingSpec, scale: number, rot: number) {
      const mid = ((ring.rOuter + ring.rInner) / 2) * R;
      const depth = (ring.rOuter - ring.rInner) * R;
      const len = depth * 0.95;
      const wid = depth * 0.55;
      p.push();
      p.rotate(rot + (ring.twist ?? 0) * scale);
      for (let i = 0; i < ring.count; i++) {
        p.push();
        p.rotate((p.TWO_PI / ring.count) * i);
        p.translate(mid, 0);
        p.scale(scale);
        drawPetal(len, wid, ring.color, ring.petalStyle);
        p.pop();
      }
      p.pop();
    }

    function drawFlowerRing(ring: RingSpec, scale: number, rot: number) {
      const mid = ((ring.rOuter + ring.rInner) / 2) * R;
      const size = (ring.rOuter - ring.rInner) * R;
      p.push();
      p.rotate(rot);
      for (let i = 0; i < ring.count; i++) {
        p.push();
        p.rotate((p.TWO_PI / ring.count) * i);
        p.translate(mid, 0);
        p.scale(scale);
        drawFlower(size, ring.petals ?? 6, ring.color, ring.color2 ?? ring.color, ring.petalStyle);
        p.pop();
      }
      p.pop();
    }

    function drawGeoRing(ring: RingSpec, scale: number, rot: number) {
      const mid = ((ring.rOuter + ring.rInner) / 2) * R;
      const s = (ring.rOuter - ring.rInner) * R * 0.5;
      p.push();
      p.rotate(rot);
      for (let i = 0; i < ring.count; i++) {
        p.push();
        p.rotate((p.TWO_PI / ring.count) * i);
        p.translate(mid, 0);
        p.scale(scale);
        p.noStroke();
        p.fill(ring.color);
        switch (ring.motif) {
          case 'diamond':
            p.quad(-s * 0.4, 0, 0, -s, s * 0.4, 0, 0, s);
            p.fill(255, 240, 200, 110);
            p.quad(-s * 0.18, 0, 0, -s * 0.45, s * 0.18, 0, 0, s * 0.45);
            break;
          case 'dot': p.circle(0, 0, s); break;
          case 'dotTriplet':
            p.circle(-s * 0.7, 0, s * 0.5);
            p.circle(0, 0, s * 0.75);
            p.circle(s * 0.7, 0, s * 0.5);
            break;
          case 'triangle':
            p.triangle(-s * 0.6, -s * 0.4, s * 0.6, 0, -s * 0.6, s * 0.4);
            break;
          case 'leaf':
            drawPetal(s * 1.1, s * 0.5, ring.color, 'lotus');
            break;
          case 'star': {
            // star polygon: two rotated triangles
            for (let k = 0; k < 2; k++) {
              p.rotate(p.PI / 3);
              p.triangle(0, -s, -s * 0.7, s * 0.4, s * 0.7, s * 0.4);
            }
            break;
          }
          default: p.circle(0, 0, s);
        }
        p.pop();
      }
      p.pop();
    }

    function drawDotRing(ring: RingSpec, scale: number, rot: number) {
      const mid = ((ring.rOuter + ring.rInner) / 2) * R;
      const s = (ring.rOuter - ring.rInner) * R * 0.5;
      p.push();
      p.rotate(rot);
      p.noStroke();
      for (let i = 0; i < ring.count; i++) {
        const a = (p.TWO_PI / ring.count) * i;
        const x = Math.cos(a) * mid;
        const y = Math.sin(a) * mid;
        p.fill(ring.color);
        p.circle(x, y, s * 1.1 * scale);
        p.fill(255, 240, 200, 90);
        p.circle(x, y, s * 0.4 * scale);
      }
      p.pop();
    }

    // ---- Outer border -----------------------------------------------------
    function drawOuterBorder(cfg: PookalamConfig) {
      const b = cfg.outerBorder;
      const colA = cfg.palette.colors[0];
      const colB = cfg.palette.accent;
      const n = cfg.symmetry * 2;
      p.push();
      if (b === 'flower') {
        for (let i = 0; i < n; i++) {
          p.push();
          p.rotate((p.TWO_PI / n) * i);
          p.translate(R * 0.98, 0);
          drawFlower(R * 0.05, 6, colA, colB, 'round');
          p.pop();
        }
      } else if (b === 'petal') {
        for (let i = 0; i < n * 2; i++) {
          p.push();
          p.rotate((p.TWO_PI / (n * 2)) * i);
          p.translate(R * 0.97, 0);
          drawPetal(R * 0.06, R * 0.03, colA, 'pointed');
          p.pop();
        }
      } else if (b === 'dot') {
        p.noStroke();
        for (let i = 0; i < n * 2; i++) {
          const a = (p.TWO_PI / (n * 2)) * i;
          p.fill(colA);
          p.circle(Math.cos(a) * R * 0.99, Math.sin(a) * R * 0.99, R * 0.022);
        }
      } else if (b === 'leaf') {
        for (let i = 0; i < n; i++) {
          p.push();
          p.rotate((p.TWO_PI / n) * i);
          p.translate(R * 0.98, 0);
          drawPetal(R * 0.07, R * 0.04, cfg.palette.colors[4] ?? colA, 'lotus');
          p.pop();
        }
      } else if (b === 'geometric') {
        p.noFill();
        p.stroke(colA); p.strokeWeight(R * 0.006);
        p.circle(0, 0, R * 2 * 1.02);
        p.stroke(colB); p.strokeWeight(R * 0.003);
        p.circle(0, 0, R * 2 * 1.04);
        for (let i = 0; i < n; i++) {
          p.push();
          p.rotate((p.TWO_PI / n) * i);
          p.translate(R * 1.0, 0);
          p.noStroke(); p.fill(colB);
          p.quad(-R * 0.012, 0, 0, -R * 0.02, R * 0.012, 0, 0, R * 0.02);
          p.pop();
        }
      } else if (b === 'double') {
        p.noFill();
        p.stroke(colA); p.strokeWeight(R * 0.01);
        p.circle(0, 0, R * 2 * 1.0);
        p.stroke(colB); p.strokeWeight(R * 0.004);
        p.circle(0, 0, R * 2 * 1.03);
      } else if (b === 'lotus') {
        for (let i = 0; i < n; i++) {
          p.push();
          p.rotate((p.TWO_PI / n) * i);
          p.translate(R * 0.97, 0);
          drawPetal(R * 0.09, R * 0.05, colA, 'lotus');
          p.fill(colB); p.noStroke();
          p.circle(R * 0.02, 0, R * 0.02);
          p.pop();
        }
      }
      p.pop();
    }

    // ---- Center mandala variations ---------------------------------------
    function drawCenter(cfg: PookalamConfig, scale: number, t: number) {
      p.push();
      p.scale(scale);
      const accent = cfg.palette.accent;
      const c0 = cfg.palette.colors[0];
      const c1 = cfg.palette.colors[1] ?? c0;

      const pulse = 0.5 + 0.5 * Math.sin(t * 0.0012);
      glowDisc(R * 0.16 * (0.95 + pulse * 0.08), accent, 0.22 + pulse * 0.12);

      const style = cfg.centerStyle;
      const sym = cfg.symmetry;

      if (style === 'lotus') {
        for (let layer = 0; layer < 3; layer++) {
          p.push();
          p.rotate(t * 0.0004 * (layer % 2 ? -1 : 1));
          for (let i = 0; i < sym; i++) {
            p.rotate(p.TWO_PI / sym);
            drawPetal(R * 0.12 * (1 - layer * 0.28), R * 0.07 * (1 - layer * 0.25),
              layer % 2 ? c1 : c0, 'lotus');
          }
          p.pop();
        }
      } else if (style === 'sun') {
        p.push();
        p.rotate(t * 0.0006);
        for (let i = 0; i < sym * 2; i++) {
          p.rotate(p.PI / sym);
          drawPetal(R * 0.13, R * 0.03, i % 2 ? c1 : c0, 'pointed');
        }
        p.pop();
      } else if (style === 'star') {
        p.push();
        p.rotate(t * 0.0005);
        for (let k = 0; k < 2; k++) {
          p.rotate(p.PI / sym);
          p.fill(c0); p.noStroke();
          const sr = R * 0.1;
          p.quad(-sr, 0, 0, -sr * 2.4, sr, 0, 0, sr * 2.4);
        }
        p.pop();
      } else if (style === 'rosette') {
        for (let layer = 0; layer < 2; layer++) {
          p.push();
          p.rotate(t * 0.0004 * (layer ? -1 : 1));
          for (let i = 0; i < sym; i++) {
            p.rotate(p.TWO_PI / sym);
            drawPetal(R * 0.1 * (1 - layer * 0.4), R * 0.06, layer ? accent : c1, 'round');
          }
          p.pop();
        }
      } else if (style === 'geometric') {
        p.push();
        p.rotate(t * 0.0005);
        p.noFill(); p.stroke(c0); p.strokeWeight(R * 0.004);
        for (let k = 0; k < 2; k++) {
          p.rotate(p.PI / sym);
          p.beginShape();
          for (let i = 0; i <= sym; i++) {
            const a = (p.TWO_PI / sym) * i;
            p.vertex(Math.cos(a) * R * 0.1, Math.sin(a) * R * 0.1);
          }
          p.endShape(p.CLOSE);
        }
        p.pop();
      } else if (style === 'floral') {
        drawFlower(R * 0.16, sym, c0, accent, cfg.petalStyle);
      } else {
        // minimal
        p.fill(c0); p.noStroke();
        p.circle(0, 0, R * 0.06);
      }

      // glowing core
      const cp = 0.5 + 0.5 * Math.sin(t * 0.003);
      glowDisc(R * 0.045 * (1 + cp * 0.3), '#ffffff', 0.55);
      p.fill('#ffffff'); p.noStroke();
      p.circle(0, 0, R * 0.035 * (1 + cp * 0.2));
      p.fill(accent);
      p.circle(0, 0, R * 0.018);
      p.pop();
    }

    // ---- Ambient particles -----------------------------------------------
    function drawParticles(t: number) {
      p.push();
      p.blendMode(p.ADD);
      for (const m of ambient) {
        m.a += m.spd * 0.01;
        const tw = 0.5 + 0.5 * Math.sin(t * 0.003 + m.tw);
        const x = Math.cos(m.a) * R * m.r;
        const y = Math.sin(m.a) * R * m.r;
        const col = p.color(m.hue);
        col.setAlpha(55 + tw * 110);
        p.noStroke(); p.fill(col);
        p.circle(x, y, m.size * (0.8 + tw * 0.6));
        col.setAlpha(18 + tw * 28);
        p.fill(col);
        p.circle(x, y, m.size * 3.5);
      }
      p.blendMode(p.BLEND);
      p.pop();
    }

    // ---- Click bursts -----------------------------------------------------
    function spawnBurst(px: number, py: number, palette: Palette) {
      const cols = [palette.colors[0], palette.colors[1], palette.accent, '#ffffff'];
      for (let i = 0; i < 18; i++) {
        const a = p.random(p.TWO_PI);
        const sp = p.random(1.5, 5);
        bursts.push({
          x: px, y: py,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          rot: a, vr: p.random(-0.2, 0.2),
          life: 0, max: p.random(40, 75),
          len: p.random(9, 20), wid: p.random(5, 10),
          col: p.random(cols),
        });
      }
    }

    function drawBursts() {
      p.push();
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life++;
        b.x += b.vx; b.y += b.vy;
        b.vx *= 0.96; b.vy *= 0.96;
        b.rot += b.vr;
        const k = b.life / b.max;
        if (k >= 1) { bursts.splice(i, 1); continue; }
        const alpha = 255 * (1 - k);
        p.push();
        p.translate(b.x, b.y);
        p.rotate(b.rot);
        const col = p.color(b.col);
        col.setAlpha(alpha);
        p.noStroke(); p.fill(col);
        p.beginShape();
        p.splineVertex(0, 0); p.splineVertex(0, 0);
        p.splineVertex(b.len * 0.45, -b.wid * 0.5);
        p.splineVertex(b.len, 0);
        p.splineVertex(b.len * 0.45, b.wid * 0.5);
        p.splineVertex(0, 0); p.splineVertex(0, 0);
        p.endShape(p.CLOSE);
        p.pop();
      }
      p.pop();
    }

    // ---- Mouse glow / ripple ---------------------------------------------
    let ripple = 0;
    let lastMouse = { x: 0, y: 0 };
    function drawMouseGlow() {
      const mx = p.mouseX - W / 2;
      const my = p.mouseY - H / 2;
      const moved = Math.hypot(p.mouseX - lastMouse.x, p.mouseY - lastMouse.y);
      lastMouse = { x: p.mouseX, y: p.mouseY };
      if (moved > 6) ripple = Math.min(ripple + moved * 0.05, 55);
      p.push();
      p.blendMode(p.ADD);
      if (p.mouseX >= 0 && p.mouseX <= W && p.mouseY >= 0 && p.mouseY <= H) {
        p.translate(mx, my);
        glowDisc(60, config?.palette.accent ?? '#E89B2E', 0.09);
      }
      if (ripple > 0.5) {
        p.noFill();
        const cc = p.color(config?.palette.accent ?? '#E89B2E');
        cc.setAlpha(ripple * 3);
        p.stroke(cc);
        p.strokeWeight(1.5);
        p.circle(0, 0, ripple * 2);
        ripple *= 0.94;
      }
      p.blendMode(p.BLEND);
      p.pop();
    }

    // ---- Full pookalam ----------------------------------------------------
    function drawPookalam(t: number) {
      if (!config) return;
      const revealT = p.constrain((p.millis() - revealStart) / REVEAL_DUR, 0, 1);

      p.push();
      p.translate(W / 2, H / 2);
      p.rotate(config.rotationOffset);

      const breath = 0.5 + 0.5 * Math.sin(t * 0.0008);
      glowDisc(R * (1.04 + breath * 0.04), config.palette.accent, 0.05 + breath * 0.04);

      drawOuterBorder(config);

      // Reveal outer→inner: border first, then rings from outside in, center last.
      // Outer border appears ~immediately; rings cascade.
      for (let i = 0; i < config.rings.length; i++) {
        const ring = config.rings[i];
        // outer rings (low i) reveal earlier
        const start = (i / config.rings.length) * 0.55;
        const local = p.constrain((revealT - start) / 0.45, 0, 1);
        const scale = easeOutCubic(local);
        if (scale <= 0.001) continue;
        const rot = ring.rotSpeed * t * 0.001;

        p.push();
        p.blendMode(p.ADD);
        glowDisc(((ring.rOuter + ring.rInner) / 2) * R, ring.color, 0.035 * scale);
        p.blendMode(p.BLEND);
        p.pop();

        if (ring.kind === 'petal') drawPetalRing(ring, scale, rot);
        else if (ring.kind === 'flower') drawFlowerRing(ring, scale, rot);
        else if (ring.kind === 'geo') drawGeoRing(ring, scale, rot);
        else drawDotRing(ring, scale, rot);
      }

      const centerReveal = easeOutCubic(p.constrain((revealT - 0.55) / 0.45, 0, 1));
      drawCenter(config, centerReveal, t);

      drawParticles(t);
      drawBursts();
      p.pop();
    }

    // ---- lifecycle --------------------------------------------------------
    function resize() {
      const rect = container.getBoundingClientRect();
      W = Math.max(200, rect.width);
      H = Math.max(200, rect.height);
      p.resizeCanvas(W, H);
      R = Math.min(W, H) * 0.45;
    }

    p.setup = () => {
      resize();
      p.frameRate(60);
    };

    p.windowResized = () => resize();

    p.draw = () => {
      const t = p.millis();
      if (config) {
        drawBackground(config.palette);
        drawMouseGlow();
        drawPookalam(t);
      } else {
        p.background(8, 4, 6);
      }
    };

    p.mousePressed = () => {
      if (!config) return;
      if (p.mouseX < 0 || p.mouseX > W || p.mouseY < 0 || p.mouseY > H) return;
      const d = Math.hypot(p.mouseX - W / 2, p.mouseY - H / 2);
      if (d <= R * 1.05) spawnBurst(p.mouseX - W / 2, p.mouseY - H / 2, config.palette);
    };

    p.keyPressed = () => {
      if (p.key === ' ') {
        (p as unknown as { regenerate?: () => void }).regenerate?.();
        return false;
      }
    };
  };

  const pInst = new p5(sketch, container);

  function applyConfig(cfg: PookalamConfig) {
    config = cfg;
    revealStart = pInst.millis();
    // rebuild ambient using p5's own random so it stays lively
    const pal = cfg.palette;
    const amb: Ambient[] = [];
    for (let i = 0; i < 38; i++) {
      amb.push({
        a: pInst.random(pInst.TWO_PI),
        r: pInst.random(1.02, 1.18),
        spd: pInst.random(-0.05, 0.05),
        size: pInst.random(1.4, 4),
        hue: pInst.random([pal.accent, pal.colors[0], '#ffffff']),
        tw: pInst.random(pInst.TWO_PI),
      });
    }
    ambient = amb;
  }

  return {
    instance: pInst,
    setConfig: (cfg) => applyConfig(cfg),
    getConfig: () => config as PookalamConfig,
    regenerate: () => (pInst as unknown as { regenerate?: () => void }).regenerate?.(),
    savePNG: (highRes = false) => {
      if (highRes) {
        // Render an offscreen high-res version of the current config and save it.
        exportHighRes(config as PookalamConfig, 2048);
      } else {
        pInst.saveCanvas(`pookalam-${config?.seed ?? 'design'}`, 'png');
      }
    },
    renderThumbnail: (size = 160) => renderThumbnail(config as PookalamConfig, size),
  };
}

/** Exported standalone: render a config to a PNG data URL at the given size. */
export function renderThumbnail(cfg: PookalamConfig, size = 160): string {
  return renderToDataURL(cfg, size);
}

// ---- Offscreen rendering for thumbnails + hi-res export ------------------
// A standalone p5 sketch that draws ONLY the pookalam artwork (no UI) into a
// square canvas at the requested resolution, then returns a data URL.

function renderToDataURL(cfg: PookalamConfig, size: number): string {
  // Synchronous offscreen render using a temporary canvas via p5 instance.
  let dataUrl = '';
  const tmp = document.createElement('div');
  tmp.style.position = 'fixed';
  tmp.style.left = '-9999px';
  tmp.style.top = '0';
  document.body.appendChild(tmp);

  const off = new p5((p: p5) => {
    const R = size * 0.46;
    p.setup = () => {
      p.createCanvas(size, size);
      p.pixelDensity(1);
      p.noLoop();
      drawArtwork(p, cfg, R, size, size);
      const ctx = p.drawingContext as CanvasRenderingContext2D;
      const cv = ctx.canvas;
      dataUrl = cv.toDataURL('image/png');
      p.remove();
      tmp.remove();
    };
  }, tmp);

  void off;
  return dataUrl;
}

function exportHighRes(cfg: PookalamConfig, size: number) {
  const tmp = document.createElement('div');
  tmp.style.position = 'fixed';
  tmp.style.left = '-9999px';
  tmp.style.top = '0';
  document.body.appendChild(tmp);

  new p5((p: p5) => {
    const R = size * 0.46;
    p.setup = () => {
      p.createCanvas(size, size);
      p.pixelDensity(1);
      p.noLoop();
      drawArtwork(p, cfg, R, size, size);
      p.saveCanvas(`pookalam-${cfg.seed}-hd`, 'png');
      p.remove();
      tmp.remove();
    };
  }, tmp);
}

// Shared static artwork renderer (no animation, no UI) used by thumbnails +
// hi-res export. Mirrors the live renderer's drawing but at full reveal.
function drawArtwork(p: p5, cfg: PookalamConfig, R: number, W: number, H: number) {
  // background
  const ctx = p.drawingContext as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(W / 2, H / 2, R * 0.1, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, cfg.palette.ground);
  g.addColorStop(1, '#080406');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  p.push();
  p.translate(W / 2, H / 2);
  p.rotate(cfg.rotationOffset);

  // outer border
  drawStaticBorder(p, cfg, R);
  // rings
  for (const ring of cfg.rings) {
    drawStaticRing(p, ring, R);
  }
  drawStaticCenter(p, cfg, R);
  p.pop();
}

function glowStatic(p: p5, radius: number, col: string, alpha: number) {
  const ctx = p.drawingContext as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  const cc = p.color(col);
  g.addColorStop(0, `rgba(${p.red(cc)},${p.green(cc)},${p.blue(cc)},${alpha})`);
  g.addColorStop(1, `rgba(${p.red(cc)},${p.green(cc)},${p.blue(cc)},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
}

function petalStatic(p: p5, len: number, wid: number, col: string, style: RingSpec['petalStyle']) {
  p.noStroke(); p.fill(col);
  const s = style ?? 'round';
  if (s === 'pointed') {
    p.beginShape();
    p.vertex(0, 0); p.vertex(len * 0.5, -wid * 0.28); p.vertex(len, 0); p.vertex(len * 0.5, wid * 0.28);
    p.endShape(p.CLOSE);
  } else if (s === 'lotus') {
    p.beginShape();
    p.splineVertex(0, 0); p.splineVertex(0, 0);
    p.splineVertex(len * 0.35, -wid * 0.6); p.splineVertex(len, 0);
    p.splineVertex(len * 0.35, wid * 0.6); p.splineVertex(0, 0); p.splineVertex(0, 0);
    p.endShape(p.CLOSE);
  } else if (s === 'marigold') {
    const n = 3;
    for (let k = 0; k < n; k++) {
      const kl = (k + 1) / n * len;
      const kw = wid * (1 - k * 0.18);
      p.ellipse(kl, 0, kw * 0.6, kw * 0.9);
    }
  } else {
    p.beginShape();
    p.splineVertex(0, 0); p.splineVertex(0, 0);
    p.splineVertex(len * 0.45, -wid * 0.5); p.splineVertex(len, 0);
    p.splineVertex(len * 0.45, wid * 0.5); p.splineVertex(0, 0); p.splineVertex(0, 0);
    p.endShape(p.CLOSE);
  }
  p.fill(255, 255, 255, 55);
  p.push(); p.translate(len * 0.5, 0); p.scale(0.5, 0.55); p.ellipse(0, 0, wid, wid); p.pop();
}

function flowerStatic(p: p5, size: number, petals: number, petalCol: string, centerCol: string, style: RingSpec['petalStyle']) {
  p.push();
  for (let i = 0; i < petals; i++) { p.rotate(p.TWO_PI / petals); petalStatic(p, size * 0.6, size * 0.36, petalCol, style); }
  p.pop();
  p.fill(centerCol); p.noStroke(); p.circle(0, 0, size * 0.32);
}

function drawStaticRing(p: p5, ring: RingSpec, R: number) {
  const mid = ((ring.rOuter + ring.rInner) / 2) * R;
  const depth = (ring.rOuter - ring.rInner) * R;
  if (ring.kind === 'petal') {
    const len = depth * 0.95, wid = depth * 0.55;
    p.push();
    p.rotate(ring.twist ?? 0);
    for (let i = 0; i < ring.count; i++) {
      p.push(); p.rotate((p.TWO_PI / ring.count) * i); p.translate(mid, 0);
      petalStatic(p, len, wid, ring.color, ring.petalStyle); p.pop();
    }
    p.pop();
  } else if (ring.kind === 'flower') {
    const size = depth;
    p.push();
    for (let i = 0; i < ring.count; i++) {
      p.push(); p.rotate((p.TWO_PI / ring.count) * i); p.translate(mid, 0);
      flowerStatic(p, size, ring.petals ?? 6, ring.color, ring.color2 ?? ring.color, ring.petalStyle); p.pop();
    }
    p.pop();
  } else if (ring.kind === 'geo') {
    const s = depth * 0.5;
    p.push();
    for (let i = 0; i < ring.count; i++) {
      p.push(); p.rotate((p.TWO_PI / ring.count) * i); p.translate(mid, 0);
      p.noStroke(); p.fill(ring.color);
      switch (ring.motif) {
        case 'diamond':
          p.quad(-s * 0.4, 0, 0, -s, s * 0.4, 0, 0, s);
          p.fill(255, 240, 200, 110); p.quad(-s * 0.18, 0, 0, -s * 0.45, s * 0.18, 0, 0, s * 0.45); break;
        case 'dot': p.circle(0, 0, s); break;
        case 'dotTriplet': p.circle(-s * 0.7, 0, s * 0.5); p.circle(0, 0, s * 0.75); p.circle(s * 0.7, 0, s * 0.5); break;
        case 'triangle': p.triangle(-s * 0.6, -s * 0.4, s * 0.6, 0, -s * 0.6, s * 0.4); break;
        case 'leaf': petalStatic(p, s * 1.1, s * 0.5, ring.color, 'lotus'); break;
        case 'star': for (let k = 0; k < 2; k++) { p.rotate(p.PI / 3); p.triangle(0, -s, -s * 0.7, s * 0.4, s * 0.7, s * 0.4); } break;
        default: p.circle(0, 0, s);
      }
      p.pop();
    }
    p.pop();
  } else {
    const s = depth * 0.5;
    p.push(); p.noStroke();
    for (let i = 0; i < ring.count; i++) {
      const a = (p.TWO_PI / ring.count) * i;
      p.fill(ring.color); p.circle(Math.cos(a) * mid, Math.sin(a) * mid, s * 1.1);
      p.fill(255, 240, 200, 90); p.circle(Math.cos(a) * mid, Math.sin(a) * mid, s * 0.4);
    }
    p.pop();
  }
}

function drawStaticBorder(p: p5, cfg: PookalamConfig, R: number) {
  const b = cfg.outerBorder;
  const colA = cfg.palette.colors[0];
  const colB = cfg.palette.accent;
  const n = cfg.symmetry * 2;
  p.push();
  if (b === 'flower') {
    for (let i = 0; i < n; i++) { p.push(); p.rotate((p.TWO_PI / n) * i); p.translate(R * 0.98, 0); flowerStatic(p, R * 0.05, 6, colA, colB, 'round'); p.pop(); }
  } else if (b === 'petal') {
    for (let i = 0; i < n * 2; i++) { p.push(); p.rotate((p.TWO_PI / (n * 2)) * i); p.translate(R * 0.97, 0); petalStatic(p, R * 0.06, R * 0.03, colA, 'pointed'); p.pop(); }
  } else if (b === 'dot') {
    p.noStroke();
    for (let i = 0; i < n * 2; i++) { const a = (p.TWO_PI / (n * 2)) * i; p.fill(colA); p.circle(Math.cos(a) * R * 0.99, Math.sin(a) * R * 0.99, R * 0.022); }
  } else if (b === 'leaf') {
    for (let i = 0; i < n; i++) { p.push(); p.rotate((p.TWO_PI / n) * i); p.translate(R * 0.98, 0); petalStatic(p, R * 0.07, R * 0.04, cfg.palette.colors[4] ?? colA, 'lotus'); p.pop(); }
  } else if (b === 'geometric') {
    p.noFill(); p.stroke(colA); p.strokeWeight(R * 0.006); p.circle(0, 0, R * 2 * 1.02);
    p.stroke(colB); p.strokeWeight(R * 0.003); p.circle(0, 0, R * 2 * 1.04);
    for (let i = 0; i < n; i++) { p.push(); p.rotate((p.TWO_PI / n) * i); p.translate(R, 0); p.noStroke(); p.fill(colB); p.quad(-R * 0.012, 0, 0, -R * 0.02, R * 0.012, 0, 0, R * 0.02); p.pop(); }
  } else if (b === 'double') {
    p.noFill(); p.stroke(colA); p.strokeWeight(R * 0.01); p.circle(0, 0, R * 2);
    p.stroke(colB); p.strokeWeight(R * 0.004); p.circle(0, 0, R * 2 * 1.03);
  } else if (b === 'lotus') {
    for (let i = 0; i < n; i++) { p.push(); p.rotate((p.TWO_PI / n) * i); p.translate(R * 0.97, 0); petalStatic(p, R * 0.09, R * 0.05, colA, 'lotus'); p.fill(colB); p.noStroke(); p.circle(R * 0.02, 0, R * 0.02); p.pop(); }
  }
  p.pop();
}

function drawStaticCenter(p: p5, cfg: PookalamConfig, R: number) {
  p.push();
  const accent = cfg.palette.accent;
  const c0 = cfg.palette.colors[0];
  const c1 = cfg.palette.colors[1] ?? c0;
  const sym = cfg.symmetry;
  const style = cfg.centerStyle;

  glowStatic(p, R * 0.16, accent, 0.22);

  if (style === 'lotus') {
    for (let layer = 0; layer < 3; layer++) {
      p.push();
      for (let i = 0; i < sym; i++) { p.rotate(p.TWO_PI / sym); petalStatic(p, R * 0.12 * (1 - layer * 0.28), R * 0.07 * (1 - layer * 0.25), layer % 2 ? c1 : c0, 'lotus'); }
      p.pop();
    }
  } else if (style === 'sun') {
    p.push();
    for (let i = 0; i < sym * 2; i++) { p.rotate(p.PI / sym); petalStatic(p, R * 0.13, R * 0.03, i % 2 ? c1 : c0, 'pointed'); }
    p.pop();
  } else if (style === 'star') {
    p.push();
    for (let k = 0; k < 2; k++) { p.rotate(p.PI / sym); p.fill(c0); p.noStroke(); const sr = R * 0.1; p.quad(-sr, 0, 0, -sr * 2.4, sr, 0, 0, sr * 2.4); }
    p.pop();
  } else if (style === 'rosette') {
    for (let layer = 0; layer < 2; layer++) {
      p.push();
      for (let i = 0; i < sym; i++) { p.rotate(p.TWO_PI / sym); petalStatic(p, R * 0.1 * (1 - layer * 0.4), R * 0.06, layer ? accent : c1, 'round'); }
      p.pop();
    }
  } else if (style === 'geometric') {
    p.noFill(); p.stroke(c0); p.strokeWeight(R * 0.004);
    for (let k = 0; k < 2; k++) {
      p.rotate(p.PI / sym);
      p.beginShape();
      for (let i = 0; i <= sym; i++) { const a = (p.TWO_PI / sym) * i; p.vertex(Math.cos(a) * R * 0.1, Math.sin(a) * R * 0.1); }
      p.endShape(p.CLOSE);
    }
  } else if (style === 'floral') {
    flowerStatic(p, R * 0.16, sym, c0, accent, cfg.petalStyle);
  } else {
    p.fill(c0); p.noStroke(); p.circle(0, 0, R * 0.06);
  }

  glowStatic(p, R * 0.045, '#ffffff', 0.55);
  p.fill('#ffffff'); p.noStroke(); p.circle(0, 0, R * 0.035);
  p.fill(accent); p.circle(0, 0, R * 0.018);
  p.pop();
}
