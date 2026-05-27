import type { NavigationMode } from './types'

export const navigationModes: Array<{ id: NavigationMode; label: string }> = [
  { id: 'long-range-map', label: 'Sector Map' },
  { id: 'jump-area', label: 'Jump Area' },
  { id: 'local-map', label: 'Local Map' },
]

export const sectorMinimumViewLightYears = 1
export const sectorGridStepLightYears = 1
export const sectorMajorGridStepLightYears = 5
export const jumpAreaMinimumViewLightYears = 0.1
export const jumpAreaGridStepLightYears = 0.1
export const jumpAreaMajorGridStepLightYears = 0.5
export const sectorZoomMultiplier = 1.6
export const localMapMinimumViewRadiusKilometers = 1_000
export const localMapZoomMultiplier = 2
export const lightSpeedKilometersPerSecond = 299_792.458
