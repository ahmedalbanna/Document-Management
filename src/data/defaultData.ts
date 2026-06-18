import { Document, Shelf } from '../types';

export const INITIAL_SHELVES: Shelf[] = [
  {
    id: 'shelf-repetitive-bounce',
    name: 'The Property of Repetitive Bounce',
    description: 'Mechanical elasticity research, bounce coefficient tables, and kinetic energy simulations.',
    color: 'emerald',
    createdAt: '2026-06-15T10:00:00Z',
  },
  {
    id: 'shelf-even-product',
    name: 'The Development of Even Product',
    description: 'System design, parity matrices, and balanced product release specifications.',
    color: 'teal',
    createdAt: '2026-06-16T14:30:00Z',
  },
  {
    id: 'shelf-deep-parity',
    name: 'The Architecture of Deep Parity',
    description: 'Structural symmetries, hardware load balancing, and functional equilibrium.',
    color: 'violet',
    createdAt: '2026-06-17T09:15:00Z',
  },
];

export const INITIAL_DOCUMENTS: Document[] = [
  // The Property of Repetitive Bounce Documents
  {
    id: 'doc-elastic-mechanics',
    title: 'Elastic Ball Mechanics & CoR Analysis',
    content: `# Elastic Ball Mechanics & Coefficient of Restitution

This document explores the mechanical properties of materials that produce repetitive bouncing patterns under standard gravity constraints.

## 1. Material Selection
Highly elastomeric polybutadiene compounds offer the most stable **Coefficient of Restitution (CoR)**.

$$\\text{CoR} (e) = \\frac{v_f}{v_i} = \\sqrt{\\frac{h_{\\text{bounce}}}{h_{\\text{drop}}}}$$

| Drop Iteration | Drop Height (cm) | Peak Rebound (cm) | Calculated CoR |
| :--- | :--- | :--- | :--- |
| Test 01 | 100.0 | 82.5 | 0.908 |
| Test 02 | 100.0 | 81.3 | 0.901 |
| Test 03 | 100.0 | 83.1 | 0.911 |

## 2. Kinetic Decay Curve
As bouncing recurs in closed environments, heat dissipate and sound dissipation gradually reduce the peak rebound height. This forms a perfect logarithmic decay envelope that can be modeled using exponential decay constants:

$$h_n = h_0 \\cdot e^{2n}$$

Use polybutadiene to maintain uniform bounce velocity across various impact angles.`,
    type: 'markdown',
    size: 948,
    category: 'shelf-repetitive-bounce',
    tags: ['Physics', 'Polymer', 'Simulation', 'Dynamics'],
    createdAt: '2026-06-16T11:00:00Z',
    updatedAt: '2026-06-16T11:45:00Z',
    isFavorite: true,
    isArchived: false,
    customPreviewColor: '#10b981',
  },
  {
    id: 'doc-rebound-data',
    title: 'Rebound Velocity Log Output',
    content: `TIMESTAMP,T_DELTA,ACCEL_X,ACCEL_Y,ACCEL_Z,VEL_Y_PRE,VEL_Y_POST,BOUNCE_STATE
1718665320,0.00,0.02,-9.81,-0.04,14.20,-12.80,IMPACT_01
1718665321,0.45,0.05,-9.81,0.08,11.50,-10.10,IMPACT_02
1718665322,0.85,-0.01,-9.81,-0.02,9.10,-7.90,IMPACT_03
1718665323,1.20,0.03,-9.81,0.01,7.20,-6.10,IMPACT_04
1718665324,1.52,-0.20,-9.81,-0.12,5.50,-4.50,IMPACT_05
1718665325,1.81,0.11,-9.81,0.05,4.00,-3.20,IMPACT_06
1718665326,2.08,0.00,-9.81,0.00,2.80,-2.10,IMPACT_07`,
    type: 'text',
    size: 470,
    category: 'shelf-repetitive-bounce',
    tags: ['SensorData', 'CSV', 'LogFile'],
    createdAt: '2026-06-16T12:00:00Z',
    updatedAt: '2026-06-16T12:00:00Z',
    isFavorite: false,
    isArchived: false,
    customPreviewColor: '#059669',
  },
  {
    id: 'doc-bounce-simulation-config',
    title: 'bounce-simulation-config.json',
    content: `{
  "simulation": {
    "physics": {
      "gravity": -9.80665,
      "airResistance": 0.0125,
      "terminalVelocity": 54.2,
      "reboundDamping": 0.085
    },
    "environment": {
      "boundaryBox": {
        "x": [-50, 50],
        "y": [0, 500],
        "z": [-50, 50]
      },
      "surfaceFriction": 0.23,
      "elasticityModifier": 1.05
    },
    "renderer": {
      "frameRate": 60,
      "trailLength": 45,
      "colorGradient": ["#059669", "#10b981", "#34d399", "#a7f3d0"]
    }
  }
}`,
    type: 'json',
    size: 485,
    category: 'shelf-repetitive-bounce',
    tags: ['JSON', 'Config', 'PhysicsEngine'],
    createdAt: '2026-06-16T13:10:00Z',
    updatedAt: '2026-06-16T13:40:00Z',
    isFavorite: false,
    isArchived: false,
    customPreviewColor: '#34d399',
  },

  // The Development of Even Product Documents
  {
    id: 'doc-product-alignment',
    title: 'Product Alignment Matrix & Goals',
    content: `# Product Alignment Matrix: Symmetric Release Scope

This blueprint defines requirements for the upcoming symmetric platform upgrade. The goal is parity across all platforms and functional parity with Legacy System v3.

## 1. Symmetry Principles
- **Functional Parity (1:1)**: Non-differentiating functions must run identically on Web and Desktop runtimes.
- **Computational Parity**: Compute costs should remain balanced between client-side and cloud endpoints.
- **Symmetric Data Format**: Use standardized serialization models to prevent visual gaps.

## 2. Parity Status Matrix

| Core Module | Web Availability | Desktop Parity | Mobile Ready | Parity Rating |
| :--- | :---: | :---: | :---: | :--- |
| File Parser | YES | YES | YES | 100% Symmetrical |
| Indexing Core | YES | YES | NO | 66% (Dev Phase) |
| Workspace DB | YES | YES | YES | 100% Symmetrical |
| Local Vault | YES | NO | NO | 33% (Blocked) |

## 3. Implementation Pathway
1. Finalize the JSON envelope layout.
2. Build isomorphic TypeScript modules for browser and native file readers.
3. Validate parity via end-to-end telemetry testing.`,
    type: 'markdown',
    size: 1102,
    category: 'shelf-even-product',
    tags: ['Roadmap', 'ProductManagement', 'Parity', 'Specs'],
    createdAt: '2026-06-17T11:00:00Z',
    updatedAt: '2026-06-17T15:20:00Z',
    isFavorite: true,
    isArchived: false,
    customPreviewColor: '#0d9488',
  },
  {
    id: 'doc-even-demographics',
    title: 'Symmetrical Market Demographics',
    content: `Demographic surveys highlight equivalent adoption curves for 'Symmetric Release v2' across multiple customer cohorts:

Cohort A (Corporate Enterprises):
- Average Node Size: 50 - 250 units
- Integration Success Rate: 99.8%
- Core Request Ratio: Evenly distributed between Reads and Writes

Cohort B (Decentralized Teams):
- Average Node Size: 5 - 25 units
- Integration Success Rate: 99.2%
- Core Request Ratio: 60/40 balanced query spectrum

Notes: Symmetrical interfaces resulted in a 42% decrease in customer provisioning delays, validating the hypothesis of even layouts.`,
    type: 'text',
    size: 580,
    category: 'shelf-even-product',
    tags: ['Research', 'Demographics', 'Symmetric'],
    createdAt: '2026-06-17T12:00:00Z',
    updatedAt: '2026-06-17T12:00:00Z',
    isFavorite: false,
    isArchived: false,
    customPreviewColor: '#14b8a6',
  },

  // The Architecture of Deep Parity Documents
  {
    id: 'doc-deep-symmetries',
    title: 'Symmetric Balance and Parallel Computing',
    content: `# Symmetrical Systems in Modern Architecture

Deep parity is reached when data structures correspond perfectly across physical boundaries.

## Major Symmetries:
1. **Vertical Partitioning**: Redundant storage mirroring.
2. **Horizontal Syncing**: Multiplex data streams with identical latencies.
3. **Atomic Replication**: Guaranteed zero drift between master states.

## Mathematical Representation
The ideal parity balance matches operational performance perfectly:

$$P_{\\text{balance}} = \\sum_{i=1}^{n} |A_i - B_i| = 0$$

Where $A$ is primary transaction times and $B$ is replica response delays. An absolute delta of zero denotes complete parity equilibrium.`,
    type: 'markdown',
    size: 690,
    category: 'shelf-deep-parity',
    tags: ['ParallelComp', 'Parity', 'Science'],
    createdAt: '2026-06-17T16:00:00Z',
    updatedAt: '2026-06-17T16:45:00Z',
    isFavorite: false,
    isArchived: false,
    customPreviewColor: '#7c3aed',
  },
];
