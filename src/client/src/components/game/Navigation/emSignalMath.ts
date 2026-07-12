import type { EmScanner } from '../../../gameTypes'

export type EmSignalProfile = NonNullable<
  EmScanner['currentScan']
>['signalProfile']

export type EmSignalControls = {
  filter: number
  focus: number
}

export type EmWaveSettings = {
  baseAmplitude: number
  primaryWavelength: number
  secondWavelength: number
  actualNoiseIntensity: number
  actualNoiseFrequency: number
}

export type RgbColor = {
  r: number
  g: number
  b: number
}

const scannerMaximumNoiseFrequency = 14
const scannerMinimumNoiseIntensity = 20
const scannerMaximumNoiseIntensity = 120
const scannerMinimumWavelength = 80
const scannerMaximumWavelength = 620

export function getEmWaveSettings(
  signalProfile: EmSignalProfile,
  controls: EmSignalControls,
): EmWaveSettings {
  const noiseFactor = getFilterNoiseFactor(
    controls.filter,
    signalProfile.idealFilter,
  )
  const actualNoiseIntensity =
    scannerMinimumNoiseIntensity +
    (scannerMaximumNoiseIntensity - scannerMinimumNoiseIntensity) * noiseFactor

  return {
    baseAmplitude: signalProfile.baseAmplitude,
    primaryWavelength: signalProfile.primaryWavelength,
    secondWavelength: getSecondWavelength(signalProfile, controls.focus),
    actualNoiseIntensity,
    actualNoiseFrequency:
      scannerMaximumNoiseFrequency *
      (actualNoiseIntensity / scannerMaximumNoiseIntensity),
  }
}

export function getSecondWavelength(
  signalProfile: EmSignalProfile,
  focus: number,
) {
  const primaryWavelength = signalProfile.primaryWavelength
  const idealFocus = signalProfile.idealFocus
  let secondWavelength = primaryWavelength

  if (focus < idealFocus) {
    const ratio = (idealFocus - focus) / Math.max(1, idealFocus - 1)
    secondWavelength =
      primaryWavelength +
      (scannerMaximumWavelength - primaryWavelength) * ratio
  } else if (focus > idealFocus) {
    const ratio = (focus - idealFocus) / Math.max(1, 100 - idealFocus)
    secondWavelength =
      primaryWavelength +
      (scannerMinimumWavelength - primaryWavelength) * ratio
  }

  return clamp(
    Math.round(secondWavelength),
    scannerMinimumWavelength,
    scannerMaximumWavelength,
  )
}

export function getFilterNoiseFactor(filter: number, idealFilter: number) {
  const distance = Math.abs(filter - idealFilter)
  const maxDistance = Math.max(idealFilter, 100 - idealFilter)

  return clamp(distance / Math.max(1, maxDistance), 0, 1)
}

export function getInitialPhase(seed: number) {
  return ((seed % 10_000) / 10_000) * Math.PI * 2
}

export function normalizePositivePhase(radians: number) {
  return ((radians % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
}

export function normalizeSignedPhase(radians: number) {
  return Math.atan2(Math.sin(radians), Math.cos(radians))
}

export function signedSeededRandom(value: number) {
  return value * 2 - 1
}

export function mixRgb(
  start: RgbColor,
  end: RgbColor,
  amount: number,
): RgbColor {
  return {
    r: Math.round(start.r + (end.r - start.r) * amount),
    g: Math.round(start.g + (end.g - start.g) * amount),
    b: Math.round(start.b + (end.b - start.b) * amount),
  }
}

export function formatRgb(color: RgbColor) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}
