# EM Scanner Minigame Specs

## Hidden Anomaly Values

Remove `SensorAnomaly` properties:

- `Distance`
- `Distortion`

Change semantics of following properties:
- `Speed`: integer `1-100`

Introduce two new properties:
- `Mass`: integer `1-100`
- `Energy`: integer `1-100`

These map into wave parameters:

- `Mass -> amplitude`
  - Prototype range: `10-180 px`
  - Formula: `amplitude = lerp(10, 180, (Mass - 1) / 99)`

- `Energy -> wavelength`
  - Prototype range: `80-620 px`
  - Reverse proportional.
  - Higher energy means shorter wavelength.
  - Formula: `wavelength = lerp(620, 80, (Energy - 1) / 99)`

- `speed -> correct phase drift`
  - Internal range: `0-50%` of a full wave.
  - Display range: `0-100%` of a half-wavelength.
  - Formula: `phaseShiftPercent = lerp(0, 50, (Speed - 1) / 99)`
  - Radians used during wave generation:
    - `phaseShiftRadians = (phaseShiftPercent / 100) * 2π`

## Player Controls

### Filter

`Filter` is a player knob from `1-100`, with `0.5` step precision.

Ideal value:

```text
idealFilter = (Mass + Energy) / 2
```

Filter controls actual noise. At the ideal value, noise is minimal. The farther from ideal, the more noise is applied.

Normalize filter error using the larger side of the `0-100` split around the ideal:

```text
distance = abs(filter - idealFilter)
maxDistance = max(idealFilter, 100 - idealFilter)
noiseFactor = clamp(distance / maxDistance, 0, 1)
```

Noise frequency and intensity are derived from scanner tuning limits:

```text
actualNoiseIntensity = minNoiseIntensity + (maxNoiseIntensity - minNoiseIntensity) * noiseFactor
actualNoiseFrequency = maxNoiseFrequency * (actualNoiseIntensity / maxNoiseIntensity)
```

Prototype scanner tuning variables, put them as constants somewhere:

- `maxNoiseFrequency`: 14Hz default value
- `minNoiseIntensity`: 20% default value, `% of original amplitude`
- `maxNoiseIntensity`: 120% default value, `% of original amplitude`
- `minNoiseIntensity < maxNoiseIntensity`

### Focus

`Focus` is a player knob from `1-100`, with `0.5` step precision.

Ideal value:

```text
idealFocus = (speed + energy) / 2
```

Focus controls only the second wave wavelength. It does not directly control color.

Behavior:

- `focus == idealFocus`: second wavelength equals primary wavelength.
- `focus < idealFocus`: second wavelength becomes longer.
- `focus > idealFocus`: second wavelength becomes shorter.

Use the available distance on each side of the ideal so both directions can reach the scanner wavelength bounds:

```text
if focus < idealFocus:
  ratio = (idealFocus - focus) / (idealFocus - 1)
  secondWavelength = primaryWavelength + (maxWavelength - primaryWavelength) * ratio

if focus > idealFocus:
  ratio = (focus - idealFocus) / (100 - idealFocus)
  secondWavelength = primaryWavelength + (minWavelength - primaryWavelength) * ratio

secondWavelength = clamp(round(secondWavelength), minWavelength, maxWavelength)
```

The UI displays:

```text
wavelengthDelta = secondWavelength - primaryWavelength
```

## Wave Generation

The scanner draws two scrolling sine waves. The important rule is that existing wave history must not be recomputed when controls change. New settings only affect samples generated at the right edge of the canvas.

Prototype constants:

```text
sampleSpacing = 2 px
scrollSpeed = 144 px/sec
```

State:

```text
primaryPhase
secondaryPhase
primarySamples[]
secondarySamples[]
scrollRemainder
```

On each animation frame:

1. Add scroll distance:
   - `scrollRemainder += scrollSpeed * elapsedSeconds`
2. While `scrollRemainder >= sampleSpacing`:
   - Remove the oldest sample from both sample arrays.
   - Generate one new sample for both waves.
   - Subtract `sampleSpacing` from `scrollRemainder`.
3. Draw each sample array offset by `-scrollRemainder`.

Primary sample:

```text
primaryY = centerY + sin(primaryPhase) * effectivePrimaryAmplitude
primaryPhase += (2π * sampleSpacing) / primaryWavelength
```

