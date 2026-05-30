import { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../../../classNames'
import type {
  EmScanReport,
  EmScanner,
  GravityScanner,
  JumpAreaMap,
} from '../../../gameTypes'
import {
  jumpAreaGridStepLightYears,
  jumpAreaMajorGridStepLightYears,
  jumpAreaMinimumViewLightYears,
} from './constants'
import { formatPercent } from './formatters'
import { getMapCenterPosition } from './mapMath'
import { StellarMapView } from './StellarMapView'
import { StellarReadout } from './StellarReadout'
import {
  longRangeNavigationContent,
  navigationContent,
} from '../styleClasses'
import type { MapPosition } from './types'

export function JumpAreaMapPanel({
  elapsedMilliseconds,
  emScanner,
  gizmoReferenceSpan,
  gravityScanner,
  map,
  onCaptureEmScanReport,
  onStartEmScan,
  onSelectSystem,
  onStartGravityScan,
  onStopEmScan,
  selectedSystemId,
  tick,
}: {
  elapsedMilliseconds: number
  emScanner: EmScanner
  gizmoReferenceSpan: number
  gravityScanner: GravityScanner
  map: JumpAreaMap
  onCaptureEmScanReport: (focus: number, filter: number) => Promise<void>
  onStartEmScan: (x: number, y: number) => Promise<void>
  onSelectSystem: (systemId: string) => void
  onStartGravityScan: () => Promise<void>
  onStopEmScan: () => Promise<void>
  selectedSystemId: string | null
  tick: number
}) {
  const [gravityOverlayPreference, setGravityOverlayPreference] = useState({
    scanId: null as string | null,
    visible: true,
  })
  const [emTargeting, setEmTargeting] = useState(false)
  const [selectedEmReportId, setSelectedEmReportId] = useState<string | null>(
    null,
  )
  const shipPosition = getMapCenterPosition(map)
  const selectedSystem = useMemo(
    () => map.systems.find((system) => system.id === selectedSystemId) ?? null,
    [map.systems, selectedSystemId],
  )
  const scan = gravityScanner.currentScan
  const scanProgress = getGravityScanProgress(gravityScanner, tick)
  const scanComplete = scan !== null && tick >= scan.completesAtTick
  const scanRunning = scan !== null && !scanComplete
  const scanId = scan?.result.id ?? null
  const gravityOverlayVisible =
    gravityOverlayPreference.scanId === scanId
      ? gravityOverlayPreference.visible
      : true
  const gravityHeatMap =
    scanComplete && gravityOverlayVisible ? scan.result.heatMap : null
  const emScan = emScanner.currentScan
  const emTargetingActive = emTargeting && emScan === null
  const selectedEmReport = useMemo(
    () =>
      emScanner.reports.find((report) => report.id === selectedEmReportId) ??
      null,
    [emScanner.reports, selectedEmReportId],
  )

  function handleEmTargetMapPoint(position: MapPosition) {
    setEmTargeting(false)
    setSelectedEmReportId(null)
    void onStartEmScan(position.x, position.y)
  }

  return (
    <div className={cx(navigationContent, longRangeNavigationContent)}>
      <StellarMapView
        emScanTarget={
          emScan
            ? {
                ...emScan.target,
                radiusLightYears: emScan.radiusLightYears,
              }
            : null
        }
        emScanReports={emScanner.reports}
        gizmoReferenceSpan={gizmoReferenceSpan}
        gravityHeatMap={gravityHeatMap}
        gridStep={jumpAreaGridStepLightYears}
        key="jump-area"
        map={map}
        majorGridStep={jumpAreaMajorGridStepLightYears}
        minimumViewSpan={jumpAreaMinimumViewLightYears}
        onTargetMapPoint={
          emTargetingActive ? handleEmTargetMapPoint : undefined
        }
        onSelectEmReport={setSelectedEmReportId}
        onSelectSystem={onSelectSystem}
        selectedEmReportId={selectedEmReportId}
        selectedSystemId={selectedSystemId}
        shipPosition={shipPosition}
        targeting={emTargetingActive}
      />
      <StellarReadout
        elapsedMilliseconds={elapsedMilliseconds}
        extentLabel="Area"
        extentValue={map.width}
        map={map}
        selectedSystem={selectedSystem}
      >
        <GravityScannerControl
          gravityScanner={gravityScanner}
          onOverlayVisibleChange={(visible) =>
            setGravityOverlayPreference({ scanId, visible })
          }
          onStartGravityScan={onStartGravityScan}
          overlayVisible={scanComplete && gravityOverlayVisible}
          scanComplete={scanComplete}
          scanProgress={scanProgress}
          scanRunning={scanRunning}
        />
        <EmScannerControl
          emScanner={emScanner}
          onCancelTargeting={() => setEmTargeting(false)}
          onStartTargeting={() => setEmTargeting(true)}
          scanActive={emScan !== null}
          targeting={emTargetingActive}
        />
        {emScan ? (
          <EmScannerPanel
            onCaptureEmScanReport={onCaptureEmScanReport}
            onStopEmScan={onStopEmScan}
            scan={emScan}
          />
        ) : null}
        {selectedEmReport ? (
          <EmScanReportPanel report={selectedEmReport} />
        ) : null}
      </StellarReadout>
    </div>
  )
}

function GravityScannerControl({
  gravityScanner,
  onOverlayVisibleChange,
  onStartGravityScan,
  overlayVisible,
  scanComplete,
  scanProgress,
  scanRunning,
}: {
  gravityScanner: GravityScanner
  onOverlayVisibleChange: (visible: boolean) => void
  onStartGravityScan: () => Promise<void>
  overlayVisible: boolean
  scanComplete: boolean
  scanProgress: number
  scanRunning: boolean
}) {
  const progressPercent = Math.round(scanProgress * 100)
  const status = scanRunning ? 'Scanning' : scanComplete ? 'Complete' : 'Ready'

  return (
    <section
      className="grid gap-3 rounded-md border border-[#243033] bg-[rgb(3_6_7_/_72%)] p-3"
      aria-label="Gravity scanner"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="text-[10px] uppercase text-[#7f999a]">
            Scanner
          </span>
          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[#eef6f4]">
            {gravityScanner.label}
          </strong>
        </div>
        <button
          className="min-h-8 shrink-0 cursor-pointer rounded-md border border-[#4d6b68] bg-[#d7ece5] px-3 text-xs font-[750] uppercase tracking-normal text-[#071011] enabled:hover:bg-[#f0fff8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f7f7] disabled:cursor-not-allowed disabled:border-[#263235] disabled:bg-[#111718] disabled:text-[#52696a]"
          disabled={scanRunning}
          onClick={() => {
            void onStartGravityScan()
          }}
          type="button"
        >
          Scan
        </button>
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase text-[#91aaaa]">
          <span>{status}</span>
          <span>{progressPercent}%</span>
        </div>
        <div
          aria-label="Gravity scan progress"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressPercent}
          className="h-2 overflow-hidden rounded-full bg-[#10191a]"
          role="progressbar"
        >
          <div
            className="h-full rounded-full bg-[#d4d56f] transition-[width] duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <label
        className={cx(
          'flex min-h-8 items-center justify-between gap-3 text-xs font-[650] uppercase tracking-normal text-[#dce7e5]',
          !scanComplete && 'text-[#52696a]',
        )}
      >
        <span>Heat Overlay</span>
        <input
          checked={overlayVisible}
          className="h-4 w-8 accent-[#d4d56f]"
          disabled={!scanComplete}
          onChange={(event) => onOverlayVisibleChange(event.target.checked)}
          type="checkbox"
        />
      </label>
    </section>
  )
}

function EmScannerControl({
  emScanner,
  onCancelTargeting,
  onStartTargeting,
  scanActive,
  targeting,
}: {
  emScanner: EmScanner
  onCancelTargeting: () => void
  onStartTargeting: () => void
  scanActive: boolean
  targeting: boolean
}) {
  const status = scanActive ? 'Active' : targeting ? 'Targeting' : 'Ready'

  return (
    <section
      className="grid gap-3 rounded-md border border-[#243033] bg-[rgb(3_6_7_/_72%)] p-3"
      aria-label="EM scanner"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="text-[10px] uppercase text-[#7f999a]">
            Scanner
          </span>
          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[#eef6f4]">
            {emScanner.label}
          </strong>
        </div>
        <button
          className={cx(
            'min-h-8 shrink-0 cursor-pointer rounded-md border px-3 text-xs font-[750] uppercase tracking-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f7f7] disabled:cursor-not-allowed disabled:border-[#263235] disabled:bg-[#111718] disabled:text-[#52696a]',
            targeting
              ? 'border-[#4d6b68] bg-transparent text-[#dce7e5] enabled:hover:bg-[#162021]'
              : 'border-[#4d6b68] bg-[#d7ece5] text-[#071011] enabled:hover:bg-[#f0fff8]',
          )}
          disabled={scanActive}
          onClick={targeting ? onCancelTargeting : onStartTargeting}
          type="button"
        >
          {targeting ? 'Cancel' : 'EM Scan'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] uppercase text-[#91aaaa]">
        <span>Status</span>
        <span>{status}</span>
      </div>
    </section>
  )
}

function EmScannerPanel({
  onCaptureEmScanReport,
  onStopEmScan,
  scan,
}: {
  onCaptureEmScanReport: (focus: number, filter: number) => Promise<void>
  onStopEmScan: () => Promise<void>
  scan: NonNullable<EmScanner['currentScan']>
}) {
  const [filter, setFilter] = useState(52)
  const [focus, setFocus] = useState(52)

  return (
    <section
      className="grid gap-3 rounded-md border border-[#36534f] bg-[rgb(5_12_13_/_88%)] p-3"
      aria-label="EM scan signal"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="text-[10px] uppercase text-[#7f999a]">
            EM Signal
          </span>
          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[#eef6f4]">
            {formatEmTarget(scan.target.x, scan.target.y)}
          </strong>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="min-h-8 cursor-pointer rounded-md border border-[#4d6b68] bg-[#d7ece5] px-3 text-xs font-[750] uppercase tracking-normal text-[#071011] enabled:hover:bg-[#f0fff8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f7f7]"
            onClick={() => {
              void onCaptureEmScanReport(focus / 100, filter / 100)
            }}
            type="button"
          >
            Snapshot
          </button>
          <button
            className="min-h-8 cursor-pointer rounded-md border border-[#4d6b68] bg-transparent px-3 text-xs font-[750] uppercase tracking-normal text-[#dce7e5] enabled:hover:bg-[#162021] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f7f7]"
            onClick={() => {
              void onStopEmScan()
            }}
            type="button"
          >
            Close
          </button>
        </div>
      </div>

      <EmNoiseSignal
        filter={filter}
        focus={focus}
        signalProfile={scan.signalProfile}
      />

      <label className="grid gap-1 text-[11px] uppercase text-[#91aaaa]">
        <span>Filter</span>
        <input
          className="h-4 accent-[#70d6bd]"
          max="100"
          min="0"
          onChange={(event) => setFilter(Number(event.target.value))}
          type="range"
          value={filter}
        />
      </label>

      <label className="grid gap-1 text-[11px] uppercase text-[#91aaaa]">
        <span>Focus</span>
        <input
          className="h-4 accent-[#d4d56f]"
          max="100"
          min="0"
          onChange={(event) => setFocus(Number(event.target.value))}
          type="range"
          value={focus}
        />
      </label>
    </section>
  )
}

function EmScanReportPanel({ report }: { report: EmScanReport }) {
  return (
    <section
      className="grid gap-3 rounded-md border border-[#2b403f] bg-[rgb(3_6_7_/_72%)] p-3"
      aria-label="EM scan report"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="text-[10px] uppercase text-[#7f999a]">
            Scan Report
          </span>
          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[#eef6f4]">
            {formatEmTarget(report.target.x, report.target.y)}
          </strong>
        </div>
        <span className="shrink-0 text-[11px] uppercase text-[#91aaaa]">
          {formatLockState(report.lockState)}
        </span>
      </div>

      <div className="grid gap-2">
        <MetricBar label="Signal Strength" value={report.signalStrength} />
        <MetricBar label="Coherence" value={report.coherence} />
        <MetricBar label="Drift Stability" value={report.driftStability} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <ReportValue
          label="Speed"
          value={
            report.estimatedSpeedKilometersPerSecond === null
              ? '--'
              : formatEmSpeed(report.estimatedSpeedKilometersPerSecond)
          }
        />
        <ReportValue
          label="Angle"
          value={
            report.estimatedAngleDegrees === null
              ? '--'
              : `${Math.round(report.estimatedAngleDegrees)} deg`
          }
        />
        <ReportValue
          label="Distortion"
          value={
            report.estimatedDistortion === null
              ? '--'
              : formatPercent(report.estimatedDistortion)
          }
        />
        <ReportValue label="Confidence" value={formatConfidence(report.confidence)} />
      </div>
    </section>
  )
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100)

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3 text-[11px] uppercase text-[#91aaaa]">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#10191a]">
        <div
          className="h-full rounded-full bg-[#70d6bd]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function ReportValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-0.5 rounded-md border border-[#1d282a] bg-[#060909] p-2">
      <span className="text-[10px] uppercase text-[#7f999a]">{label}</span>
      <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[#dce7e5]">
        {value}
      </strong>
    </div>
  )
}

function EmNoiseSignal({
  filter,
  focus,
  signalProfile,
}: {
  filter: number
  focus: number
  signalProfile: NonNullable<EmScanner['currentScan']>['signalProfile']
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const signalCanvas = canvas
    const signalContext = context
    const normalizedFilter = filter / 100
    const normalizedFocus = focus / 100
    const focusMismatch = Math.abs(normalizedFocus - signalProfile.focusBias)
    const filterMismatch = Math.abs(normalizedFilter - signalProfile.filterBias)
    const waveStrength =
      signalProfile.baseStrength * (1.1 - (normalizedFilter * 0.45))
    const instability =
      signalProfile.noiseLevel * (1 - normalizedFilter) +
      (focusMismatch * 0.4) +
      (filterMismatch * 0.25)
    let frameId = 0
    let lastY = 0
    let phase = signalProfile.noiseSeed % 360

    function resize() {
      const bounds = signalCanvas.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      const width = Math.max(1, Math.floor(bounds.width * pixelRatio))
      const height = Math.max(1, Math.floor(bounds.height * pixelRatio))

      if (signalCanvas.width !== width || signalCanvas.height !== height) {
        signalCanvas.width = width
        signalCanvas.height = height
        lastY = height / 2
        signalContext.fillStyle = '#020505'
        signalContext.fillRect(0, 0, width, height)
      }
    }

    function draw() {
      resize()

      const { width, height } = signalCanvas
      const step = Math.max(2, Math.floor(width / 160))
      const primary =
        Math.sin(phase * signalProfile.primaryFrequency) *
        height *
        (0.05 + (waveStrength * 0.24))
      const drift =
        Math.sin((phase * signalProfile.driftFrequency) + 1.8) *
        height *
        (0.03 + (normalizedFocus * 0.12))
      const jitter = SignedRandom() * height * Math.min(0.32, instability * 0.18)
      const nextY = Math.max(
        4,
        Math.min(
          height - 4,
          height / 2 + primary + drift + jitter,
        ),
      )

      signalContext.drawImage(signalCanvas, -step, 0)
      signalContext.fillStyle = '#020505'
      signalContext.fillRect(width - step, 0, step, height)

      for (let index = 0; index < height / 2; index += 1) {
        const y = Math.random() * height
        const alpha = 0.04 + Math.random() * Math.min(0.42, instability)

        signalContext.fillStyle = `rgba(112, 214, 189, ${alpha})`
        signalContext.fillRect(width - step, y, step, 1)
      }

      signalContext.strokeStyle = 'rgba(215, 236, 229, 0.86)'
      signalContext.lineWidth = Math.max(1, Math.floor(width / 260))
      signalContext.beginPath()
      signalContext.moveTo(width - step - 1, lastY)
      signalContext.lineTo(width - 1, nextY)
      signalContext.stroke()

      lastY = nextY
      phase += 0.035
      frameId = window.requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [filter, focus, signalProfile])

  return (
    <canvas
      aria-label="EM signal noise"
      className="h-24 w-full rounded-md border border-[#1f3534] bg-[#020505]"
      ref={canvasRef}
    />
  )
}

function SignedRandom() {
  return (Math.random() * 2) - 1
}

function formatEmTarget(x: number, y: number) {
  return `${x.toFixed(3)}, ${y.toFixed(3)} ly`
}

function formatEmSpeed(kilometersPerSecond: number) {
  return `${kilometersPerSecond.toFixed(3)} km/s`
}

function formatLockState(lockState: EmScanReport['lockState']) {
  switch (lockState) {
    case 'stable-lock':
      return 'Stable lock'
    case 'partial-lock':
      return 'Partial lock'
    case 'weak-lock':
      return 'Weak lock'
    case 'no-signal':
      return 'No signal'
  }
}

function formatConfidence(confidence: EmScanReport['confidence']) {
  switch (confidence) {
    case 'low-medium':
      return 'Low-medium'
    case 'absolute':
      return 'Absolute'
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
    case 'none':
      return 'None'
  }
}

function getGravityScanProgress(gravityScanner: GravityScanner, tick: number) {
  const scan = gravityScanner.currentScan

  if (!scan) {
    return 0
  }

  const duration = Math.max(1, scan.completesAtTick - scan.startedAtTick)

  return Math.min(
    1,
    Math.max(0, (tick - scan.startedAtTick) / duration),
  )
}
