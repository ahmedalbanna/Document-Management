import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Activity, 
  Zap, 
  RefreshCw, 
  Layers, 
  Globe, 
  Laptop, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  Save,
  ArrowRightLeft
} from 'lucide-react';
import { Document } from '../types';

interface MicroSimulatorProps {
  document: Document;
  onClose: () => void;
  onUpdateContent?: (newContent: string) => void;
}

export default function MicroSimulator({
  document,
  onClose,
  onUpdateContent,
}: MicroSimulatorProps) {
  // Determine simulator type based on document's shelf (category)
  const category = document.category;
  const isBounce = category === 'shelf-repetitive-bounce';
  const isParity = category === 'shelf-deep-parity';
  const isEvenProduct = category === 'shelf-even-product';

  // ---------------------------------------------------------------------------
  // 1. BOUNCE MECHANICS SIMULATION STATE
  // ---------------------------------------------------------------------------
  const [gravity, setGravity] = useState<number>(9.8);
  const [reboundDamping, setReboundDamping] = useState<number>(0.15); // e = 1 - damping
  const [airResistance, setAirResistance] = useState<number>(0.012);
  const [ballColor, setBallColor] = useState<string>('#10b981');
  const [isBounceRunning, setIsBounceRunning] = useState<boolean>(true);
  const [bounceCount, setBounceCount] = useState<number>(0);
  const [lastImpactVel, setLastImpactVel] = useState<number>(0);
  const [heightHistory, setHeightHistory] = useState<number[]>([]);
  const [hasExportedConfig, setHasExportedConfig] = useState<boolean>(false);

  const bounceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bounceAnimRef = useRef<number | null>(null);
  const physicsStateRef = useRef({
    x: 100,
    y: 50,
    vx: 3.5,
    vy: 0,
    radius: 12,
    trail: [] as { x: number; y: number; opacity: number }[],
    ripples: [] as { x: number; y: number; progress: number; maxRadius: number }[],
  });

  // Load Initial JSON Configuration if available
  useEffect(() => {
    if (isBounce) {
      try {
        const parsed = JSON.parse(document.content);
        if (parsed.simulation?.physics) {
          const phys = parsed.simulation.physics;
          if (typeof phys.gravity === 'number') setGravity(Math.abs(phys.gravity));
          if (typeof phys.reboundDamping === 'number') setGravity(Math.abs(phys.gravity));
          if (typeof phys.reboundDamping === 'number') setReboundDamping(phys.reboundDamping);
          if (typeof phys.airResistance === 'number') setAirResistance(phys.airResistance);
        }
        if (parsed.simulation?.renderer?.colorGradient) {
          setBallColor(parsed.simulation.renderer.colorGradient[0] || '#10b981');
        }
      } catch (e) {
        // Fallback to default
      }
    }
  }, [document.content, isBounce]);

  // Export updated parameters back to JSON config in editor
  const handleExportBounceConfig = () => {
    if (!onUpdateContent) return;
    try {
      let currentJSON = {};
      try {
        currentJSON = JSON.parse(document.content);
      } catch (e) {
        // use default structure if not parseable
      }

      const updatedJSON = {
        ...currentJSON,
        simulation: {
          ...(currentJSON as any).simulation,
          physics: {
            gravity: -Math.abs(gravity),
            airResistance,
            terminalVelocity: 54.2,
            reboundDamping,
          },
          renderer: {
            ...(currentJSON as any).simulation?.renderer,
            colorGradient: [ballColor, '#10b981', '#34d399', '#a7f3d0'],
          }
        }
      };

      onUpdateContent(JSON.stringify(updatedJSON, null, 2));
      setHasExportedConfig(true);
      setTimeout(() => setHasExportedConfig(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. DEEP PARITY SYSTEM SIMULATION STATE
  // ---------------------------------------------------------------------------
  const [dispatchRate, setDispatchRate] = useState<number>(3); // packets per second
  const [jitter, setJitter] = useState<number>(15); // random network latency variance in ms
  const [capacityA, setCapacityA] = useState<number>(45); // base latency Node A (ms)
  const [capacityB, setCapacityB] = useState<number>(45); // base latency Node B (ms)
  const [isParityRunning, setIsParityRunning] = useState<boolean>(true);
  const [activeSpike, setActiveSpike] = useState<boolean>(false);
  const [syncFlasher, setSyncFlasher] = useState<boolean>(false);

  // Stats arrays
  const [driftHistory, setDriftHistory] = useState<number[]>([0, 1, 0, 2, 0, 1, 0]);
  const [packetsProcessed, setPacketsProcessed] = useState<number>(0);
  const [lastDelays, setLastDelays] = useState<{ a: number; b: number; diff: number }>({ a: 45, b: 45, diff: 0 });

  const parityAnimRef = useRef<number | null>(null);
  const parityStateRef = useRef({
    packets: [] as Array<{
      id: string;
      x: number;
      y: number;
      targetY: number;
      phase: 'dispatching' | 'routing' | 'node-a' | 'node-b' | 'reconciling';
      progress: number; // 0 to 1
      node: 'A' | 'B';
      delay: number;
    }>,
    nodeAFlash: false,
    nodeBFlash: false,
    lastDispatchTime: 0,
  });

  // ---------------------------------------------------------------------------
  // 3. EVEN PRODUCT PARITY RELEASE STATE
  // ---------------------------------------------------------------------------
  // Checkboxes for platforms for each modules
  const [productReleaseState, setProductReleaseState] = useState({
    fileParser: { web: true, desktop: true, mobile: true },
    indexingCore: { web: true, desktop: true, mobile: false },
    workspaceDb: { web: true, desktop: true, mobile: true },
    localVault: { web: true, desktop: false, mobile: false },
  });
  const [showDeploymentCelebration, setShowDeploymentCelebration] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // PHYSICS ENGINE LOOP (Bounce Mechanics)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isBounce || !isBounceRunning) return;

    const canvas = bounceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions
    const width = canvas.width;
    const height = canvas.height;
    const floorY = height - 30;

    const p = physicsStateRef.current;

    const updatePhysics = () => {
      // Gravity acceleration
      p.vy += (gravity * 0.12);

      // Air resistance
      p.vx *= (1 - airResistance * 0.1);
      p.vy *= (1 - airResistance * 0.1);

      // Position step
      p.x += p.vx;
      p.y += p.vy;

      // Wall collision (Left/Right)
      if (p.x - p.radius < 15) {
        p.x = 15 + p.radius;
        p.vx = -p.vx * (1 - reboundDamping);
        p.ripples.push({ x: 15, y: p.y, progress: 0, maxRadius: 20 });
      } else if (p.x + p.radius > width - 15) {
        p.x = width - 15 - p.radius;
        p.vx = -p.vx * (1 - reboundDamping);
        p.ripples.push({ x: width - 15, y: p.y, progress: 0, maxRadius: 20 });
      }

      // Floor collision
      if (p.y + p.radius >= floorY) {
        p.y = floorY - p.radius;
        const speed = Math.abs(p.vy);
        p.vy = -p.vy * (1 - reboundDamping);

        if (speed > 1.2) {
          setBounceCount(prev => prev + 1);
          setLastImpactVel(parseFloat(speed.toFixed(1)));
          p.ripples.push({ x: p.x, y: floorY, progress: 0, maxRadius: 35 });
        } else {
          // Stop bouncing if kinetic energy decay wraps below threshold
          p.vy = 0;
          if (Math.abs(p.vx) < 0.1) p.vx = 0;
        }
      }

      // Record trail
      p.trail.push({ x: p.x, y: p.y, opacity: 1.0 });
      if (p.trail.length > 32) p.trail.shift();
      p.trail.forEach(t => { t.opacity -= 0.035; });

      // Update ripples
      p.ripples.forEach(r => { r.progress += 0.08; });
      p.ripples = p.ripples.filter(r => r.progress < 1);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background grid lines
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw chamber border walls
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(15, 10, width - 30, floorY - 10);

      // Floor marker
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(15, floorY, width - 30, 20);
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(15, floorY);
      ctx.lineTo(width - 15, floorY);
      ctx.stroke();

      // Draw Ripples (impact shockwaves)
      p.ripples.forEach(r => {
        ctx.strokeStyle = `rgba(16, 185, 129, ${1 - r.progress})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.progress * r.maxRadius, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Draw Motion Trail
      p.trail.forEach((t, i) => {
        if (t.opacity <= 0) return;
        ctx.fillStyle = `rgba(16, 185, 129, ${t.opacity * 0.18})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.radius * (0.4 + (i / p.trail.length) * 0.6), 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw bouncing ball
      ctx.fillStyle = ballColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent'; // reset

      // Draw a sleek inner reflection ring
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(p.x - 3, p.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    };

    const loop = () => {
      updatePhysics();
      draw();
      bounceAnimRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (bounceAnimRef.current) cancelAnimationFrame(bounceAnimRef.current);
    };
  }, [isBounce, isBounceRunning, gravity, reboundDamping, airResistance, ballColor]);

  // Keep height recording for chart logs
  useEffect(() => {
    if (!isBounce || !isBounceRunning) return;
    const interval = setInterval(() => {
      const p = physicsStateRef.current;
      const heightVal = Math.max(0, 270 - p.y); // inverted floor offset
      setHeightHistory(prev => {
        const next = [...prev, heightVal];
        return next.slice(-40); // keep last 40 frames
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isBounce, isBounceRunning]);

  const resetBounceBall = () => {
    const p = physicsStateRef.current;
    p.x = 80 + Math.random() * 120;
    p.y = 40;
    p.vx = 2.5 + Math.random() * 3.5;
    p.vy = 0;
    p.trail = [];
    p.ripples = [];
    setBounceCount(0);
    setLastImpactVel(0);
    setHeightHistory([]);
  };

  // ---------------------------------------------------------------------------
  // FLOW PIPELINE ANIMATION (Deep Parity Parallel Computing)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isParity || !isParityRunning) return;

    const p = parityStateRef.current;
    let nextPacketId = 1;

    const loop = (timestamp: number) => {
      const dispatchInterval = 1000 / dispatchRate;

      // 1. Dispatch Packets
      if (timestamp - p.lastDispatchTime > dispatchInterval) {
        p.lastDispatchTime = timestamp;

        const nodeTarget = Math.random() > 0.5 ? 'A' : 'B';
        const baseLatency = nodeTarget === 'A' ? capacityA : capacityB;
        const randomJitter = (Math.random() - 0.5) * jitter * (activeSpike && nodeTarget === 'B' ? 4 : 1);
        const actualLatency = Math.max(5, Math.round(baseLatency + randomJitter));

        p.packets.push({
          id: `pkt-${nextPacketId++}-${Date.now()}`,
          x: 40,
          y: 110,
          targetY: nodeTarget === 'A' ? 55 : 165,
          phase: 'dispatching',
          progress: 0,
          node: nodeTarget,
          delay: actualLatency,
        });
      }

      // 2. Advance active packets along pipes
      p.packets.forEach(pkt => {
        pkt.progress += 0.018; // Speed of propagation along coordinates

        if (pkt.phase === 'dispatching') {
          // Travel from Client (40, 110) to Load Balancer (210, 110)
          pkt.x = 40 + (210 - 40) * Math.min(1, pkt.progress * 2);
          if (pkt.progress >= 0.5) {
            pkt.phase = 'routing';
          }
        } else if (pkt.phase === 'routing') {
          // Split down from Load Balancer (210, 110) to Nodes (380, 55 or 165)
          const routeProgress = (pkt.progress - 0.5) * 2; // scale 0 to 1
          pkt.x = 210 + (380 - 210) * routeProgress;
          pkt.y = 110 + (pkt.targetY - 110) * routeProgress;

          if (pkt.progress >= 1.0) {
            pkt.phase = pkt.node === 'A' ? 'node-a' : 'node-b';
            pkt.progress = 0; // reset progress for processing stage
          }
        } else if (pkt.phase === 'node-a' || pkt.phase === 'node-b') {
          // Processing flash triggers
          if (pkt.node === 'A') p.nodeAFlash = true;
          else p.nodeBFlash = true;

          // Packet lands in system sink. Complete transaction.
          pkt.phase = 'reconciling';
        }
      });

      // Handle completions
      const completed = p.packets.filter(pkt => pkt.phase === 'reconciling');
      if (completed.length > 0) {
        completed.forEach(pkt => {
          setPacketsProcessed(prev => prev + 1);

          // Update current sync logs
          setLastDelays(prev => {
            const aVal = pkt.node === 'A' ? pkt.delay : prev.a;
            const bVal = pkt.node === 'B' ? pkt.delay : prev.b;
            const diffVal = Math.abs(aVal - bVal);

            // Record drift tracking
            setDriftHistory(dh => {
              const next = [...dh, diffVal];
              return next.slice(-25);
            });

            return { a: aVal, b: bVal, diff: diffVal };
          });
        });

        // Clear completed from queue
        p.packets = p.packets.filter(pkt => pkt.phase !== 'reconciling');
      }

      // Reset node flash timers
      setTimeout(() => { p.nodeAFlash = false; p.nodeBFlash = false; }, 80);

      parityAnimRef.current = requestAnimationFrame(loop);
    };

    parityAnimRef.current = requestAnimationFrame(loop);

    return () => {
      if (parityAnimRef.current) cancelAnimationFrame(parityAnimRef.current);
    };
  }, [isParity, isParityRunning, dispatchRate, jitter, capacityA, capacityB, activeSpike]);

  // Handle sudden spike
  const triggerSpike = () => {
    setActiveSpike(true);
    setTimeout(() => {
      setActiveSpike(false);
    }, 4500);
  };

  // Re-synchronize load balancers
  const triggerResync = () => {
    setSyncFlasher(true);
    setCapacityA(45);
    setCapacityB(45);
    setJitter(5);
    setDriftHistory([0, 0, 0, 0, 0]);
    setLastDelays({ a: 45, b: 45, diff: 0 });
    setTimeout(() => setSyncFlasher(false), 1200);
  };

  // ---------------------------------------------------------------------------
  // EVEN PRODUCT SYMMETRY RATING CALCULATION
  // ---------------------------------------------------------------------------
  const getProductParityRating = () => {
    const totalSlots = 12; // 4 modules * 3 platforms
    let enabledSlots = 0;

    Object.values(productReleaseState).forEach((platforms: any) => {
      if (platforms.web) enabledSlots++;
      if (platforms.desktop) enabledSlots++;
      if (platforms.mobile) enabledSlots++;
    });

    const percent = Math.round((enabledSlots / totalSlots) * 100);
    return percent;
  };

  const toggleProductPlatform = (module: keyof typeof productReleaseState, platform: 'web' | 'desktop' | 'mobile') => {
    setProductReleaseState(prev => {
      const modState = { ...prev[module] };
      modState[platform] = !modState[platform];
      return {
        ...prev,
        [module]: modState
      };
    });
  };

  const deployEvenProduct = () => {
    const rating = getProductParityRating();
    if (rating === 100) {
      setShowDeploymentCelebration(true);
      setTimeout(() => setShowDeploymentCelebration(false), 5000);
    } else {
      alert(`Asymmetric Release Blocked! Your platform parity is currently ${rating}%. A fully symmetrical 100% is required to resolve even release guidelines!`);
    }
  };

  return (
    <motion.div
      id="simulator-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 select-none"
    >
      <motion.div
        id="simulator-content-box"
        initial={{ scale: 0.96, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 15 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header Section */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center ${
              isBounce ? 'bg-emerald-600' : isParity ? 'bg-violet-600' : 'bg-teal-600'
            }`}>
              {isBounce ? <Activity className="h-5 w-5" /> : isParity ? <ArrowRightLeft className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
            </div>
            <div>
              <span className={`text-[10px] font-extrabold uppercase tracking-widest leading-none ${
                isBounce ? 'text-emerald-600' : isParity ? 'text-violet-600' : 'text-teal-600'
              }`}>
                Live Playground Micro-Simulator
              </span>
              <h2 className="text-base font-bold text-gray-800 leading-none mt-1">
                {document.title}
              </h2>
            </div>
          </div>
          <button
            id="close-simulator"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200/60 rounded-xl text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic Simulator Workspace Grid */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 min-h-0">
          
          {/* LEFT COLUMN: The Visualizer Arena (Canvas/Interactive charts) */}
          <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-gray-50/50 [scrollbar-width:thin]">
            
            {/* 1. BOUNCE PHYSICS SIMULATOR */}
            {isBounce && (
              <div className="flex-grow flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-emerald-500" /> Chamber Kinetic Arena
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      id="toggle-bounce-running"
                      onClick={() => setIsBounceRunning(!isBounceRunning)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold shadow-xs cursor-pointer flex items-center gap-1 ${
                        isBounceRunning ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isBounceRunning ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                      {isBounceRunning ? 'Pause Engine' : 'Resume Engine'}
                    </button>
                    <button
                      id="reset-bounce"
                      onClick={resetBounceBall}
                      className="p-1 bg-white hover:bg-gray-100 text-gray-500 rounded-lg border border-gray-200 cursor-pointer shadow-xs"
                      title="Reset Ball Location"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Canvas Container */}
                <div className="relative h-64 bg-white rounded-2xl border border-gray-200/80 shadow-inner flex items-center justify-center overflow-hidden">
                  <canvas 
                    ref={bounceCanvasRef} 
                    width={480} 
                    height={256} 
                    className="w-full h-full block"
                  />
                  
                  {/* Floating Analytics overlays */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1 font-mono text-[10px] text-gray-500 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-gray-200/50 shadow-xs leading-none">
                    <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Real-time Telemetry</span>
                    <span>Bounces: <strong className="text-emerald-600 font-bold">{bounceCount}</strong></span>
                    <span>Last Rebound Speed: <strong className="text-emerald-600 font-bold">{lastImpactVel || '0.0'} m/s</strong></span>
                  </div>
                </div>

                {/* Live Real-time Wave chart (Height vs Time) */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 flex flex-col gap-1.5 shadow-xs">
                  <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider font-mono">Decay Envelope (h vs t)</span>
                  <div className="h-20 flex items-end gap-[2px] pt-4 font-mono select-none">
                    {heightHistory.length === 0 ? (
                      <span className="text-[10px] text-gray-300 italic m-auto pb-4">Waiting for engine triggers...</span>
                    ) : (
                      heightHistory.map((h, hidx) => {
                        const percent = Math.min(100, Math.max(5, (h / 240) * 100));
                        return (
                          <div 
                            key={hidx} 
                            style={{ height: `${percent}%` }}
                            className="flex-1 bg-emerald-500/20 hover:bg-emerald-500 border-t border-emerald-500 transition-colors"
                            title={`Height: ${Math.round(h)} units`}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. DEEP PARITY SYSTEM SIMULATOR */}
            {isParity && (
              <div className="flex-grow flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-violet-500 animate-pulse" /> Multiplex Load pipeline
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      id="toggle-parity"
                      onClick={() => setIsParityRunning(!isParityRunning)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold shadow-xs cursor-pointer flex items-center gap-1 ${
                        isParityRunning ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-violet-600 hover:bg-violet-700 text-white'
                      }`}
                    >
                      {isParityRunning ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                      {isParityRunning ? 'Pause System' : 'Resume System'}
                    </button>
                    <button
                      id="resync-parity-btn"
                      onClick={triggerResync}
                      className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 cursor-pointer shadow-xs text-[11px] font-bold flex items-center gap-1"
                      title="Atomic Reconciliation Sync"
                    >
                      <RefreshCw className={`h-3 w-3 ${syncFlasher ? 'animate-spin' : ''}`} />
                      Reset Parity
                    </button>
                  </div>
                </div>

                {/* Animated Flow Layout */}
                <div className="relative h-[220px] bg-gray-950 rounded-2xl border border-gray-800 shadow-inner overflow-hidden select-none">
                  
                  {/* Sync Flasher overlay alert */}
                  <AnimatePresence>
                    {syncFlasher && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-violet-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20 text-violet-200 font-mono"
                      >
                        <RefreshCw className="h-8 w-8 animate-spin text-violet-400" />
                        <span className="text-xs font-extrabold uppercase tracking-widest">ATOMIC RECONCILIATION IN PROCESS</span>
                        <span className="text-[10px] text-violet-300">Setting operational performance delta |A - B| = 0</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Nodes diagram wires background */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Input wire */}
                    <line x1="40" y1="110" x2="210" y2="110" stroke="#1f2937" strokeWidth="4" />
                    {/* Node A route */}
                    <path d="M 210,110 L 210,55 L 380,55" fill="none" stroke="#1f2937" strokeWidth="4" />
                    {/* Node B route */}
                    <path d="M 210,110 L 210,165 L 380,165" fill="none" stroke="#1f2937" strokeWidth="4" />

                    {/* Animated laser dashes on the active wires */}
                    {isParityRunning && (
                      <>
                        <line x1="40" y1="110" x2="210" y2="110" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="4" strokeDasharray="10, 15" strokeDashoffset={-Date.now() / 25} />
                        <path d="M 210,110 L 210,55 L 380,55" fill="none" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="4" strokeDasharray="10, 15" strokeDashoffset={-Date.now() / 20} />
                        <path d="M 210,110 L 210,165 L 380,165" fill="none" stroke={activeSpike ? "rgba(239, 68, 68, 0.4)" : "rgba(139, 92, 246, 0.4)"} strokeWidth="4" strokeDasharray="10, 15" strokeDashoffset={-Date.now() / 20} />
                      </>
                    )}
                  </svg>

                  {/* Component 1: Client Node */}
                  <div className="absolute left-3 top-[80px] flex flex-col items-center select-none font-mono text-[9px] text-gray-500">
                    <div className="h-14 w-14 bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-300">
                      <Laptop className="h-5 w-5 text-indigo-400" />
                      <span className="font-bold">CLIENT</span>
                    </div>
                  </div>

                  {/* Component 2: Load Balancer */}
                  <div className="absolute left-[180px] top-[80px] flex flex-col items-center font-mono text-[9px] text-gray-500">
                    <div className="h-14 w-14 bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center gap-1 text-indigo-400 animate-pulse">
                      <Zap className="h-5 w-5" />
                      <span className="font-extrabold text-[8px]">LOAD BAL</span>
                    </div>
                  </div>

                  {/* Component 3: Node A (Primary Database Node) */}
                  <div className="absolute right-12 top-[25px] flex items-center gap-2 select-none font-mono">
                    <div className={`h-14 w-28 rounded-xl border flex flex-col justify-center px-3 leading-tight transition-all bg-gray-900 ${
                      parityStateRef.current.nodeAFlash 
                        ? 'border-violet-500 shadow-lg shadow-violet-500/20 scale-102' 
                        : 'border-gray-800'
                    }`}>
                      <span className="text-[9px] font-extrabold text-violet-400">NODE_A [Primary]</span>
                      <span className="text-[8px] text-gray-400 mt-1">Cap: <strong className="text-gray-200">{capacityA}ms</strong></span>
                      <span className="text-[8px] text-gray-400">Processed: <strong className="text-gray-200">{Math.round(packetsProcessed / 2)}</strong></span>
                    </div>
                    <div className={`h-2.5 w-2.5 rounded-full ${parityStateRef.current.nodeAFlash ? 'bg-violet-400 animate-ping' : 'bg-gray-850'}`} />
                  </div>

                  {/* Component 4: Node B (Replica Node) */}
                  <div className="absolute right-12 top-[135px] flex items-center gap-2 select-none font-mono">
                    <div className={`h-14 w-28 rounded-xl border flex flex-col justify-center px-3 leading-tight transition-all bg-gray-900 ${
                      parityStateRef.current.nodeBFlash 
                        ? (activeSpike ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-violet-500 shadow-lg shadow-violet-500/20')
                        : 'border-gray-800'
                    }`}>
                      <span className={`text-[9px] font-extrabold ${activeSpike ? 'text-red-400 animate-pulse' : 'text-violet-400'}`}>
                        NODE_B [Replica] {activeSpike ? '(LAG)' : ''}
                      </span>
                      <span className="text-[8px] text-gray-400 mt-1">Cap: <strong className={activeSpike ? "text-red-400 font-bold" : "text-gray-200"}>{capacityB * (activeSpike ? 4 : 1)}ms</strong></span>
                      <span className="text-[8px] text-gray-400">Processed: <strong className="text-gray-200">{Math.floor(packetsProcessed / 2)}</strong></span>
                    </div>
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      parityStateRef.current.nodeBFlash 
                        ? (activeSpike ? 'bg-red-500 animate-pulse' : 'bg-violet-400 animate-ping') 
                        : 'bg-gray-850'
                    }`} />
                  </div>

                  {/* Visual packets traveling in real time */}
                  {isParityRunning && parityStateRef.current.packets.map((pkt) => (
                    <div
                      key={pkt.id}
                      style={{ left: `${pkt.x}px`, top: `${pkt.y}px`, transform: 'translate(-50%, -50%)' }}
                      className={`absolute h-3 w-3 rounded-full flex items-center justify-center font-mono font-bold text-[7px] text-white transition-transform duration-75 shadow-[0_0_8px_rgba(139,92,246,0.5)] ${
                        pkt.node === 'B' && activeSpike ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-violet-500'
                      }`}
                    >
                      P
                    </div>
                  ))}

                  {/* Jitter Warning banner */}
                  <AnimatePresence>
                    {activeSpike && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-3 left-3 bg-red-950/90 border border-red-800 text-red-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[9px] font-mono shadow-md"
                      >
                        <AlertCircle className="h-3 w-3 text-red-400 animate-spin" />
                        <span>NETWORK JITTER SPIKE INJECTED: 4x LATENCY DRAFT</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Symmetrical Parity Scale Meter */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 flex flex-col gap-3 shadow-xs">
                  <div className="flex justify-between items-center select-none font-mono">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Operational Balance Scale</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      lastDelays.diff < 15 
                        ? 'bg-violet-50 text-violet-700' 
                        : lastDelays.diff < 40 
                        ? 'bg-amber-50 text-amber-700' 
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {lastDelays.diff === 0 
                        ? 'Equilibrium (0ms)' 
                        : `Drift: ${lastDelays.diff}ms`}
                    </span>
                  </div>

                  {/* Weighing scale visualizer */}
                  <div className="h-10 flex items-center justify-center relative bg-gray-50/70 rounded-xl border border-gray-100 overflow-hidden">
                    <div className="absolute left-4 text-[10px] font-mono text-gray-500">Node A</div>
                    
                    {/* The Scale Balance bar */}
                    <motion.div 
                      style={{ 
                        rotate: Math.min(18, Math.max(-18, (lastDelays.a - lastDelays.b) * 0.25))
                      }}
                      className="w-48 h-1 bg-gray-300 rounded-full relative flex items-center justify-between"
                      transition={{ type: 'spring', stiffness: 90, damping: 10 }}
                    >
                      {/* Left weight pan */}
                      <div className="h-3 w-3 rounded-full bg-violet-600 -translate-y-1 -translate-x-1" />
                      {/* Central pivot point */}
                      <div className="h-4 w-4 bg-gray-400 rounded-full border-2 border-white shadow-xs z-10" />
                      {/* Right weight pan */}
                      <div className={`h-3 w-3 rounded-full -translate-y-1 translate-x-1 ${activeSpike ? 'bg-red-500' : 'bg-violet-600'}`} />
                    </motion.div>

                    <div className="absolute right-4 text-[10px] font-mono text-gray-500">Node B</div>
                  </div>

                  {/* Drift index history logs graph */}
                  <div className="flex flex-col gap-1 mt-1 font-mono">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Absolute Performance Delta |A_i - B_i|</span>
                    <div className="h-14 flex items-end gap-1 pt-3">
                      {driftHistory.map((d, didx) => {
                        const hPercent = Math.min(100, Math.max(8, (d / 150) * 100));
                        return (
                          <div
                            key={didx}
                            style={{ height: `${hPercent}%` }}
                            className={`flex-grow rounded-sm transition-all border-t ${
                              d < 15 
                                ? 'bg-violet-500/20 border-violet-500' 
                                : d < 45 
                                ? 'bg-amber-500/20 border-amber-500' 
                                : 'bg-red-500/20 border-red-500'
                            }`}
                            title={`Delta: ${d}ms`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. EVEN PRODUCT PLATFORM ALIGNMENT CHECKLIST */}
            {isEvenProduct && (
              <div className="flex-grow flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-teal-500" /> Release Parity Blueprint
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">Toggle platforms to resolve balance</span>
                </div>

                {/* Symmetrical Release Alignment Grid */}
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden select-none">
                  <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-150 px-4 py-2.5 font-mono text-[9px] font-extrabold text-gray-400 uppercase tracking-wider leading-none">
                    <span>Platform Module</span>
                    <span className="flex items-center justify-center gap-1 text-gray-500"><Globe className="h-3 w-3 text-sky-500" /> Web</span>
                    <span className="flex items-center justify-center gap-1 text-gray-500"><Laptop className="h-3 w-3 text-indigo-500" /> Desktop</span>
                    <span className="flex items-center justify-center gap-1 text-gray-500"><Smartphone className="h-3 w-3 text-rose-500" /> Mobile</span>
                  </div>

                  <div className="divide-y divide-gray-100 px-4">
                    {/* Row 1: File Parser */}
                    <div className="grid grid-cols-4 py-3.5 items-center">
                      <span className="text-xs font-semibold text-gray-800">File Parser</span>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.fileParser.web} 
                          onChange={() => toggleProductPlatform('fileParser', 'web')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.fileParser.desktop} 
                          onChange={() => toggleProductPlatform('fileParser', 'desktop')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.fileParser.mobile} 
                          onChange={() => toggleProductPlatform('fileParser', 'mobile')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                    </div>

                    {/* Row 2: Indexing Core */}
                    <div className="grid grid-cols-4 py-3.5 items-center">
                      <span className="text-xs font-semibold text-gray-800">Indexing Core</span>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.indexingCore.web} 
                          onChange={() => toggleProductPlatform('indexingCore', 'web')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.indexingCore.desktop} 
                          onChange={() => toggleProductPlatform('indexingCore', 'desktop')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.indexingCore.mobile} 
                          onChange={() => toggleProductPlatform('indexingCore', 'mobile')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                    </div>

                    {/* Row 3: Workspace DB */}
                    <div className="grid grid-cols-4 py-3.5 items-center">
                      <span className="text-xs font-semibold text-gray-800">Workspace DB</span>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.workspaceDb.web} 
                          onChange={() => toggleProductPlatform('workspaceDb', 'web')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.workspaceDb.desktop} 
                          onChange={() => toggleProductPlatform('workspaceDb', 'desktop')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.workspaceDb.mobile} 
                          onChange={() => toggleProductPlatform('workspaceDb', 'mobile')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                    </div>

                    {/* Row 4: Local Vault */}
                    <div className="grid grid-cols-4 py-3.5 items-center">
                      <span className="text-xs font-semibold text-gray-800">Local Vault</span>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.localVault.web} 
                          onChange={() => toggleProductPlatform('localVault', 'web')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.localVault.desktop} 
                          onChange={() => toggleProductPlatform('localVault', 'desktop')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                      <div className="flex justify-center">
                        <input 
                          type="checkbox" 
                          checked={productReleaseState.localVault.mobile} 
                          onChange={() => toggleProductPlatform('localVault', 'mobile')}
                          className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deployment Parity Rating meter */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-4 relative overflow-hidden">
                  
                  {/* Confetti alert layer */}
                  {showDeploymentCelebration && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 bg-teal-600/95 flex flex-col items-center justify-center p-4 text-center z-10 text-white"
                    >
                      <CheckCircle2 className="h-10 w-10 text-white mb-2 animate-bounce" />
                      <h4 className="text-base font-bold">100% Platform Parity Symmetrical</h4>
                      <p className="text-xs text-teal-100 max-w-sm mt-1">Symmetric Release upgraded successfully across all browser, native, and mobile nodes. Platform equilibrium holds!</p>
                    </motion.div>
                  )}

                  <div className="flex justify-between items-center font-mono">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Platform Parity Index</span>
                    <span className="text-xs font-bold text-teal-600">{getProductParityRating()}% Symmetrical</span>
                  </div>

                  {/* Rating slide tracker */}
                  <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    <motion.div 
                      style={{ width: `${getProductParityRating()}%` }}
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-400"
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-1 leading-none">
                    {getProductParityRating() === 100 ? (
                      <span className="text-[10px] text-teal-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Platform synchronization holds perfectly. Ready to deploy!
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 animate-pulse" /> Platform gaps detected. Synchronize platforms to 100% to enable release.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Parameters Panel (Dials, triggers, export controllers) */}
          <div className="w-full md:w-80 bg-white flex flex-col p-6 overflow-y-auto font-sans shrink-0 [scrollbar-width:thin]">
            
            {/* BOUNCE PANEL SLIDERS */}
            {isBounce && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Sliders className="h-3.5 w-3.5 text-emerald-500" /> Mechanics Constants
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">Adjust coefficients of elasticity and gravitational properties of the bouncy elastomeric mass.</p>
                </div>

                <div className="flex flex-col gap-4 select-none">
                  {/* Slider 1: Gravity */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-600">Gravity Constant ($g$)</span>
                      <span className="font-mono text-gray-800">{gravity.toFixed(2)} $m/s^2$</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="24.0"
                      step="0.5"
                      value={gravity}
                      onChange={(e) => setGravity(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>

                  {/* Slider 2: Rebound Damping */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-600">Rebound Damping</span>
                      <span className="font-mono text-gray-800">{reboundDamping.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.80"
                      step="0.01"
                      value={reboundDamping}
                      onChange={(e) => setReboundDamping(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex justify-between text-[8px] text-gray-400 font-mono mt-0.5 leading-none">
                      <span>Low Decay (e ~ 0.98)</span>
                      <span>High Decay (e ~ 0.2)</span>
                    </div>
                  </div>

                  {/* Slider 3: Air Resistance */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-600">Viscous Air Drag</span>
                      <span className="font-mono text-gray-800">{airResistance.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.08"
                      step="0.002"
                      value={airResistance}
                      onChange={(e) => setAirResistance(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>

                  {/* Color Selector */}
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-600">Mass Surface Tint</span>
                    <div className="flex gap-2">
                      {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#7c3aed'].map((col) => (
                        <button
                          key={col}
                          onClick={() => setBallColor(col)}
                          style={{ backgroundColor: col }}
                          className={`h-6 w-6 rounded-full border cursor-pointer transition-transform ${
                            ballColor === col ? 'ring-2 ring-emerald-300 ring-offset-2 scale-110 shadow-xs' : 'border-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save and Inject Buttons */}
                {onUpdateContent && (
                  <div className="pt-4 border-t border-gray-100 flex flex-col gap-2 mt-auto">
                    <button
                      id="export-bounce-config"
                      onClick={handleExportBounceConfig}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                        hasExportedConfig 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {hasExportedConfig ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      {hasExportedConfig ? 'Config Injected!' : 'Inject Back into JSON'}
                    </button>
                    <p className="text-[9px] text-gray-400 text-center leading-normal">
                      Pressing inject converts slider state into JSON structure and updates the text editor's parameters instantly.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PARITY PANEL SLIDERS */}
            {isParity && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Sliders className="h-3.5 w-3.5 text-violet-500" /> Pipeline Parameters
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">Adjust computational load balancing boundaries. Watch the master-replica scale tilt under network latencies.</p>
                </div>

                <div className="flex flex-col gap-4 select-none">
                  {/* Slider 1: Dispatch Rate */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-600">Dispatch Rate</span>
                      <span className="font-mono text-gray-800">{dispatchRate} reqs/sec</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={dispatchRate}
                      onChange={(e) => setDispatchRate(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                  </div>

                  {/* Slider 2: Network Jitter */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-600">Default Jitter Variance</span>
                      <span className="font-mono text-gray-800">{jitter} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      value={jitter}
                      onChange={(e) => setJitter(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                  </div>

                  {/* Slider 3: Node A Capacity */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-600">Node A (Primary) Delay</span>
                      <span className="font-mono text-gray-800">{capacityA} ms</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="5"
                      value={capacityA}
                      onChange={(e) => setCapacityA(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                  </div>

                  {/* Slider 4: Node B Capacity */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-600">Node B (Replica) Delay</span>
                      <span className="font-mono text-gray-800">{capacityB} ms</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="5"
                      value={capacityB}
                      onChange={(e) => setCapacityB(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                  </div>
                </div>

                {/* Operations */}
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-2 mt-auto font-mono">
                  <button
                    id="inject-lag-spike"
                    disabled={activeSpike}
                    onClick={triggerSpike}
                    className={`w-full py-2 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all ${
                      activeSpike 
                        ? 'bg-red-50 text-red-500 border border-red-200 cursor-default' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {activeSpike ? 'Spike Active...' : 'Inject Replica Jitter Spike'}
                  </button>
                  <p className="text-[9px] text-gray-400 text-center leading-normal">
                    Pressing spike simulates a momentary 4x latency slowdown on replica Node B, tipping the parity balance scale.
                  </p>
                </div>
              </div>
            )}

            {/* EVEN PRODUCT PANEL */}
            {isEvenProduct && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Sliders className="h-3.5 w-3.5 text-teal-500" /> Platform Deployment
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">Deploy products only when symmetrical feature sets are complete across Web, Desktop and Mobile nodes.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-2 select-text">
                  <p className="font-bold text-gray-850">Release Threshold:</p>
                  <p>A launch is considered strictly **Symmetrical** if and only if all platforms have equal functional capabilities for each module.</p>
                  <p>Currently disabled platforms denote functional gaps that must be completed by developer action.</p>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2.5">
                  <button
                    id="deploy-even-product-btn"
                    onClick={deployEvenProduct}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Deploy Symmetrical Release
                  </button>
                  <button
                    id="even-reset-btn"
                    onClick={() => {
                      setProductReleaseState({
                        fileParser: { web: true, desktop: true, mobile: true },
                        indexingCore: { web: true, desktop: true, mobile: false },
                        workspaceDb: { web: true, desktop: true, mobile: true },
                        localVault: { web: true, desktop: false, mobile: false },
                      });
                    }}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-xl cursor-pointer transition-all"
                  >
                    Restore Defaults
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
