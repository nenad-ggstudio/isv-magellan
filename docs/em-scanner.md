
# Anomaly parameters:
- speed + angle
- distortion


# Scanner controls:
- focus
- filter


# Signal parameters:
- Strength
- Coherence
- Drift


# Rules:
Signal are two sinusoid waves, but with distortion and noise. One primary signal and one drift signal.
Increasing focus makes both waves have more equal amplitude which is important for reading speed correctly. Decreasing filter make the waves have same wavelength which is important for reading angle correctly. 
Increasing focus make signal coherence higher. This should be reverse proportional with anomaly distortion value. High distortion and high coherence make even more noise and instability in wave signal. The same goes for Low distortion and low coherence (low focus). 
Lowering filter makes signal have more strenght, but also increases noise and random irregularities in the wave form. Increasing filter removes the noise but the signal's amplitude gets lower (less precise speed measurement).


# Gameplay: 
User will start scanning and play with params as they see fit, when they are ready, they can press the button to take a snapshot and based on their scan, we will create a gizmo on the map that will represent the scan report. User can at any time click on the scan report and see something like this:

├─────────────────────────────────────────────────────────────┤
│ Signal Strength  ███████░░░  71%                            │
│ Coherence        ████░░░░░░  42%                            │
│ Drift Stability  █████░░░░░  55%                            │
│                                                             │
│ Speed: 850m/s    |   Angle: 234                             │
│ Confidence: low-medium                                      │
└─────────────────────────────────────────────────────────────┘

Confidence and scan params accuracy are calculated based on *Rules* section, ideally on 300% total the confidence would be absolute. But lower the accuracy make lower confidence and more error in calculating anomaly speed and angle and distortion. 