import os from 'node:os'

/** Retorna as URLs IPv4 da máquina na rede local (exclui loopback). */
export function getLanUrls(port: number): string[] {
  const nets = os.networkInterfaces()
  const urls: string[] = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}`)
      }
    }
  }
  return urls
}
