import { useRef } from 'react'

// ─── Geometry ────────────────────────────────────────────────────────────────

const SIZE = 88
const CX = SIZE / 2
const CY = SIZE / 2
const TRACK_R = 32
const TRACK_W = 5
/** Angle (degrees, SVG convention) where the arc begins — 7 o'clock */
const START_DEG = 135
/** Total arc sweep — 270° clockwise from START_DEG to 5 o'clock */
const SWEEP_DEG = 270

function polar(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function arcPath(startDeg: number, sweepDeg: number, r: number) {
  if (sweepDeg <= 0) return ''
  const s = polar(startDeg, r)
  const e = polar(startDeg + sweepDeg, r)
  const large = sweepDeg > 180 ? 1 : 0
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`
}

const TICK_FRACTIONS = [0, 0.25, 0.5, 0.75, 1]

// ─── RotaryKnob ──────────────────────────────────────────────────────────────

export type RotaryKnobProps = {
  /** Highlight color for the filled arc and needle. Defaults to cyan. */
  accentColor?: string
  /** Accessible label for screen readers. */
  ariaLabel?: string
  max?: number
  min?: number
  onChange: (value: number) => void
  /** Snap increment. */
  step?: number
  value: number
}

export function RotaryKnob({
  accentColor = '#00c4e8',
  ariaLabel,
  max = 100,
  min = 1,
  onChange,
  step = 0.5,
  value,
}: RotaryKnobProps) {
  const isDragging = useRef(false)
  const lastY = useRef(0)

  const fraction = (value - min) / (max - min)
  const currentDeg = START_DEG + fraction * SWEEP_DEG
  const needle0 = polar(currentDeg, 9)
  const needle1 = polar(currentDeg, 14)

  const ticks = TICK_FRACTIONS.map((t) => {
    const deg = START_DEG + t * SWEEP_DEG
    return {
      inner: polar(deg, TRACK_R + 4),
      outer: polar(deg, TRACK_R + 9),
      active: t <= fraction,
    }
  })

  function snap(v: number) {
    const steppedValue = min + Math.round((v - min) / step) * step
    return Math.max(min, Math.min(max, steppedValue))
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    isDragging.current = true
    lastY.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!isDragging.current) return
    const dy = lastY.current - e.clientY
    lastY.current = e.clientY
    onChange(snap(value + (dy / 160) * (max - min)))
  }

  function handlePointerUp() {
    isDragging.current = false
  }

  function handleKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    let nextValue: number | null = null

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        nextValue = value + step
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        nextValue = value - step
        break
      case 'PageUp':
        nextValue = value + step * 10
        break
      case 'PageDown':
        nextValue = value - step * 10
        break
      case 'Home':
        nextValue = min
        break
      case 'End':
        nextValue = max
        break
    }

    if (nextValue !== null) {
      e.preventDefault()
      onChange(snap(nextValue))
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.stopPropagation()
    onChange(snap(value + (e.deltaY > 0 ? -step : step)))
  }

  return (
    <svg
      aria-label={ariaLabel ?? `Knob, value ${value}`}
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={value}
      className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c4e8]"
      height={SIZE}
      onBlur={handlePointerUp}
      onKeyDown={handleKeyDown}
      onLostPointerCapture={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      role="slider"
      style={{ cursor: 'ns-resize', touchAction: 'none', userSelect: 'none' }}
      tabIndex={0}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
    >
      {/* Background track */}
      <path
        d={arcPath(START_DEG, SWEEP_DEG, TRACK_R)}
        fill="none"
        stroke="#0c1c2c"
        strokeLinecap="round"
        strokeWidth={TRACK_W}
      />
      {/* Filled arc */}
      {fraction > 0.002 && (
        <path
          d={arcPath(START_DEG, fraction * SWEEP_DEG, TRACK_R)}
          fill="none"
          stroke={accentColor}
          strokeLinecap="round"
          strokeWidth={TRACK_W}
          style={{ filter: `drop-shadow(0 0 3px ${accentColor}90)` }}
        />
      )}
      {/* Quarter tick marks */}
      {ticks.map((tick, i) => (
        <line
          key={i}
          opacity={tick.active ? 0.65 : 0.4}
          stroke={tick.active ? accentColor : '#1e3c58'}
          strokeLinecap="round"
          strokeWidth="1"
          x1={tick.inner.x.toFixed(3)}
          x2={tick.outer.x.toFixed(3)}
          y1={tick.inner.y.toFixed(3)}
          y2={tick.outer.y.toFixed(3)}
        />
      ))}
      {/* Center body */}
      <circle
        cx={CX}
        cy={CY}
        fill="#060e1a"
        r={17}
        stroke="#142840"
        strokeWidth="1.5"
      />
      {/* Needle */}
      <line
        stroke={accentColor}
        strokeLinecap="round"
        strokeWidth="2.5"
        style={{ filter: `drop-shadow(0 0 3px ${accentColor})` }}
        x1={needle0.x.toFixed(3)}
        x2={needle1.x.toFixed(3)}
        y1={needle0.y.toFixed(3)}
        y2={needle1.y.toFixed(3)}
      />
    </svg>
  )
}

// ─── KnobControl ─────────────────────────────────────────────────────────────
// Composite: label + value readout + thin progress bar + RotaryKnob.

export type KnobControlProps = {
  accentColor: string
  label: string
  max?: number
  min?: number
  onChange: (value: number) => void
  step?: number
  value: number
}

export function KnobControl({
  accentColor,
  label,
  max = 100,
  min = 1,
  onChange,
  step = 0.5,
  value,
}: KnobControlProps) {
  const fillPct = ((value - min) / (max - min)) * 100

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em]">
        <span className="text-[#3a5c6e]">{label}</span>
        <span className="tabular-nums text-[#6a9aac]">{value.toFixed(1)}</span>
      </div>
      <div className="h-[2px] overflow-hidden rounded-full bg-[#0c1c2c]">
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 6px ${accentColor}60`,
            transition: 'width 60ms linear',
            width: `${fillPct}%`,
          }}
        />
      </div>
      <div className="flex justify-center pb-1 pt-2">
        <RotaryKnob
          accentColor={accentColor}
          ariaLabel={label}
          max={max}
          min={min}
          onChange={onChange}
          step={step}
          value={value}
        />
      </div>
    </div>
  )
}
