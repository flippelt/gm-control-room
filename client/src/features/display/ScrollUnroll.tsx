/**
 * Pergaminho que se desenrola: duas "varas" verticais nas pontas e o papel
 * crescendo na horizontal. O texto aparece inteiro após a animação de unroll.
 */
export function ScrollUnroll({ text }: { text: string }) {
  return (
    <div className="scene scene--text scene--text-scroll">
      <div className="scroll">
        <div className="scroll__rod scroll__rod--left" aria-hidden="true" />
        <div className="scroll__rod scroll__rod--right" aria-hidden="true" />
        <div className="scroll__paper">
          <div className="scroll__text">{text}</div>
        </div>
      </div>
    </div>
  )
}
