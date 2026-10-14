/**
 * Shaders WGSL do ambiente. Todos desenham um triângulo de tela cheia e
 * devolvem cor pré-multiplicada (o canvas usa alphaMode 'premultiplied').
 * `uv.y` cresce para cima.
 */

/** Tamanho da grade da simulação de ondas (periódica, ladrilha sem emenda). */
export const SEA_GRID = 128

const COMMON = /* wgsl */ `
struct U {
  res: vec2f,
  time: f32,
  alpha: f32,
  density: f32,
  flickerHz: f32,
  grid: f32,
  _pad: f32,
}
@group(0) @binding(0) var<uniform> u: U;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

@vertex fn vs(@builtin(vertex_index) i: u32) -> VOut {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VOut;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv = p[i] * 0.5 + 0.5;
  return o;
}

fn pcg(v: u32) -> u32 {
  let s = v * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}

fn hash(x: i32, y: i32) -> f32 {
  return f32(pcg(u32(x) ^ pcg(u32(y) + 40503u))) / 4294967295.0;
}

fn vnoise(p: vec2f) -> f32 {
  let i = vec2i(floor(p));
  let f = fract(p);
  let w = f * f * (3.0 - 2.0 * f);
  let a = hash(i.x, i.y);
  let b = hash(i.x + 1, i.y);
  let c = hash(i.x, i.y + 1);
  let d = hash(i.x + 1, i.y + 1);
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

fn fbm(p0: vec2f) -> f32 {
  var p = p0;
  var amp = 0.5;
  var sum = 0.0;
  for (var k = 0; k < 5; k++) {
    sum += amp * vnoise(p);
    p = p * 2.03 + vec2f(17.1, 9.7);
    amp *= 0.5;
  }
  return sum;
}

fn aspectUv(uv: vec2f) -> vec2f {
  return vec2f(uv.x * u.res.x / u.res.y, uv.y);
}

fn premul(rgb: vec3f, a: f32) -> vec4f {
  let k = clamp(a, 0.0, 1.0) * u.alpha;
  return vec4f(rgb * k, k);
}
`

const RAIN = /* wgsl */ `
@fragment fn fs(in: VOut) -> @location(0) vec4f {
  var a = 0.0;
  for (var layer = 0; layer < 3; layer++) {
    let fl = f32(layer);
    var p = aspectUv(in.uv) * (1.0 + fl * 0.7);
    p.x += p.y * 0.18;
    let cols = 70.0;
    let cx = i32(floor(p.x * cols));
    let r = hash(cx, layer * 977);
    let phase = p.y * 1.3 + u.time * (1.5 + r * 0.7 + fl * 0.35) + r * 10.0;
    let id = i32(floor(phase));
    let y = fract(phase);
    let alive = step(hash(cx, id + layer * 7919), u.density);
    let tail = 1.0 - smoothstep(0.0, 0.12, y);
    let xf = abs(fract(p.x * cols) - 0.5);
    let line = 1.0 - smoothstep(0.03, 0.11, xf);
    a += alive * tail * line * (0.6 - fl * 0.15);
  }
  return premul(vec3f(0.78, 0.84, 0.92), a);
}
`

const FOG = /* wgsl */ `
@fragment fn fs(in: VOut) -> @location(0) vec4f {
  let p = aspectUv(in.uv) * 2.2;
  let t = u.time * 0.03;
  let n1 = fbm(p + vec2f(t, t * 0.3));
  let n2 = fbm(p * 1.7 - vec2f(t * 1.3, -t * 0.2) + 5.0);
  let n = n1 * 0.6 + n2 * 0.4;
  let ground = mix(1.0, 0.4, in.uv.y);
  let d = smoothstep(0.25, 0.75, n) * ground * (0.55 + 0.45 * u.density);
  return premul(vec3f(0.82, 0.84, 0.86), d);
}
`

/** Partículas em células: brasas sobem, neve desce. */
const PARTICLES = /* wgsl */ `
fn particles(uv: vec2f, rising: bool) -> vec4f {
  var col = vec3f(0.0);
  var a = 0.0;
  for (var layer = 0; layer < 3; layer++) {
    let fl = f32(layer);
    let scale = 5.0 + fl * 4.0;
    var p = aspectUv(uv) * scale;
    let v = (0.30 - fl * 0.06) * scale * 0.25;
    if (rising) { p.y -= u.time * v; } else { p.y += u.time * v; }
    p.x += sin(p.y * 0.7 + u.time * 0.5 + fl * 2.0) * 0.3;
    let cell = vec2i(floor(p));
    let f = fract(p) - 0.5;
    let seed = cell.y + layer * 1013;
    let r = hash(cell.x, seed);
    let alive = step(r, u.density * (0.9 - fl * 0.2));
    let off = vec2f(hash(cell.x + 17, seed), hash(cell.x, seed + 31)) - 0.5;
    let d = length(f - off * 0.6);
    let size = 0.04 + 0.05 * hash(cell.x + 5, seed + 3);
    let core = 1.0 - smoothstep(size * 0.5, size, d);
    let glow = (1.0 - smoothstep(size, size * 4.0, d)) * 0.3;
    var k = (core + glow) * alive * (1.0 - fl * 0.25);
    if (rising) {
      k *= (0.8 + 0.2 * sin(6.2831853 * u.flickerHz * u.time + r * 40.0)) * mix(1.0, 0.25, uv.y);
      col += k * mix(vec3f(1.0, 0.35, 0.06), vec3f(1.0, 0.78, 0.35), core);
    } else {
      col += k * vec3f(0.95, 0.97, 1.0);
    }
    a += k;
  }
  if (rising) {
    let ember = (1.0 - smoothstep(0.0, 0.3, uv.y)) * 0.18;
    col += ember * vec3f(1.0, 0.4, 0.1);
    a += ember;
  }
  let ka = u.alpha;
  return vec4f(min(col, vec3f(1.0)) * ka, clamp(a, 0.0, 1.0) * ka);
}
`

