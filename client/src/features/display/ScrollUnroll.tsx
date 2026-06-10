/**
 * Pergaminho que se desenrola: duas "varas" verticais nas pontas e o papel
 * crescendo na horizontal. O texto aparece inteiro após a animação de unroll.
 *
 * Convenção: a PRIMEIRA LINHA do texto vira o título (fonte gótica Pirata One);
 * o restante é o corpo (serifa IM Fell English). Sem quebra de linha, tudo é
 * corpo (sem título).
 */
export function ScrollUnroll({ text }: { text: string }) {
  const nl = text.indexOf('\n')
  const title = nl >= 0 ? text.slice(0, nl).trim() : ''
  const body = (nl >= 0 ? text.slice(nl + 1) : text).trim()
  return (
    <div className="scene scene--text scene--text-scroll">
      <div className="scroll">
        <div className="scroll__paper">
          {title && <div className="scroll__title">{title}</div>}
          {body && <div className="scroll__text">{body}</div>}
        </div>
      </div>
    </div>
  )
}
