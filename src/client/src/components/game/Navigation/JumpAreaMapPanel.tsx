import { useMemo, useState } from 'react'
import { cx } from '../../../classNames'
import type { GravityScanner, JumpAreaMap } from '../../../gameTypes'
import {
  jumpAreaGridStepLightYears,
  jumpAreaMajorGridStepLightYears,
  jumpAreaMinimumViewLightYears,
} from './constants'
import { getMapCenterPosition } from './mapMath'
import { StellarMapView } from './StellarMapView'
import { StellarReadout } from './StellarReadout'
import {
  longRangeNavigationContent,
  navigationContent,
} from '../styleClasses'

export function JumpAreaMapPanel({
  elapsedMilliseconds,
  gizmoReferenceSpan,
  gravityScanner,
  map,
  onSelectSystem,
  onStartGravityScan,
  selectedSystemId,
  tick,
}: {
  elapsedMilliseconds: number
  gizmoReferenceSpan: number
  gravityScanner: GravityScanner
  map: JumpAreaMap
  onSelectSystem: (systemId: string) => void
  onStartGravityScan: () => Promise<void>
  selectedSystemId: string | null
  tick: number
}) {
  const [gravityOverlayPreference, setGravityOverlayPreference] = useState({
    scanId: null as string | null,
    visible: true,
  })
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

  return (
    <div className={cx(navigationContent, longRangeNavigationContent)}>
      <StellarMapView
        gizmoReferenceSpan={gizmoReferenceSpan}
        gravityHeatMap={gravityHeatMap}
        gridStep={jumpAreaGridStepLightYears}
        key="jump-area"
        map={map}
        majorGridStep={jumpAreaMajorGridStepLightYears}
        minimumViewSpan={jumpAreaMinimumViewLightYears}
        onSelectSystem={onSelectSystem}
        selectedSystemId={selectedSystemId}
        shipPosition={shipPosition}
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
