import { describe, expect, it } from 'vitest'
import {
  formatRgb,
  getEmWaveSettings,
  getFilterNoiseFactor,
  getInitialPhase,
  getSecondWavelength,
  mixRgb,
  normalizePositivePhase,
  normalizeSignedPhase,
  signedSeededRandom,
  type EmSignalProfile,
} from './emSignalMath'

const signalProfile: EmSignalProfile = {
  noiseSeed: 2_500,
  baseStrength: 0.8,
  baseAmplitude: 120,
  primaryWavelength: 320,
  phaseShiftRadians: 0.5,
  idealFilter: 40,
  idealFocus: 60,
  lockState: 'stable-lock',
}

describe('EM signal math', () => {
  it('produces minimum noise at the ideal filter and aligned wavelengths at ideal focus', () => {
    const settings = getEmWaveSettings(signalProfile, {
      filter: signalProfile.idealFilter,
      focus: signalProfile.idealFocus,
    })

    expect(settings.baseAmplitude).toBe(120)
    expect(settings.primaryWavelength).toBe(320)
    expect(settings.secondWavelength).toBe(320)
    expect(settings.actualNoiseIntensity).toBe(20)
    expect(settings.actualNoiseFrequency).toBeCloseTo(7 / 3)
  })

  it('moves the secondary wavelength toward opposite bounds around ideal focus', () => {
    expect(getSecondWavelength(signalProfile, 1)).toBe(620)
    expect(getSecondWavelength(signalProfile, 100)).toBe(80)
  })

  it('normalizes filter error and phase values', () => {
    expect(getFilterNoiseFactor(40, 40)).toBe(0)
    expect(getFilterNoiseFactor(100, 40)).toBe(1)
    expect(getInitialPhase(2_500)).toBeCloseTo(Math.PI / 2)
    expect(normalizePositivePhase(-Math.PI / 2)).toBeCloseTo(Math.PI * 1.5)
    expect(normalizeSignedPhase(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2)
  })

  it('maps seeded values and interpolates display colors deterministically', () => {
    expect(signedSeededRandom(0)).toBe(-1)
    expect(signedSeededRandom(1)).toBe(1)

    const mixed = mixRgb(
      { r: 20, g: 40, b: 60 },
      { r: 100, g: 120, b: 140 },
      0.25,
    )

    expect(mixed).toEqual({ r: 40, g: 60, b: 80 })
    expect(formatRgb(mixed)).toBe('rgb(40, 60, 80)')
  })
})
