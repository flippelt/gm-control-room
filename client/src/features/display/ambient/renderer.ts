/// <reference types="@webgpu/types" />
import type { ActiveAmbientKind, AmbientUniforms } from './ambientParams'
import { FRAGMENT_WGSL, SEA_GRID, SEA_SIM_WGSL } from './shaders'

interface KindPipeline {
  pipeline: GPURenderPipeline
  bindGroup: GPUBindGroup
}

/** Gotas por segundo na simulação do mar (ondas calmas, sem respingo). */
const SEA_DROPS_PER_SECOND = 2.5

/**
 * Desenha o ambiente num canvas via WebGPU. `create` devolve null quando não
 * há WebGPU (iPhone antigo, http fora de localhost, jsdom); quem chama cai
 * no fallback em CSS.
 */
export class AmbientRenderer {
  private pipelines = new Map<ActiveAmbientKind, Promise<KindPipeline | null>>()
  private ready = new Map<ActiveAmbientKind, KindPipeline | null>()
  private uniform: GPUBuffer
  private uniformData = new Float32Array(8)
  private sea: SeaSim
  private lost = false

  private constructor(
    private device: GPUDevice,
    private context: GPUCanvasContext,
    private canvas: HTMLCanvasElement,
    private format: GPUTextureFormat,
  ) {
    this.uniform = device.createBuffer({
      size: this.uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    this.sea = new SeaSim(device)
    device.lost.then(() => {
      this.lost = true
    })
  }

  static async create(canvas: HTMLCanvasElement): Promise<AmbientRenderer | null> {
    try {
      const gpu = typeof navigator !== 'undefined' ? navigator.gpu : undefined
      if (!gpu) return null
      const adapter = await gpu.requestAdapter({ powerPreference: 'low-power' })
      if (!adapter) return null
      const device = await adapter.requestDevice()
      const context = canvas.getContext('webgpu')
      if (!context) {
        device.destroy()
        return null
      }
      const format = gpu.getPreferredCanvasFormat()
      context.configure({ device, format, alphaMode: 'premultiplied' })
      return new AmbientRenderer(device, context, canvas, format)
    } catch (err) {
      console.warn('[ambient] WebGPU indisponível:', err)
      return null
    }
  }

  get isLost(): boolean {
    return this.lost
  }

  /** Compila o pipeline do tipo (uma vez); resolve false se o shader falhar. */
  prepare(kind: ActiveAmbientKind): Promise<boolean> {
    let p = this.pipelines.get(kind)
    if (!p) {
      p = this.build(kind).then((built) => {
        this.ready.set(kind, built)
        return built
      })
      this.pipelines.set(kind, p)
    }
    return p.then((built) => built !== null)
  }

  private async build(kind: ActiveAmbientKind): Promise<KindPipeline | null> {
    const { device } = this
    try {
      const module = device.createShaderModule({ code: FRAGMENT_WGSL[kind] })
      const pipeline = await device.createRenderPipelineAsync({
        layout: 'auto',
        vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: 'fs', targets: [{ format: this.format }] },
        primitive: { topology: 'triangle-list' },
      })
      const entries: GPUBindGroupEntry[] = [{ binding: 0, resource: { buffer: this.uniform } }]
      if (kind === 'sea') entries.push({ binding: 1, resource: { buffer: this.sea.heights } })
      const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries })
      return { pipeline, bindGroup }
    } catch (err) {
      console.warn(`[ambient] shader "${kind}" falhou:`, err)
      return null
    }
  }

  /** Ajusta o canvas ao tamanho em CSS px (efeito suave, 1x basta). */
  resize(width: number, height: number) {
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  /**
   * Desenha um quadro. `dt` avança a simulação do mar (0 = quadro parado).
   * Devolve false se o pipeline do tipo ainda não está pronto.
   */
  draw(kind: ActiveAmbientKind, params: AmbientUniforms, time: number, dt: number): boolean {
    if (this.lost) return false
    const built = this.ready.get(kind)
    if (!built) return false
    const { device } = this

    const d = this.uniformData
    d[0] = this.canvas.width
    d[1] = this.canvas.height
    d[2] = time
    d[3] = params.alpha
    d[4] = params.density
    d[5] = params.flickerHz
    d[6] = SEA_GRID
    d[7] = 0
    device.queue.writeBuffer(this.uniform, 0, d)

    const encoder = device.createCommandEncoder()
    if (kind === 'sea' && dt > 0) this.sea.step(encoder, dt)

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })
    pass.setPipeline(built.pipeline)
    pass.setBindGroup(0, built.bindGroup)
    pass.draw(3)
    pass.end()
    device.queue.submit([encoder.finish()])
    return true
  }

  /** Avança o mar sem desenhar (aquecer antes do quadro parado). */
  warmSea(seconds: number) {
    if (this.lost) return
    const frames = Math.round(seconds * 30)
    // Um quadro por submit: a gota de cada quadro precisa do seu uniform.
    for (let i = 0; i < frames; i++) {
      const enc = this.device.createCommandEncoder()
      this.sea.step(enc, 1 / 30)
      this.device.queue.submit([enc.finish()])
    }
  }

  clear() {
    if (this.lost) return
    const encoder = this.device.createCommandEncoder()
    encoder
      .beginRenderPass({
        colorAttachments: [
          {
            view: this.context.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      })
      .end()
    this.device.queue.submit([encoder.finish()])
  }

  destroy() {
    this.context.unconfigure()
    this.device.destroy()
  }
}

/**
 * Equação de onda numa grade periódica. Cada quadro roda dois passos
 * (A→B com a gota do quadro, B→A sem gota), então a altura final sempre
 * fica em `heights` (A).
 */
class SeaSim {
  readonly heights: GPUBuffer
  private other: GPUBuffer
  private vel: GPUBuffer
  private dropUniform: GPUBuffer
  private plainUniform: GPUBuffer
  private pipeline: GPUComputePipeline
  private bgAB: GPUBindGroup
  private bgBA: GPUBindGroup
  private dropClock = 0
  private simData = new ArrayBuffer(32)

  constructor(private device: GPUDevice) {
    const n = SEA_GRID
    const size = n * n * 4
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    this.heights = device.createBuffer({ size, usage })
    this.other = device.createBuffer({ size, usage })
    this.vel = device.createBuffer({ size, usage })
    this.dropUniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    this.plainUniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    device.queue.writeBuffer(this.plainUniform, 0, this.packSim(0, 0, 0))

    const module = device.createShaderModule({ code: SEA_SIM_WGSL })
    this.pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'simStep' },
    })
    const layout = this.pipeline.getBindGroupLayout(0)
    this.bgAB = device.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: { buffer: this.dropUniform } },
        { binding: 1, resource: { buffer: this.heights } },
        { binding: 2, resource: { buffer: this.other } },
        { binding: 3, resource: { buffer: this.vel } },
      ],
    })
    this.bgBA = device.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: { buffer: this.plainUniform } },
        { binding: 1, resource: { buffer: this.other } },
        { binding: 2, resource: { buffer: this.heights } },
        { binding: 3, resource: { buffer: this.vel } },
      ],
    })
  }

  private packSim(x: number, y: number, amount: number): ArrayBuffer {
    const view = new DataView(this.simData)
    view.setUint32(0, SEA_GRID, true)
    view.setFloat32(4, x, true)
    view.setFloat32(8, y, true)
    view.setFloat32(12, amount, true)
    view.setFloat32(16, 3 + Math.random() * 3, true)
    view.setFloat32(20, 0.24, true)
    view.setFloat32(24, 0.994, true)
    view.setFloat32(28, 0, true)
    return this.simData
  }

  step(encoder: GPUCommandEncoder, dt: number) {
    this.dropClock += dt * SEA_DROPS_PER_SECOND
    let amount = 0
    if (this.dropClock >= 1) {
      this.dropClock -= 1
      amount = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.35)
    }
    this.device.queue.writeBuffer(
      this.dropUniform,
      0,
      this.packSim(Math.random() * SEA_GRID, Math.random() * SEA_GRID, amount),
    )
    const groups = Math.ceil(SEA_GRID / 8)
    const pass = encoder.beginComputePass()
    pass.setPipeline(this.pipeline)
    pass.setBindGroup(0, this.bgAB)
    pass.dispatchWorkgroups(groups, groups)
    pass.setBindGroup(0, this.bgBA)
    pass.dispatchWorkgroups(groups, groups)
    pass.end()
  }
}