Secondary sample:

```text
secondaryY = centerY + sin(secondaryPhase + phaseShiftRadians) * effectiveSecondaryAmplitude
secondaryPhase += (2π * sampleSpacing) / secondWavelength
```

The `phaseShiftRadians` is the correct/desired phase drift derived from hidden `speed`. It is not a player slider.

## Amplitude Noise

Noise affects only newly generated samples. It does not rewrite wave history.

Noise is amplitude-only. Do not add wavelength noise, because wavelength noise causes uncontrolled phase drift.

Noise pulses:

- Occur at `actualNoiseFrequency` Hz.
- Each pulse has random duration, prototype `180-540 ms`.
- Each pulse gets independent random amplitude offsets for the primary and secondary waves.
- Offsets are based on current base amplitude:

```text
noiseAmount = actualNoiseIntensity / 100
primaryPulseAmplitude = random(-1, 1) * baseAmplitude * noiseAmount
secondaryPulseAmplitude = random(-1, 1) * baseAmplitude * noiseAmount
```

Each pulse fades in/out with a sine envelope:

```text
progress = (now - pulseStartedAt) / pulseDuration
envelope = sin(progress * π)
currentNoise += pulseAmplitude * envelope
```

Effective amplitudes:

```text
effectivePrimaryAmplitude = clamp(baseAmplitude + primaryNoise, 4, canvasHeight * 0.42)
effectiveSecondaryAmplitude = clamp(baseAmplitude + secondaryNoise, 4, canvasHeight * 0.42)
```

## Phase Drift Color Feedback

Wave color is based on measured phase drift between the two wave generators, not directly on Focus.

Focus changes `secondWavelength`, which causes `secondaryPhase` to drift relative to `primaryPhase`. That actual drift determines color.

Measure signed phase error:

```text
phaseError = normalizeSignedPhase(secondaryPhase - primaryPhase)
normalizeSignedPhase(x) = atan2(sin(x), cos(x))
driftAmount = abs(phaseError) / π
```

Color rules:

- Correct phase drift: both waves green.
- If measured drift is larger than correct:
  - primary wave shifts toward purple
  - secondary wave shifts toward red
- If measured drift is shorter than correct:
  - primary wave shifts toward red
  - secondary wave shifts toward purple

Prototype colors:

```text
green  = rgb(61, 220, 132)
purple = rgb(174, 98, 255)
red    = rgb(255, 76, 86)
```

Use RGB interpolation:

```text
displayColor = mix(green, targetColor, driftAmount)
```

Color is a live tint over the full visible line. It is not stored per sample and does not scroll in as history.

## Player-Facing UI

Final player UI should expose:

- `Filter` knob
- `Focus` knob
- Signal quality/confidence meter
- Minimal legend
- Snapshot button

Suggested legend:

- Green: aligned
- Red/purple split: phase drift
- Heavy noise: filter mismatch
- Wavelength spread: focus mismatch

## Confidence And Snapshot

The player should snapshot the signal when it looks stable enough. Snapshot quality should depend on current scanner state, not just exact hidden values.

Suggested confidence contributors:

- Filter closeness:
  - `filterScore = 1 - noiseFactor`
- Focus/phase alignment:
  - `phaseScore = 1 - driftAmount`
- Optional stability hold:
  - Confidence rises while the scanner is stable.
  - Confidence decays when tuning drifts away.

Simple confidence:

```text
confidence = weightedAverage(filterScore, phaseScore)
```

Suggested labels:

- `Unstable`
- `Weak`
- `Readable`
- `Clean`
- `Locked`

Snapshot analysis should produce partial traits, not direct identification:

```text
Mass signature: High
Energy density: Low
Relative motion: Moderate
Signal confidence: 74%
Classification: Inconclusive
Recommended follow-up: Spectral scan
```

Low confidence example:

```text
Signal confidence: 31%
Mass signature: Unreliable
Energy density: Possible high variance
Classification: No stable read
```

## Important Constraints

- Do not expose hidden `mass`, `speed`, or `energy` to the player.
- Do not recompute existing wave history when controls change.
- Do not add wavelength noise.
- Focus affects second wavelength only.
- Filter affects amplitude noise only.
- Color reflects measured phase drift, not Focus value directly.
- Snapshot analysis should provide probabilistic/partial information, not immediate object identity.
