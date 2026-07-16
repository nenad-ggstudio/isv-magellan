import { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../../../classNames'
import { KnobControl } from '../../common/RotaryKnob'
import type {
  EmScanReport,
  EmScanner,
  GravityScanner,
  JumpAreaMap,
  JumpQuote,
} from '../../../gameTypes'
import {
  jumpAreaGridStepLightYears,
  jumpAreaMajorGridStepLightYears,
  jumpAreaMinimumViewLightYears,
} from './constants'
import {
  clamp,
  formatRgb,
  getEmWaveSettings,
  getInitialPhase,
  mixRgb,
  normalizePositivePhase,
  normalizeSignedPhase,
  signedSeededRandom,
  type EmSignalControls,
  type EmSignalProfile,
  type EmWaveSettings,
  type RgbColor,
} from './emSignalMath'
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
  onGetJumpQuote,
  onJump,
  selectedSystemId,
  tick,
}: {
  elapsedMilliseconds: number
  emScanner: EmScanner
  gizmoReferenceSpan: number
  gravityScanner: GravityScanner
  map: JumpAreaMap
  onCaptureEmScanReport: (
    focus: number,
    filter: number,
    phaseErrorRadians: number,
  ) => Promise<void>
  onStartEmScan: (x: number, y: number) => Promise<void>
  onSelectSystem: (systemId: string) => void
  onStartGravityScan: () => Promise<void>
  onStopEmScan: () => Promise<void>
  onGetJumpQuote: (x: number, y: number) => Promise<JumpQuote | null>
  onJump: (
    expectedOriginX: number,
    expectedOriginY: number,
    targetX: number,
    targetY: number,
  ) => Promise<boolean>
  selectedSystemId: string | null
  tick: number
}) {
  const [gravityOverlayPreference, setGravityOverlayPreference] = useState({
    scanId: null as string | null,
    visible: true,
  })
  const [emTargeting, setEmTargeting] = useState(false)
  const [jumpTargeting, setJumpTargeting] = useState(false)
  const [jumpQuote, setJumpQuote] = useState<JumpQuote | null>(null)
  const [jumpQuotePending, setJumpQuotePending] = useState(false)
  const [jumpPending, setJumpPending] = useState(false)
  const [jumpError, setJumpError] = useState<string | null>(null)
  const jumpQuoteRequestId = useRef(0)
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
  const jumpTargetingActive = jumpTargeting && emScan === null
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

  function startJumpTargeting() {
    jumpQuoteRequestId.current += 1
    setEmTargeting(false)
    setSelectedEmReportId(null)
    setJumpQuote(null)
    setJumpError(null)
    setJumpTargeting(true)
  }

  function cancelJump() {
    jumpQuoteRequestId.current += 1
    setJumpTargeting(false)
    setJumpQuote(null)
    setJumpQuotePending(false)
    setJumpError(null)
  }

  async function handleJumpTargetMapPoint(position: MapPosition) {
    const requestId = jumpQuoteRequestId.current + 1

    jumpQuoteRequestId.current = requestId
    setJumpTargeting(false)
    setJumpQuote(null)
    setJumpError(null)
    setJumpQuotePending(true)

    try {
      const quote = await onGetJumpQuote(position.x, position.y)

      if (jumpQuoteRequestId.current !== requestId) {
        return
      }

      setJumpQuote(quote)
      setJumpError(quote ? null : 'Choose a point away from the ship.')
    } catch {
      if (jumpQuoteRequestId.current === requestId) {
        setJumpError('Unable to calculate jump cost.')
      }
    } finally {
      if (jumpQuoteRequestId.current === requestId) {
        setJumpQuotePending(false)
      }
    }
  }

  async function executeJump() {
    if (!jumpQuote || !jumpQuote.canAfford || jumpPending) {
      return
    }

    setJumpPending(true)
    setJumpError(null)

    try {
      const succeeded = await onJump(
        jumpQuote.originX,
        jumpQuote.originY,
        jumpQuote.targetX,
        jumpQuote.targetY,
      )

      if (succeeded) {
        setJumpQuote(null)
        setJumpTargeting(false)
      } else {
        setJumpQuote(null)
        setJumpError('Jump conditions changed. Select a new target.')
      }
    } catch {
      setJumpError('Jump failed. Select a new target.')
      setJumpQuote(null)
    } finally {
      setJumpPending(false)
    }
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
        jumpTarget={
          jumpQuote
            ? { x: jumpQuote.targetX, y: jumpQuote.targetY }
            : null
        }
        majorGridStep={jumpAreaMajorGridStepLightYears}
        minimumViewSpan={jumpAreaMinimumViewLightYears}
        onTargetMapPoint={
          jumpTargetingActive
            ? (position) => {
                void handleJumpTargetMapPoint(position)
              }
            : emTargetingActive
              ? handleEmTargetMapPoint
              : undefined
        }
        onSelectEmReport={setSelectedEmReportId}
        onSelectSystem={onSelectSystem}
        selectedEmReportId={selectedEmReportId}
        selectedSystemId={selectedSystemId}
        shipPosition={shipPosition}
        targeting={jumpTargetingActive || emTargetingActive}
        targetingLabel={
          jumpTargetingActive ? 'Choose jump target' : 'Choose EM scan target'
        }
      />
      <StellarReadout
        elapsedMilliseconds={elapsedMilliseconds}
        extentLabel="Area"
        extentValue={map.width}
        map={map}
        selectedSystem={selectedSystem}
      >
        <JumpControl
          error={jumpError}
          jumpPending={jumpPending}
          onCancel={cancelJump}
          onConfirm={() => {
            void executeJump()
          }}
          onStartTargeting={startJumpTargeting}
          quote={jumpQuote}
          quotePending={jumpQuotePending}
          targeting={jumpTargetingActive}
        />
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
          onStartTargeting={() => {
            cancelJump()
            setEmTargeting(true)
          }}
          scanActive={emScan !== null}
          targeting={emTargetingActive}
        />
        {selectedEmReport ? (
          <EmScanReportPanel report={selectedEmReport} />
        ) : null}
      </StellarReadout>
      {emScan ? (
        <EmScannerDialog
          onCaptureEmScanReport={onCaptureEmScanReport}
          onSelectEmReport={setSelectedEmReportId}
          onStopEmScan={onStopEmScan}
          reportCount={emScanner.reports.length}
          scan={emScan}
        />
      ) : null}
    </div>
  )
}

