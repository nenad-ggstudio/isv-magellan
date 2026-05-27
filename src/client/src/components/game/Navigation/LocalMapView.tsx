import { useState } from 'react'
import type { KeyboardEvent, WheelEvent } from 'react'
import { cx } from '../../../classNames'
import type { LocalMap } from '../../../gameTypes'
import { localMapZoomMultiplier } from './constants'
import { formatMapScale } from './formatters'
import {
  clamp,
  degreesToRadians,
  getMaximumLocalMapZoom,
  toLocalSvgPoint,
} from './mapMath'
import type { LocalMapContactPosition } from './types'
import {
  mapControlButton,
  mapScale,
  mapToolbar,
  mapViewport,
} from '../styleClasses'

export function LocalMapView({
  contacts,
  map,
  onSelectContact,
  selectedContactId,
}: {
  contacts: LocalMapContactPosition[]
  map: LocalMap
  onSelectContact: (contactId: string) => void
  selectedContactId: string | null
}) {
  const [zoom, setZoom] = useState(1)
  const maximumZoom = getMaximumLocalMapZoom(map)
  const constrainedZoom = clamp(zoom, 1, maximumZoom)
  const viewRadius = map.radius / constrainedZoom
  const viewDiameter = viewRadius * 2
  const rangeRadii = [viewRadius / 3, (viewRadius / 3) * 2, viewRadius]
  const contactGlyphRadius = viewRadius * 0.008
  const contactHitRadius = viewRadius * 0.03
  const contactSelectionRadius = viewRadius * 0.024
  const contactStrokeWidth = viewRadius * 0.004
  const shipRadius = viewRadius * 0.011
  const shipRingRadius = viewRadius * 0.024
  const shipStrokeWidth = viewRadius * 0.0045
  const vectorLength = viewRadius * 0.1
  const visibleContacts = contacts.filter(
    (contact) => contact.distance <= map.radius,
  )
  const zoomInDisabled = constrainedZoom >= maximumZoom
  const zoomOutDisabled = constrainedZoom <= 1

  function changeZoom(multiplier: number) {
    setZoom((currentZoom) =>
      clamp(currentZoom * multiplier, 1, maximumZoom),
    )
  }

  function resetZoom() {
    setZoom(1)
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault()
    changeZoom(
      event.deltaY < 0
        ? localMapZoomMultiplier
        : 1 / localMapZoomMultiplier,
    )
  }

  return (
    <div className={mapViewport} aria-label={`${map.label} contacts`}>
      <div className={mapToolbar}>
        <button
          aria-label="Zoom out"
          className={mapControlButton}
          disabled={zoomOutDisabled}
          onClick={() => changeZoom(1 / localMapZoomMultiplier)}
          type="button"
        >
          -
        </button>
        <output
          aria-label="Visible radius"
          className={cx(mapScale, 'min-w-[88px]')}
        >
          R {formatMapScale(viewRadius, map.distanceUnit)}
        </output>
        <button
          aria-label="Zoom in"
          className={mapControlButton}
          disabled={zoomInDisabled}
          onClick={() => changeZoom(localMapZoomMultiplier)}
          type="button"
        >
          +
        </button>
        <button
          aria-label="Reset map view"
          className={mapControlButton}
          onClick={resetZoom}
          type="button"
        >
          []
        </button>
      </div>

      <svg
        className="block aspect-square h-auto max-h-full w-[min(100%,620px)] max-w-full touch-none [filter:drop-shadow(0_0_24px_rgb(92_162_155_/_16%))] max-[800px]:w-[min(100%,360px)]"
        onWheel={handleWheel}
        role="img"
        viewBox={`${-viewRadius} ${-viewRadius} ${viewDiameter} ${viewDiameter}`}
      >
        <title>{map.label}</title>
        <circle
          className="fill-[rgb(1_3_4_/_72%)]"
          cx="0"
          cy="0"
          r={map.radius}
        />
        <circle
          className="fill-none stroke-[rgb(179_219_211_/_55%)] [stroke-width:0.55]"
          cx="0"
          cy="0"
          r={map.radius}
          vectorEffect="non-scaling-stroke"
        />
        {rangeRadii.map((radius) => (
          <circle
            className="fill-none stroke-[rgb(129_165_161_/_25%)] [stroke-width:0.38]"
            cx="0"
            cy="0"
            key={radius}
            r={radius}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          className="fill-none stroke-[rgb(129_165_161_/_25%)] [stroke-dasharray:1.5_2] [stroke-width:0.38]"
          d={`M0 ${-map.radius}V${map.radius}M${-map.radius} 0H${map.radius}`}
          vectorEffect="non-scaling-stroke"
        />
        <g className="pointer-events-none" aria-label="Ship position">
          <circle
            className="fill-none stroke-[#55d6c2]"
            cx="0"
            cy="0"
            r={shipRingRadius}
            strokeWidth={shipStrokeWidth}
          />
          <circle
            className="fill-[#f4f7f7] stroke-[#010304]"
            cx="0"
            cy="0"
            r={shipRadius}
            strokeWidth={shipStrokeWidth}
          />
        </g>
        {visibleContacts.map((contact) => (
          <LocalContactMarker
            contact={contact}
            glyphRadius={contactGlyphRadius}
            hitRadius={contactHitRadius}
            key={contact.contact.id}
            onSelectContact={onSelectContact}
            selected={contact.contact.id === selectedContactId}
            selectionRadius={contactSelectionRadius}
            strokeWidth={contactStrokeWidth}
            vectorLength={vectorLength}
          />
        ))}
      </svg>
    </div>
  )
}

function LocalContactMarker({
  contact,
  glyphRadius,
  hitRadius,
  onSelectContact,
  selected,
  selectionRadius,
  strokeWidth,
  vectorLength,
}: {
  contact: LocalMapContactPosition
  glyphRadius: number
  hitRadius: number
  onSelectContact: (contactId: string) => void
  selected: boolean
  selectionRadius: number
  strokeWidth: number
  vectorLength: number
}) {
  const point = toLocalSvgPoint(contact)
  const directionRadians = degreesToRadians(contact.contact.directionDegrees)
  const vectorEnd = {
    x: point.x + Math.sin(directionRadians) * vectorLength,
    y: point.y - Math.cos(directionRadians) * vectorLength,
  }

  return (
    <g
      aria-label={`Select ${contact.contact.name}`}
      className="group cursor-pointer text-[#b9c0b6] outline-none focus:outline-none"
      data-kind={contact.contact.kind}
      data-selected={selected}
      onClick={() => onSelectContact(contact.contact.id)}
      onKeyDown={(event) =>
        selectLocalContactFromKeyboard(
          event,
          contact.contact.id,
          onSelectContact,
        )
      }
      role="button"
      tabIndex={0}
    >
      <circle
        className="fill-transparent [pointer-events:all]"
        cx={point.x}
        cy={point.y}
        r={hitRadius}
      />
      {selected && (
        <line
          className="stroke-current opacity-75 [stroke-linecap:round]"
          strokeWidth={strokeWidth}
          x1={point.x}
          x2={vectorEnd.x}
          y1={point.y}
          y2={vectorEnd.y}
        />
      )}
      <circle
        className={cx(
          'fill-none stroke-current opacity-0 transition-opacity duration-[140ms] group-hover:opacity-90 group-focus-visible:opacity-90',
          selected && 'opacity-90',
        )}
        cx={point.x}
        cy={point.y}
        r={selectionRadius}
        strokeWidth={strokeWidth}
      />
      <circle
        className="fill-current stroke-[#021010]"
        cx={point.x}
        cy={point.y}
        r={glyphRadius}
        strokeWidth={strokeWidth}
      />
    </g>
  )
}

function selectLocalContactFromKeyboard(
  event: KeyboardEvent<SVGGElement>,
  contactId: string,
  onSelectContact: (contactId: string) => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }

  event.preventDefault()
  onSelectContact(contactId)
}
