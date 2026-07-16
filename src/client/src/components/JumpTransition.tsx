import type { CSSProperties } from 'react'

const warpStreaks = Array.from({ length: 56 }, (_, index) => ({
  angle: (360 / 56) * index + ((index * 17) % 9),
  delay: -((index * 83) % 720),
  duration: 460 + ((index * 47) % 420),
  length: 5 + ((index * 29) % 14),
  width: index % 9 === 0 ? 3 : index % 3 === 0 ? 2 : 1,
}))

type WarpStreakStyle = CSSProperties & {
  '--warp-angle': string
  '--warp-length': string
}

export function JumpTransition() {
  return (
    <main
      aria-label="Jump in progress"
      aria-live="assertive"
      className="jump-transition"
      role="status"
    >
      <div className="jump-transition__shake" aria-hidden="true">
        <div className="jump-transition__bloom" />
        <div className="jump-transition__tunnel jump-transition__tunnel--outer" />
        <div className="jump-transition__tunnel jump-transition__tunnel--inner" />
        <div className="jump-transition__streaks">
          {warpStreaks.map((streak, index) => (
            <span
              className="jump-transition__streak"
              key={index}
              style={
                {
                  '--warp-angle': `${streak.angle}deg`,
                  '--warp-length': `${streak.length}vmin`,
                  animationDelay: `${streak.delay}ms`,
                  animationDuration: `${streak.duration}ms`,
                  width: `${streak.width}px`,
                } as WarpStreakStyle
              }
            />
          ))}
        </div>
      </div>

      <div className="jump-transition__flash" aria-hidden="true" />
      <div className="jump-transition__readout">
        <span>Jump sequence</span>
        <strong>Transit engaged</strong>
        <div className="jump-transition__progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </main>
  )
}
