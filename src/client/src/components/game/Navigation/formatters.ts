import type {
  DistanceUnit,
  LocalMapContact,
  StellarSystem,
} from '../../../gameTypes'
import { normalizeDegrees } from './mapMath'

export function formatDistance(value: number, distanceUnit: DistanceUnit) {
  if (distanceUnit === 'lightYear') {
    return `${value.toFixed(value >= 1 ? 2 : 3)} ly`
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)} km`
}

export function formatMapScale(value: number, distanceUnit: DistanceUnit) {
  if (distanceUnit === 'lightYear') {
    return `${value.toFixed(value >= 10 ? 0 : value >= 2 ? 1 : 2)} ly`
  }

  return formatDistance(value, distanceUnit)
}

export function formatSignalAge(seconds: number) {
  const years = seconds / 31_557_600

  if (years >= 1) {
    return `${years.toFixed(2)} yr ago`
  }

  const days = seconds / 86_400

  if (days >= 1) {
    return `${days.toFixed(1)} d ago`
  }

  if (seconds >= 1) {
    return `${seconds.toFixed(1)} s ago`
  }

  return `${Math.max(1, Math.round(seconds * 1000))} ms ago`
}

export function formatResourceEstimate({
  label,
  maximum,
  minimum,
}: LocalMapContact['resourceEstimates'][number]) {
  if (minimum === 0 && maximum === 0) {
    return 'none'
  }

  return `${label} ${Math.round(minimum * 100)}-${Math.round(maximum * 100)}%`
}

export function formatSpeed(kilometersPerSecond: number) {
  if (kilometersPerSecond >= 1) {
    return `${kilometersPerSecond.toFixed(2)} km/s`
  }

  return `${Math.round(kilometersPerSecond * 1_000)} m/s`
}

export function formatDirection(degrees: number) {
  const normalizedDegrees = normalizeDegrees(degrees)

  return `${Math.round(normalizedDegrees)} deg ${formatCardinalDirection(
    normalizedDegrees,
  )}`
}

function formatCardinalDirection(degrees: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(degrees / 45) % directions.length

  return directions[index]
}

export function formatCoordinates(x: number, y: number) {
  return `${formatSignedDistance(x)} x, ${formatSignedDistance(y)} y`
}

function formatSignedDistance(value: number) {
  const prefix = value >= 0 ? '+' : '-'

  return `${prefix}${formatDistance(Math.abs(value), 'kilometer')}`
}

export function formatResourceName(resource: string) {
  return resource.charAt(0).toUpperCase() + resource.slice(1)
}

export function formatStarSize(starSizeSolarRadii: number) {
  return `${starSizeSolarRadii.toFixed(2)} solar radii`
}

export function getSpectralType(starType: string) {
  const spectralType = starType.charAt(0).toLowerCase()

  if (
    spectralType === 'o' ||
    spectralType === 'b' ||
    spectralType === 'a' ||
    spectralType === 'f' ||
    spectralType === 'g' ||
    spectralType === 'k' ||
    spectralType === 'm'
  ) {
    return spectralType
  }

  return 'unknown'
}

export function formatSystemRole(role: StellarSystem['role']) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function formatElapsed(elapsedMilliseconds: number) {
  const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000)
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