const EMBERS = PARTICLES + /* wgsl */ `
@fragment fn fs(in: VOut) -> @location(0) vec4f { return particles(in.uv, true); }
`

const SNOW = PARTICLES + /* wgsl */ `
@fragment fn fs(in: VOut) -> @location(0) vec4f { return particles(in.uv, false); }
`

/**
 * Mar: luz de água. Rede de cáusticas procedural (estilo "water caustic"
 * iterativo), refratada pelo gradiente da simulação de ondas: cada gota
 * vira uma ondulação que entorta a luz.
 */
const SEA = /* wgsl */ `
@group(0) @binding(1) var<storage, read> hs: array<f32>;

fn cellH(x: i32, y: i32) -> f32 {
  let n = i32(u.grid);
  let xi = ((x % n) + n) % n;
  let yi = ((y % n) + n) % n;
  return hs[yi * n + xi];
}

fn simH(c: vec2f) -> f32 {
  let i = vec2i(floor(c));
  let f = fract(c);
  return mix(
    mix(cellH(i.x, i.y), cellH(i.x + 1, i.y), f.x),
    mix(cellH(i.x, i.y + 1), cellH(i.x + 1, i.y + 1), f.x),
    f.y);
}

fn caustic(p0: vec2f, t: f32) -> f32 {
  let tau = 6.2831853;
  let p = (p0 * tau) % vec2f(tau) - 250.0;
  var i = p;
  var c = 1.0;
  let inten = 0.005;
  for (var n = 0; n < 5; n++) {
    let tt = t * (1.0 - 3.5 / f32(n + 1));
    i = p + vec2f(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2f(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}

@fragment fn fs(in: VOut) -> @location(0) vec4f {
  let a = aspectUv(in.uv);
  let cell = a * 48.0;
  let grad = vec2f(simH(cell + vec2f(1.0, 0.0)) - simH(cell - vec2f(1.0, 0.0)),
                   simH(cell + vec2f(0.0, 1.0)) - simH(cell - vec2f(0.0, 1.0)));
  let p = a * 1.5 + grad * 0.15;
  let light = caustic(p, u.time * 0.3 + 23.0);
  let patches = 0.55 + 0.45 * vnoise(a * 2.5 + vec2f(u.time * 0.02, 0.0));
  return premul(vec3f(0.72, 0.95, 1.0), light * patches * (0.6 + 0.4 * u.density));
}
`

export const FRAGMENT_WGSL: Record<'sea' | 'rain' | 'fog' | 'embers' | 'snow', string> = {
  sea: COMMON + SEA,
  rain: COMMON + RAIN,
  fog: COMMON + FOG,
  embers: COMMON + EMBERS,
  snow: COMMON + SNOW,
}

/**
 * Passo da equação de onda (Euler simplético, estável com c2·dt² < 0,5).
 * Lê `hIn`, escreve `hOut`; a gota gaussiana entra no mesmo passo.
 */
export const SEA_SIM_WGSL = /* wgsl */ `
struct Sim {
  n: u32,
  dropX: f32,
  dropY: f32,
  dropAmt: f32,
  dropR: f32,
  c2: f32,
  damp: f32,
  _pad: f32,
}
@group(0) @binding(0) var<uniform> s: Sim;
@group(0) @binding(1) var<storage, read> hIn: array<f32>;
@group(0) @binding(2) var<storage, read_write> hOut: array<f32>;
@group(0) @binding(3) var<storage, read_write> vel: array<f32>;

fn idx(x: i32, y: i32) -> u32 {
  let n = i32(s.n);
  return u32((((y % n) + n) % n) * n + (((x % n) + n) % n));
}

@compute @workgroup_size(8, 8)
fn simStep(@builtin(global_invocation_id) g: vec3u) {
  if (g.x >= s.n || g.y >= s.n) { return; }
  let x = i32(g.x);
  let y = i32(g.y);
  let i = idx(x, y);
  let h = hIn[i];
  let lap = hIn[idx(x - 1, y)] + hIn[idx(x + 1, y)] + hIn[idx(x, y - 1)] + hIn[idx(x, y + 1)] - 4.0 * h;
  let v = (vel[i] + s.c2 * lap) * s.damp;
  var hn = (h + v) * 0.999;
  let nf = f32(s.n);
  var d = abs(vec2f(f32(x), f32(y)) - vec2f(s.dropX, s.dropY));
  d = min(d, vec2f(nf) - d);
  hn += s.dropAmt * exp(-dot(d, d) / (s.dropR * s.dropR));
  vel[i] = v;
  hOut[i] = hn;
}
`