function JumpControl({
  error,
  jumpPending,
  onCancel,
  onConfirm,
  onStartTargeting,
  quote,
  quotePending,
  targeting,
}: {
  error: string | null
  jumpPending: boolean
  onCancel: () => void
  onConfirm: () => void
  onStartTargeting: () => void
  quote: JumpQuote | null
  quotePending: boolean
  targeting: boolean
}) {
  const status = jumpPending
    ? 'Jumping'
    : quotePending
      ? 'Calculating'
      : targeting
        ? 'Select target'
        : quote
          ? quote.canAfford
            ? 'Ready'
            : 'Insufficient fuel'
          : error
            ? 'Unavailable'
            : 'Standby'

  return (
    <section
      className="grid gap-3 rounded-md border border-[#16475a] bg-[rgb(0_20_30_/_72%)] p-3"
      aria-label="Jump drive"
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="grid min-w-0 gap-0.5">
          <span className="text-[10px] uppercase text-[#3a8aa2]">
            Jump Drive
          </span>
          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[#dff8ff]">
            {status}
          </strong>
        </div>
        {quote ? (
          <div className="flex shrink-0 gap-2">
            <button
              className="min-h-8 cursor-pointer rounded-md border border-[#2b6678] bg-transparent px-3 text-xs font-[750] uppercase text-[#9bc6d2] hover:bg-[#082a35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c4e8]"
              disabled={jumpPending}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-8 cursor-pointer rounded-md border border-[#00a5c7] bg-[#00c4e8] px-3 text-xs font-[750] uppercase text-[#001014] enabled:hover:bg-[#5be3fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f7f7] disabled:cursor-not-allowed disabled:border-[#26434a] disabled:bg-[#14272c] disabled:text-[#52696a]"
              disabled={!quote.canAfford || jumpPending}
              onClick={onConfirm}
              type="button"
            >
              {jumpPending ? 'Jumping…' : 'Confirm'}
            </button>
          </div>
        ) : (
          <button
            className={cx(
              'min-h-8 shrink-0 cursor-pointer rounded-md border px-3 text-xs font-[750] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f7f7] disabled:cursor-not-allowed disabled:border-[#263235] disabled:bg-[#111718] disabled:text-[#52696a]',
              targeting
                ? 'border-[#2b6678] bg-transparent text-[#9bc6d2] enabled:hover:bg-[#082a35]'
                : 'border-[#00a5c7] bg-[#00c4e8] text-[#001014] enabled:hover:bg-[#5be3fa]',
            )}
            disabled={quotePending}
            onClick={targeting ? onCancel : onStartTargeting}
            type="button"
          >
            {quotePending ? 'Calculating…' : targeting ? 'Cancel' : 'Jump'}
          </button>
        )}
      </div>

      {quote ? (
        <dl className="grid grid-cols-3 gap-2 rounded border border-[#123542] bg-[#031016] p-2 text-[11px] tabular-nums">
          <JumpQuoteValue
            label="Distance"
            value={`${quote.distanceLightYears.toFixed(3)} ly`}
          />
          <JumpQuoteValue
            label="D2 Cost"
            value={`${quote.deuteriumCostKilograms.toFixed(2)} kg`}
          />
          <JumpQuoteValue
            label="T2 Cost"
            value={`${quote.tritiumCostKilograms.toFixed(2)} kg`}
          />
        </dl>
      ) : null}

      {error ? (
        <p className="m-0 text-[11px] text-[#ff8b91]" role="status">
          {error}
        </p>
      ) : quote && !quote.canAfford ? (
        <p className="m-0 text-[11px] text-[#ffb36b]" role="status">
          Both D2 and T2 reserves must cover the quoted cost.
        </p>
      ) : targeting ? (
        <p className="m-0 text-[11px] text-[#79aeba]" role="status">
          Select any point in the Jump Area.
        </p>
      ) : null}
    </section>
  )
}

function JumpQuoteValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-[9px] uppercase text-[#3a7383]">{label}</dt>
      <dd className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[#c8e8f0]">
        {value}
      </dd>
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

function EmScannerDialog({
  onCaptureEmScanReport,
  onSelectEmReport,
  onStopEmScan,
  reportCount,
  scan,
}: {
  onCaptureEmScanReport: (
    focus: number,
    filter: number,
    phaseErrorRadians: number,
  ) => Promise<void>
  onSelectEmReport: (reportId: string) => void
  onStopEmScan: () => Promise<void>
  reportCount: number
  scan: NonNullable<EmScanner['currentScan']>
}) {
  const [filter, setFilter] = useState(50)
  const [focus, setFocus] = useState(50)
  const [snapshotPending, setSnapshotPending] = useState(false)
  const phaseErrorRef = useRef(0)
  const snapshotPendingRef = useRef(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        void onStopEmScan()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onStopEmScan])

  async function handleSnapshot() {
    if (snapshotPendingRef.current) {
      return
    }

    snapshotPendingRef.current = true
    setSnapshotPending(true)

    try {
      const nextReportId = formatEmScanReportId(scan.id, reportCount + 1)

      await onCaptureEmScanReport(focus, filter, phaseErrorRef.current)
      onSelectEmReport(nextReportId)
      await onStopEmScan()
    } catch {
      snapshotPendingRef.current = false
      setSnapshotPending(false)
    }
  }

  return (
    <div
      aria-label="EM scan signal"
      aria-modal="true"
      className="fixed inset-0 z-50 grid min-h-0 place-items-center bg-[rgb(1_4_5_/_88%)] p-5 text-left backdrop-blur-sm max-[800px]:p-3"
      role="dialog"
    >
      <section className="grid max-h-[calc(100svh-40px)] w-full max-w-[1120px] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden rounded-md border border-[#142840] bg-[rgb(3_8_18_/_97%)] p-4 shadow-[0_22px_90px_rgb(0_0_0_/_80%)] max-[800px]:max-h-[calc(100svh-24px)] max-[800px]:p-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="grid min-w-0 gap-0.5">
            <span className="text-[10px] uppercase text-[#7f999a]">
              EM Signal
            </span>
            <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-base text-[#eef6f4]">
              {formatEmTarget(scan.target.x, scan.target.y)}
            </strong>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="min-h-8 cursor-pointer rounded-md border border-[#4d6b68] bg-[#d7ece5] px-3 text-xs font-[750] uppercase tracking-normal text-[#071011] enabled:hover:bg-[#f0fff8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4f7f7]"
              disabled={snapshotPending}
              onClick={() => {
                void handleSnapshot()
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
          onPhaseErrorChange={(nextPhaseError) => {
            phaseErrorRef.current = nextPhaseError
          }}
          signalProfile={scan.signalProfile}
        />

        <div className="grid gap-4">
          {/*
            Signal Quality bar temporarily removed from the scanner UI.
            Easy-mode signal quality can be restored here later.
          */}

          <div className="grid grid-cols-2 gap-6 max-[720px]:grid-cols-1">
            <KnobControl
              accentColor="#70d6bd"
              label="Filter"
              onChange={setFilter}
              value={filter}
            />
            <KnobControl
              accentColor="#d4d56f"
              label="Focus"
              onChange={setFocus}
              value={focus}
            />
          </div>

          <div className="grid grid-cols-5 gap-2 text-[10px] uppercase text-[#91aaaa] max-[900px]:grid-cols-3 max-[720px]:grid-cols-1">
            <WaveLegendItem primary label="Primary" />
            <WaveLegendItem label="Secondary" />
            <LegendItem color="#3ddc84" label="Aligned" />
            <LegendItem color="#ff4c56" label="Drift" />
            <LegendItem color="#d7ece5" label="Filter" />
          </div>
        </div>
      </section>
    </div>
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

      <div className="grid gap-2 rounded-md border border-[#1d282a] bg-[#060909] p-3">
        <p className="text-sm leading-6 text-[#dce7e5]">
          {report.readingSummary}
        </p>
        <p className="text-[11px] uppercase text-[#7f999a]">
          Follow-up: {report.recommendedFollowUp}
        </p>
      </div>
    </section>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {label}
      </span>
    </span>
  )
}

function WaveLegendItem({
  label,
  primary = false,
}: {
  label: string
  primary?: boolean
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        className={cx(
          'h-0 w-7 shrink-0 rounded-full border-[#70d6bd]',
          primary
            ? 'border-t-[3px] shadow-[0_0_7px_rgb(112_214_189_/_70%)]'
            : 'border-t',
        )}
      />
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {label}
      </span>
    </span>
  )
}


type EmNoisePulse = {
  startedAt: number
  duration: number
  primaryAmplitude: number
  secondaryAmplitude: number
}

type EmWaveRenderStyle = {
  alpha?: number
  glow?: number
  lineWidth: number
  offsetY?: number
}

const scannerSampleSpacing = 2
const scannerScrollSpeed = 144

const signalGreen: RgbColor = { r: 61, g: 220, b: 132 }
const signalPurple: RgbColor = { r: 174, g: 98, b: 255 }
const signalRed: RgbColor = { r: 255, g: 76, b: 86 }

function EmNoiseSignal({
  filter,
  focus,
  onPhaseErrorChange,
  signalProfile,
}: {
  filter: number
  focus: number
  onPhaseErrorChange: (phaseErrorRadians: number) => void
  signalProfile: EmSignalProfile
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const controlsRef = useRef<EmSignalControls>({ filter, focus })
  const phaseCallbackRef = useRef(onPhaseErrorChange)
  const {
    baseAmplitude,
    baseStrength,
    idealFilter,
    idealFocus,
    lockState,
    noiseSeed,
    phaseShiftRadians,
    primaryWavelength,
  } = signalProfile

  useEffect(() => {
    controlsRef.current = { filter, focus }
  }, [filter, focus])

  useEffect(() => {
    phaseCallbackRef.current = onPhaseErrorChange
  }, [onPhaseErrorChange])

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
    const activeSignalProfile = {
      baseAmplitude,
      baseStrength,
      idealFilter,
      idealFocus,
      lockState,
      noiseSeed,
      phaseShiftRadians,
      primaryWavelength,
    }
    let frameId = 0
    let viewportWidth = 0
    let viewportHeight = 0
    let primaryPhase = getInitialPhase(activeSignalProfile.noiseSeed)
    let secondaryPhase = primaryPhase
    let primarySamples: number[] = []
    let secondarySamples: number[] = []
    let noisePulses: EmNoisePulse[] = []
    let scrollRemainder = 0
    let lastFrameTime = performance.now()
    let lastPhaseReportTime = 0
    let nextPulseAt = lastFrameTime
    let randomState = activeSignalProfile.noiseSeed || 1

    function resize() {
      const bounds = signalCanvas.getBoundingClientRect()
      const pixelRatio = window.devicePixelRatio || 1
      const nextViewportWidth = Math.max(1, bounds.width)
      const nextViewportHeight = Math.max(1, bounds.height)
      const canvasWidth = Math.max(1, Math.floor(nextViewportWidth * pixelRatio))
      const canvasHeight = Math.max(1, Math.floor(nextViewportHeight * pixelRatio))
      const sizeChanged =
        signalCanvas.width !== canvasWidth ||
        signalCanvas.height !== canvasHeight

      viewportWidth = nextViewportWidth
      viewportHeight = nextViewportHeight

      if (sizeChanged) {
        signalCanvas.width = canvasWidth
        signalCanvas.height = canvasHeight
        signalContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
        resetWaveState()
      }
    }

    function resetWaveState() {
      primaryPhase = getInitialPhase(activeSignalProfile.noiseSeed)
      secondaryPhase = primaryPhase
      primarySamples = []
      secondarySamples = []
      noisePulses = []
      scrollRemainder = 0
      nextPulseAt = performance.now()
      randomState = activeSignalProfile.noiseSeed || 1
    }

    function nextRandom() {
      randomState += 0x6d2b79f5

      let value = randomState
      value = Math.imul(value ^ (value >>> 15), value | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
    }

    function enqueueNoisePulses(timestamp: number, settings: EmWaveSettings) {
      const pulseInterval = 1_000 / Math.max(0.1, settings.actualNoiseFrequency)
      let pulseCount = 0

      while (timestamp >= nextPulseAt && pulseCount < 8) {
        const noiseAmount = settings.actualNoiseIntensity / 100

        noisePulses.push({
          startedAt: nextPulseAt,
          duration: 180 + (nextRandom() * 360),
          primaryAmplitude:
            signedSeededRandom(nextRandom()) *
            settings.baseAmplitude *
            noiseAmount,
          secondaryAmplitude:
            signedSeededRandom(nextRandom()) *
            settings.baseAmplitude *
            noiseAmount,
        })
        nextPulseAt += pulseInterval
        pulseCount += 1
      }

      noisePulses = noisePulses.filter(
        (pulse) => timestamp - pulse.startedAt <= pulse.duration,
      )
    }

    function getCurrentNoise(timestamp: number) {
      let primaryNoise = 0
      let secondaryNoise = 0

      for (const pulse of noisePulses) {
        const progress = clamp(
          (timestamp - pulse.startedAt) / pulse.duration,
          0,
          1,
        )
        const envelope = Math.sin(progress * Math.PI)

        primaryNoise += pulse.primaryAmplitude * envelope
        secondaryNoise += pulse.secondaryAmplitude * envelope
      }

      return { primaryNoise, secondaryNoise }
    }

    function generateSample(timestamp: number) {
      const settings = getEmWaveSettings(
        activeSignalProfile,
        controlsRef.current,
      )

      enqueueNoisePulses(timestamp, settings)

      const { primaryNoise, secondaryNoise } = getCurrentNoise(timestamp)
      const maximumAmplitude = viewportHeight * 0.42
      const effectivePrimaryAmplitude = clamp(
        settings.baseAmplitude + primaryNoise,
        4,
        maximumAmplitude,
      )
      const effectiveSecondaryAmplitude = clamp(
        settings.baseAmplitude + secondaryNoise,
        4,
        maximumAmplitude,
      )
      const centerY = viewportHeight / 2
      const primaryY =
        centerY + (Math.sin(primaryPhase) * effectivePrimaryAmplitude)
      const secondaryY =
        centerY +
        (Math.sin(secondaryPhase + activeSignalProfile.phaseShiftRadians) *
          effectiveSecondaryAmplitude)

      primaryPhase +=
        (Math.PI * 2 * scannerSampleSpacing) / settings.primaryWavelength
      secondaryPhase +=
        (Math.PI * 2 * scannerSampleSpacing) / settings.secondWavelength

      if (primaryPhase > 1_000_000 || secondaryPhase > 1_000_000) {
        primaryPhase = normalizePositivePhase(primaryPhase)
        secondaryPhase = normalizePositivePhase(secondaryPhase)
      }

      primarySamples.push(primaryY)
      secondarySamples.push(secondaryY)
    }

    function trimSamples() {
      const sampleLimit = Math.ceil(viewportWidth / scannerSampleSpacing) + 4

      while (primarySamples.length > sampleLimit) {
        primarySamples.shift()
        secondarySamples.shift()
      }
    }

    function drawBackground() {
      signalContext.fillStyle = '#020505'
      signalContext.fillRect(0, 0, viewportWidth, viewportHeight)
      signalContext.strokeStyle = 'rgba(112, 214, 189, 0.08)'
      signalContext.lineWidth = 1

      for (let x = 0; x <= viewportWidth; x += 24) {
        signalContext.beginPath()
        signalContext.moveTo(x, 0)
        signalContext.lineTo(x, viewportHeight)
        signalContext.stroke()
      }

      for (let y = 0; y <= viewportHeight; y += 24) {
        signalContext.beginPath()
        signalContext.moveTo(0, y)
        signalContext.lineTo(viewportWidth, y)
        signalContext.stroke()
      }

      signalContext.strokeStyle = 'rgba(215, 236, 229, 0.16)'
      signalContext.beginPath()
      signalContext.moveTo(0, viewportHeight / 2)
      signalContext.lineTo(viewportWidth, viewportHeight / 2)
      signalContext.stroke()
    }

    function drawWave(
      samples: number[],
      color: string,
      {
        alpha = 1,
        glow = 0,
        lineWidth,
        offsetY = 0,
      }: EmWaveRenderStyle,
    ) {
      if (samples.length < 2) {
        return
      }

      function tracePath() {
        signalContext.beginPath()

        samples.forEach((sample, index) => {
          const samplesFromRight = samples.length - 1 - index
          const x =
            viewportWidth -
            (samplesFromRight * scannerSampleSpacing) -
            scrollRemainder
          const y = sample + offsetY

          if (index === 0) {
            signalContext.moveTo(x, y)
          } else {
            signalContext.lineTo(x, y)
          }
        })

        signalContext.stroke()
      }

      signalContext.save()
      signalContext.lineCap = 'round'
      signalContext.lineJoin = 'round'
      signalContext.globalAlpha = alpha
      signalContext.strokeStyle = color
      signalContext.lineWidth = lineWidth
      signalContext.shadowBlur = glow
      signalContext.shadowColor = color
      tracePath()
      signalContext.restore()
    }

    function draw(timestamp: number) {
      resize()

      const elapsedSeconds = Math.min(
        0.1,
        Math.max(0, (timestamp - lastFrameTime) / 1_000),
      )

      lastFrameTime = timestamp
      scrollRemainder += scannerScrollSpeed * elapsedSeconds

      while (scrollRemainder >= scannerSampleSpacing) {
        generateSample(timestamp)
        scrollRemainder -= scannerSampleSpacing
      }

      trimSamples()

      const phaseError = normalizeSignedPhase(secondaryPhase - primaryPhase)
      const driftAmount = clamp(Math.abs(phaseError) / Math.PI, 0, 1)
      const primaryTarget = phaseError >= 0 ? signalPurple : signalRed
      const secondaryTarget = phaseError >= 0 ? signalRed : signalPurple
      const primaryColor = formatRgb(mixRgb(signalGreen, primaryTarget, driftAmount))
      const secondaryColor = formatRgb(
        mixRgb(signalGreen, secondaryTarget, driftAmount),
      )

      drawBackground()
      drawWave(primarySamples, primaryColor, {
        alpha: 0.98,
        glow: 9,
        lineWidth: 2.8,
      })
      drawWave(secondarySamples, secondaryColor, {
        alpha: 0.9,
        lineWidth: 1.35,
      })

      if (timestamp - lastPhaseReportTime >= 120) {
        phaseCallbackRef.current(phaseError)
        lastPhaseReportTime = timestamp
      }

      frameId = window.requestAnimationFrame(draw)
    }

    frameId = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
    baseAmplitude,
    baseStrength,
    idealFilter,
    idealFocus,
    lockState,
    noiseSeed,
    phaseShiftRadians,
    primaryWavelength,
  ])

  return (
    <canvas
      aria-label="EM signal noise"
      className="h-[min(52svh,460px)] min-h-[260px] w-full min-w-0 rounded-md border border-[#1f3534] bg-[#020505] max-[800px]:h-[min(40svh,320px)] max-[800px]:min-h-[180px]"
      ref={canvasRef}
    />
  )
}

function formatEmScanReportId(scanId: string, reportNumber: number) {
  return `${scanId}-report-${reportNumber.toString().padStart(3, '0')}`
}

function formatEmTarget(x: number, y: number) {
  return `${x.toFixed(3)}, ${y.toFixed(3)} ly`
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
