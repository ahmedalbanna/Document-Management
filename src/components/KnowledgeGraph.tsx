import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  HelpCircle, 
  FileText, 
  Plus, 
  Search, 
  ChevronRight, 
  Loader2, 
  RefreshCw, 
  Cpu, 
  Tag, 
  BookOpen, 
  Link2,
  CheckCircle,
  BadgeAlert
} from 'lucide-react';
import { Document, Shelf, ImplicitConnection, KnowledgeGap } from '../types';

interface KnowledgeGraphProps {
  documents: Document[];
  shelves: Shelf[];
  onOpenDoc: (doc: Document) => void;
  onCreateDocFromLink: (title: string) => void;
  currentUserEmail?: string;
}

interface Node3D {
  id: string;
  label: string;
  type: 'document' | 'gap';
  docType?: string;
  category?: string;
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  radius: number;
  color: string;
  isGap?: boolean;
  gapData?: KnowledgeGap;
  docData?: Document;
  connectionsCount: number;
}

interface Edge3D {
  sourceId: string;
  targetId: string;
  source: Node3D;
  target: Node3D;
  strength: number; // 0.1 to 1.0
  type: 'explicit' | 'implicit';
  reason?: string;
}

export default function KnowledgeGraph({ 
  documents, 
  shelves, 
  onOpenDoc, 
  onCreateDocFromLink,
  currentUserEmail 
}: KnowledgeGraphProps) {
  
  // --- States ---
  const [implicitConnections, setImplicitConnections] = useState<ImplicitConnection[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredNodePos, setHoveredNodePos] = useState<{ x: number, y: number } | null>(null);
  
  // View transform states
  const [zoom, setZoom] = useState<number>(1.2);
  const [rotationX, setRotationX] = useState<number>(0.3); // X axis rotation (tilt)
  const [rotationY, setRotationY] = useState<number>(0.6); // Y axis rotation (spin)
  const [isDragging, setIsDragging] = useState(false);
  
  // Knowledge Gap focusing
  const [focusingNodeId, setFocusingNodeId] = useState<string | null>(null);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotationStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameIdRef = useRef<number | null>(null);
  const spinSpeedRef = useRef<number>(0.002); // Autospin speed

  // Load calculated relationships from localStorage
  useEffect(() => {
    const loadRelations = () => {
      const savedConnections = localStorage.getItem('doc_manager_implicit_connections');
      const savedGaps = localStorage.getItem('doc_manager_knowledge_gaps');
      if (savedConnections) setImplicitConnections(JSON.parse(savedConnections));
      if (savedGaps) setKnowledgeGaps(JSON.parse(savedGaps));
    };
    loadRelations();
    window.addEventListener('doc_manager_relations_updated', loadRelations);
    return () => {
      window.removeEventListener('doc_manager_relations_updated', loadRelations);
    };
  }, []);

  // --- Compute Graph Structure ---
  const graphData = useMemo(() => {
    const activeDocs = documents.filter(d => !d.isArchived);
    const nodes: Node3D[] = [];
    const nodeMap = new Map<string, Node3D>();

    // 1. Map existing documents to coordinates on a 3D sphere
    activeDocs.forEach((doc, idx) => {
      // Golden spiral distribution on sphere for beautiful layout spacing
      const numNodes = activeDocs.length + knowledgeGaps.length;
      const phi = Math.acos(-1 + (2 * idx) / numNodes);
      const theta = Math.sqrt(numNodes * Math.PI) * phi;

      const radius = 160;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      // Determine colors based on shelf color accents
      const shelf = shelves.find(s => s.id === doc.category);
      let hexColor = '#3b82f6'; // default blue
      if (shelf) {
        if (shelf.color === 'emerald') hexColor = '#10b981';
        else if (shelf.color === 'teal') hexColor = '#14b5a6';
        else if (shelf.color === 'violet') hexColor = '#8b5cf6';
        else if (shelf.color === 'amber') hexColor = '#f59e0b';
        else if (shelf.color === 'rose') hexColor = '#f43f5e';
        else if (shelf.color === 'sky') hexColor = '#0ea5e9';
      }

      const node: Node3D = {
        id: doc.id,
        label: doc.title,
        type: 'document',
        docType: doc.type,
        category: doc.category,
        x, y, z,
        baseX: x, baseY: y, baseZ: z,
        radius: 8,
        color: hexColor,
        docData: doc,
        connectionsCount: 0
      };

      nodes.push(node);
      nodeMap.set(doc.id, node);
    });

    // 2. Map Knowledge Gaps to coordinates (placed on a wider orbit sphere)
    knowledgeGaps.forEach((gap, idx) => {
      const gapId = `gap-${idx}`;
      const totalDocs = activeDocs.length;
      const totalItems = totalDocs + knowledgeGaps.length;
      const phi = Math.acos(-1 + (2 * (totalDocs + idx)) / totalItems);
      const theta = Math.sqrt(totalItems * Math.PI) * phi;

      const radius = 240; // wider orbit for Gaps to stand out
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const node: Node3D = {
        id: gapId,
        label: gap.title,
        type: 'gap',
        x, y, z,
        baseX: x, baseY: y, baseZ: z,
        radius: 10,
        color: '#f59e0b', // Glowing gold
        isGap: true,
        gapData: gap,
        connectionsCount: 0
      };

      nodes.push(node);
      nodeMap.set(gapId, node);
    });

    // 3. Create Edges
    const edges: Edge3D[] = [];

    // Explicit links (shared category / shelf, identical tags, or wiki connections)
    for (let i = 0; i < activeDocs.length; i++) {
      const docA = activeDocs[i];
      const nodeA = nodeMap.get(docA.id);
      if (!nodeA) continue;

      for (let j = i + 1; j < activeDocs.length; j++) {
        const docB = activeDocs[j];
        const nodeB = nodeMap.get(docB.id);
        if (!nodeB) continue;

        let isConnected = false;
        let strength = 0.2;
        let reasons: string[] = [];

        // Same category
        if (docA.category === docB.category) {
          isConnected = true;
          strength += 0.2;
          reasons.push('Shared Category');
        }

        // Shared Tags
        const sharedTags = docA.tags.filter(t => docB.tags.includes(t));
        if (sharedTags.length > 0) {
          isConnected = true;
          strength += Math.min(sharedTags.length * 0.15, 0.4);
          reasons.push(`Shared Labels (${sharedTags.join(', ')})`);
        }

        // Wiki link references
        const aMentionB = docA.content.includes(`[[${docB.title}]]`) || docA.content.includes(`[[${docB.id}]]`);
        const bMentionA = docB.content.includes(`[[${docA.title}]]`) || docB.content.includes(`[[${docA.id}]]`);
        if (aMentionB || bMentionA) {
          isConnected = true;
          strength += 0.35;
          reasons.push('Wiki Link Reference');
        }

        if (isConnected) {
          nodeA.connectionsCount++;
          nodeB.connectionsCount++;
          edges.push({
            sourceId: docA.id,
            targetId: docB.id,
            source: nodeA,
            target: nodeB,
            strength: Math.min(strength, 1.0),
            type: 'explicit',
            reason: reasons.join(' & ')
          });
        }
      }
    }

    // Implicit connections generated by Gemini
    implicitConnections.forEach(conn => {
      const nodeA = nodeMap.get(conn.sourceId);
      const nodeB = nodeMap.get(conn.targetId);

      if (nodeA && nodeB) {
        // Prevent duplicate explicit/implicit links
        const exists = edges.some(e => 
          (e.sourceId === conn.sourceId && e.targetId === conn.targetId) ||
          (e.sourceId === conn.targetId && e.targetId === conn.sourceId)
        );

        if (!exists) {
          nodeA.connectionsCount++;
          nodeB.connectionsCount++;
          edges.push({
            sourceId: conn.sourceId,
            targetId: conn.targetId,
            source: nodeA,
            target: nodeB,
            strength: conn.strength,
            type: 'implicit',
            reason: conn.reason
          });
        }
      }
    });

    // Connections for knowledge gaps
    knowledgeGaps.forEach((gap, idx) => {
      const gapId = `gap-${idx}`;
      const gapNode = nodeMap.get(gapId);
      if (!gapNode) return;

      gap.relatedDocIds.forEach(relatedId => {
        const docNode = nodeMap.get(relatedId);
        if (docNode) {
          gapNode.connectionsCount++;
          docNode.connectionsCount++;
          edges.push({
            sourceId: gapId,
            targetId: relatedId,
            source: gapNode,
            target: docNode,
            strength: gap.relevance === 'High' ? 0.8 : gap.relevance === 'Medium' ? 0.5 : 0.3,
            type: 'implicit',
            reason: `Discovered gap bridge: ${gap.title}`
          });
        }
      });
    });

    return { nodes, edges };
  }, [documents, shelves, implicitConnections, knowledgeGaps]);

  // Selected node details
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return graphData.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData]);

  // Selected node connections
  const connectedEdgesAndNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    return graphData.edges
      .filter(e => e.sourceId === selectedNodeId || e.targetId === selectedNodeId)
      .map(e => {
        const otherNode = e.sourceId === selectedNodeId ? e.target : e.source;
        return {
          edge: e,
          node: otherNode
        };
      });
  }, [selectedNodeId, graphData]);

  // --- API Request to Analyze with Gemini ---
  const handleAnalyzeLibrary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeDocs = documents.filter(d => !d.isArchived);
      
      const response = await fetch('/api/gemini/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: activeDocs })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze connections.');
      }

      const data = await response.json();

      const connections: ImplicitConnection[] = data.connections || [];
      const gaps: KnowledgeGap[] = data.knowledgeGaps || [];

      setImplicitConnections(connections);
      setKnowledgeGaps(gaps);

      localStorage.setItem('doc_manager_implicit_connections', JSON.stringify(connections));
      localStorage.setItem('doc_manager_knowledge_gaps', JSON.stringify(gaps));

    } catch (err: any) {
      console.error('Knowledge Graph API Error:', err);
      setError(err.message || 'An error occurred while generating relationships.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAnalysis = () => {
    if (confirm('Verify: Clear Gemini implicit connections and knowledge gaps?')) {
      setImplicitConnections([]);
      setKnowledgeGaps([]);
      localStorage.removeItem('doc_manager_implicit_connections');
      localStorage.removeItem('doc_manager_knowledge_gaps');
      setSelectedNodeId(null);
    }
  };

  // --- HTML5 simulated 3D WebGL projection loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;

    // Handles HighDPI / Retina screens nicely
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      width = canvas.width;
      height = canvas.height;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle pipeline system for animated photon glows along connections
    let particles: { edgeIdx: number; progress: number; speed: number }[] = [];
    const maxParticles = 24;

    const render = () => {
      // Clear with elegant light transparent overlay or complete white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      const computedWidth = width / window.devicePixelRatio;
      const computedHeight = height / window.devicePixelRatio;
      const centerX = computedWidth / 2;
      const centerY = computedHeight / 2;

      // Slow dynamic spin if user is not actively dragging
      let currentXRot = rotationX;
      let currentYRot = rotationY;
      if (!isDragging && !focusingNodeId) {
        currentYRot += spinSpeedRef.current;
      }

      // Smooth camera interpolation when zooming onto gaps
      if (focusingNodeId) {
        const targetNode = graphData.nodes.find(n => n.id === focusingNodeId);
        if (targetNode) {
          // Calculate camera rotation that aligns this node directly facing the screen
          // Normalize base coordinates to find angle
          const targetRotY = -Math.atan2(targetNode.baseX, targetNode.baseZ);
          const targetRotX = Math.asin(targetNode.baseY / 240); // spherical radius of gaps

          // Linear interpolation towards targets for smooth flight
          const lerpFactor = 0.08;
          currentYRot += (targetRotY - currentYRot) * lerpFactor;
          currentXRot += (targetRotX - currentXRot) * lerpFactor;
          setZoom(prev => prev + (2.5 - prev) * lerpFactor); // zoom in closely to discover the gap

          // Stop centering when very close
          if (Math.abs(currentYRot - targetRotY) < 0.01 && Math.abs(currentXRot - targetRotX) < 0.01) {
            setFocusingNodeId(null);
          }
        }
      }

      // Save latest rotation back to states
      if (!isDragging) {
        setRotationX(currentXRot);
        setRotationY(currentYRot);
      }

      // 1. PROJECT ALL NODES IN 3D SPACE
      const projectedNodes = graphData.nodes.map(node => {
        // Rotate around Y-axis (left/right spin)
        const cosY = Math.cos(currentYRot);
        const sinY = Math.sin(currentYRot);
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.x * sinY + node.z * cosY;

        // Rotate around X-axis (up/down tilt)
        const cosX = Math.cos(currentXRot);
        const sinX = Math.sin(currentXRot);
        const y2 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;

        // Perspective scaling factor
        const fov = 400;
        const scale = fov / (fov + z2);
        const screenX = centerX + x1 * scale * zoom;
        const screenY = centerY + y2 * scale * zoom;

        return {
          ...node,
          screenX,
          screenY,
          depth: z2, // keep depth value for ordering and alpha
          scale
        };
      });

      // Sort projected nodes by depth (painter's algorithm) so elements in front cover elements behind
      projectedNodes.sort((a, b) => b.depth - a.depth);

      // Create lookup map for fast connector lookup
      const projectedMap = new Map<string, typeof projectedNodes[0]>();
      projectedNodes.forEach(pn => projectedMap.set(pn.id, pn));

      // 2. DRAW EDGES / CONNECTORS WITH DEPTH TRANSPARENCY
      graphData.edges.forEach((edge, edgeIdx) => {
        const src = projectedMap.get(edge.sourceId);
        const dest = projectedMap.get(edge.targetId);
        if (!src || !dest) return;

        // Calculate transparency based on edge's nodes average depth
        const avgDepth = (src.depth + dest.depth) / 2;
        const maxDepthThreshold = 300;
        let alpha = Math.max(0.05, 1 - (avgDepth + 150) / maxDepthThreshold);

        // Highlight if source or target is hovered or selected
        const isRelated = selectedNodeId === edge.sourceId || selectedNodeId === edge.targetId ||
                          hoveredNodeId === edge.sourceId || hoveredNodeId === edge.targetId;

        if (selectedNodeId || hoveredNodeId) {
          alpha = isRelated ? Math.min(alpha * 1.5, 1.0) : alpha * 0.15;
        }

        ctx.beginPath();
        ctx.moveTo(src.screenX, src.screenY);
        
        // Draw implicit Gemini connections with custom dashed paths
        if (edge.type === 'implicit') {
          ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.85})`; // purple accent
          ctx.lineWidth = isRelated ? 2 : 1.5;
          ctx.setLineDash([5, 4]);
        } else {
          ctx.strokeStyle = `rgba(209, 213, 219, ${alpha * 0.95})`; // standard grey
          ctx.lineWidth = isRelated ? 1.8 : 1.0;
          ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Draw animated photon pipeline along edges
        if (isRelated && Math.random() < 0.1 && particles.length < maxParticles) {
          particles.push({
            edgeIdx,
            progress: 0,
            speed: 0.02 + Math.random() * 0.015
          });
        }
      });

      // Update and draw edge particles
      particles = particles.filter(p => p.progress < 1.0);
      particles.forEach(p => {
        const edge = graphData.edges[p.edgeIdx];
        if (!edge) return;
        const src = projectedMap.get(edge.sourceId);
        const dest = projectedMap.get(edge.targetId);
        if (!src || !dest) return;

        p.progress += p.speed;

        // Direct coordinate calculation
        const px = src.screenX + (dest.screenX - src.screenX) * p.progress;
        const py = src.screenY + (dest.screenY - src.screenY) * p.progress;

        // Glow style matching the connection type
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = edge.type === 'implicit' ? '#c084fc' : '#818cf8';
        ctx.shadowBlur = 8;
        ctx.shadowColor = edge.type === 'implicit' ? '#a855f7' : '#6366f1';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow
      });

      // 3. DRAW NODES
      projectedNodes.forEach(node => {
        // Calculate depth opacity
        const maxDepthThreshold = 300;
        const alpha = Math.max(0.1, 1 - (node.depth + 150) / maxDepthThreshold);

        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNodeId === node.id;

        // Dim if other node is selected/hovered and not related
        let renderAlpha = alpha;
        if (selectedNodeId || hoveredNodeId) {
          const isRelated = selectedNodeId === node.id || hoveredNodeId === node.id ||
                            graphData.edges.some(e => 
                              (e.sourceId === node.id && (e.targetId === selectedNodeId || e.targetId === hoveredNodeId)) ||
                              (e.targetId === node.id && (e.sourceId === selectedNodeId || e.sourceId === hoveredNodeId))
                            );
          renderAlpha = isRelated ? Math.min(alpha * 1.5, 1.0) : alpha * 0.2;
        }

        const size = node.radius * node.scale * (isHovered ? 1.45 : isSelected ? 1.3 : 1.0);

        // A. Glow Aura for special or active nodes
        if (node.isGap) {
          // Double concentric rings for knowledge gaps
          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, size * 1.6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245, 158, 11, ${renderAlpha * 0.3})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Pulsing core aura
          const pulse = Math.sin(Date.now() / 150) * 0.15 + 1.0;
          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, size * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245, 158, 11, ${renderAlpha})`;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#f59e0b';
          ctx.fill();
          ctx.shadowBlur = 0;

          // Render letter ? inside node
          ctx.font = `bold ${Math.max(8, Math.round(size * 1.1))}px sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', node.screenX, node.screenY);
        } else {
          // Document nodes
          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, size, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          
          if (isSelected || isHovered) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = node.color;
          }
          ctx.fill();
          ctx.shadowBlur = 0;

          // White center dot for modern style
          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, size * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        }

        // B. Node text descriptions
        if (isSelected || isHovered || node.connectionsCount > 2 || node.isGap) {
          ctx.font = `${isHovered ? 'bold' : isSelected ? '600' : 'normal'} 10px sans-serif`;
          ctx.fillStyle = isSelected 
            ? 'rgba(15, 23, 42, 1.0)' 
            : isHovered 
              ? 'rgba(79, 70, 229, 1.0)' 
              : `rgba(71, 85, 105, ${Math.min(renderAlpha * 1.8, 1.0)})`;

          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          // Truncate title if long
          const rawTitle = node.label;
          const displayTitle = rawTitle.length > 20 ? `${rawTitle.slice(0, 18)}...` : rawTitle;

          // Background banner for hovered or selected text to make it extremely eye-readable
          if (isHovered || isSelected) {
            const textWidth = ctx.measureText(displayTitle).width + 10;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = isHovered ? '#818cf8' : '#e2e8f0';
            ctx.lineWidth = 1;
            
            // Draw rounded rect background
            const rx = node.screenX - textWidth / 2;
            const ry = node.screenY - size - 16;
            ctx.beginPath();
            ctx.roundRect(rx, ry, textWidth, 14, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isHovered ? '#4f46e5' : '#0f172a';
            ctx.fillText(displayTitle, node.screenX, node.screenY - size - 14);
          } else {
            ctx.fillText(displayTitle, node.screenX, node.screenY + size + 5);
          }
        }
      });

      // Trigger next animation render frame
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [graphData, zoom, rotationX, rotationY, isDragging, selectedNodeId, hoveredNodeId, focusingNodeId]);

  // --- Mouse & Gesture Interaction Event Handlers ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setFocusingNodeId(null); // Cancel focus flight if user interacts
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    rotationStartRef.current = { x: rotationY, y: rotationX };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      // 3D sphere drag rotation
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      const sensitivity = 0.007;
      setRotationY(rotationStartRef.current.x + deltaX * sensitivity);
      setRotationX(Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotationStartRef.current.y + deltaY * sensitivity)));
    } else {
      // Hover detection algorithm: Check if cursor matches projected screen nodes
      const computedWidth = canvas.width / window.devicePixelRatio;
      const computedHeight = canvas.height / window.devicePixelRatio;
      const centerX = computedWidth / 2;
      const centerY = computedHeight / 2;

      let foundNodeId: string | null = null;

      // Scan in reverse order (closest nodes first)
      const currentXRot = rotationX;
      const currentYRot = rotationY;

      // Project nodes in-situ to locate mouse collision
      for (const node of graphData.nodes) {
        const cosY = Math.cos(currentYRot);
        const sinY = Math.sin(currentYRot);
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.x * sinY + node.z * cosY;

        const cosX = Math.cos(currentXRot);
        const sinX = Math.sin(currentXRot);
        const y2 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;

        const fov = 400;
        const scale = fov / (fov + z2);
        const screenX = centerX + x1 * scale * zoom;
        const screenY = centerY + y2 * scale * zoom;

        // Collision radius check with standard buffer
        const dist = Math.hypot(mouseX - screenX, mouseY - screenY);
        const touchRadius = Math.max(12, node.radius * scale * 1.5);

        if (dist < touchRadius) {
          foundNodeId = node.id;
          setHoveredNodePos({ x: mouseX, y: mouseY });
          break; // break early to capture closest match
        }
      }

      setHoveredNodeId(foundNodeId);
      if (!foundNodeId) setHoveredNodePos(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);

    // If drag was very minor, count it as a simple mouse click select action
    const delta = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
    if (delta < 5) {
      if (hoveredNodeId) {
        setSelectedNodeId(hoveredNodeId === selectedNodeId ? null : hoveredNodeId);
      } else {
        setSelectedNodeId(null);
      }
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const next = direction === 'in' ? prev * 1.15 : prev / 1.15;
      return Math.max(0.4, Math.min(4.5, next));
    });
  };

  const handleResetView = () => {
    setZoom(1.2);
    setRotationX(0.3);
    setRotationY(0.6);
    setSelectedNodeId(null);
    setFocusingNodeId(null);
  };

  // --- Zoom onto Knowledge Gap and display ---
  const handleFocusGap = (gapId: string) => {
    setSelectedNodeId(gapId);
    setFocusingNodeId(gapId);
  };

  // --- Search matches filter ---
  const searchedNodes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return graphData.nodes.filter(n => 
      n.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, graphData]);

  return (
    <div id="knowledge-graph-workspace" className="flex-1 flex flex-col lg:flex-row gap-6 h-full min-h-[550px] select-none">
      
      {/* LEFT: GLOWING WEBGL CORE CANVAS ORBIT */}
      <div className="flex-1 bg-white border border-gray-150 rounded-3xl p-5 flex flex-col shadow-xs relative min-h-[400px]">
        
        {/* Floating Controls HUD Banner */}
        <div className="absolute top-8 left-8 right-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-none z-10">
          <div className="bg-white/90 backdrop-blur-md border border-gray-150/70 py-2 px-4 rounded-2xl flex items-center gap-2.5 shadow-sm pointer-events-auto">
            <Cpu className="h-4 w-4 text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-900 tracking-tight flex items-center gap-1.5 uppercase">
                AI Knowledge Graph Orbit
              </span>
              <span className="text-[9px] text-gray-400 font-mono">
                VCS-GRAPH @ 60fps | {graphData.nodes.filter(n => !n.isGap).length} docs | {knowledgeGaps.length} gaps
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-gray-150/70 p-1.5 rounded-2xl shadow-sm pointer-events-auto">
            <button
              onClick={() => handleZoom('in')}
              className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-xl transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleZoom('out')}
              className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-xl transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-xl transition-all cursor-pointer"
              title="Reset Orbit Camera"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Floating Legend / Colors Badge Indicator */}
        <div className="absolute bottom-8 left-8 flex flex-wrap gap-2 pointer-events-none z-10 max-w-[70%]">
          <div className="bg-white/80 backdrop-blur-md border border-gray-150/50 px-2.5 py-1 rounded-full text-[9px] font-bold text-gray-500 flex items-center gap-1.5 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Explicit Doc link
          </div>
          {implicitConnections.length > 0 && (
            <div className="bg-white/80 backdrop-blur-md border border-gray-150/50 px-2.5 py-1 rounded-full text-[9px] font-bold text-indigo-700 flex items-center gap-1.5 shadow-2xs border-dashed border-indigo-200">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> Gemini Implicit link
            </div>
          )}
          {knowledgeGaps.length > 0 && (
            <div className="bg-white/80 backdrop-blur-md border border-gray-150/50 px-2.5 py-1 rounded-full text-[9px] font-bold text-amber-700 flex items-center gap-1.5 shadow-2xs border-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Discovered Gap
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDragging(false);
              setHoveredNodeId(null);
            }}
          />

          {/* Prompt/Overlay when graph is empty of analysis */}
          {implicitConnections.length === 0 && knowledgeGaps.length === 0 && !isLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-20 pointer-events-auto">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm mb-4">
                <Sparkles className="h-7 w-7 text-indigo-600 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Uncover Semantic Connections
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1 mb-6 leading-relaxed">
                Let Gemini read across your physical shelves to discover hidden connections, unwritten research gaps, and overlapping mathematical/engineering topics.
              </p>
              <button
                onClick={handleAnalyzeLibrary}
                className="bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Cpu className="h-4 w-4" /> Scan Workspace & Map Relationships
              </button>
            </div>
          )}

          {/* Quick Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-20">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest animate-pulse">
                Gemini Workspace Mapping Engine
              </h4>
              <p className="text-[10px] text-gray-500 max-w-xs mt-1 leading-normal">
                Reading across all shelves, analyzing topics, extracting formula patterns, and drafting multi-dimensional nodes...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR PANEL: METRICS, DISCOVERED GAPS & SELECTED STATE */}
      <div className="w-full lg:w-80 bg-white border border-gray-150 rounded-3xl p-5 flex flex-col shadow-xs shrink-0 select-none">
        
        {/* Tab Header Selector */}
        <div className="flex flex-col gap-0.5 border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-450 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse fill-current" /> Semantic Analytics
            </h3>
            {implicitConnections.length > 0 && (
              <button
                onClick={handleClearAnalysis}
                className="text-[9px] text-red-500 hover:underline font-bold"
                title="Clear loaded analysis logs"
              >
                Reset Graph
              </button>
            )}
          </div>
          <span className="text-[10px] text-gray-400 leading-tight">Explore unwritten concepts and implicit connections mapped by Gemini:</span>
        </div>

        {/* Context panel conditional renders */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[70vh] [scrollbar-width:thin]">
          
          {/* A. If a node is selected, show custom detailed inspector card */}
          {selectedNode ? (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div className="border border-gray-150 bg-gray-50/50 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {selectedNode.isGap ? (
                      <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">?</div>
                    ) : (
                      <div 
                        className="h-8 w-8 rounded-xl flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: selectedNode.color }}
                      >
                        <FileText className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900 truncate max-w-[160px]">{selectedNode.label}</span>
                      <span className="text-[9px] text-gray-400 font-mono uppercase">
                        {selectedNode.isGap ? 'Discovered Gap' : `${selectedNode.docType} Document`}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedNodeId(null)}
                    className="text-[10px] text-gray-400 hover:text-gray-600 font-bold"
                  >
                    Close
                  </button>
                </div>

                {selectedNode.isGap ? (
                  // Knowledge Gap Details
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[10px] text-gray-650 leading-relaxed bg-white border border-gray-100 p-2.5 rounded-xl">
                      {selectedNode.gapData?.description}
                    </p>
                    <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono">
                      <span>Priority: <span className="font-bold text-amber-500">{selectedNode.gapData?.relevance}</span></span>
                      <span>Doc Type: <span className="font-bold text-gray-600">{selectedNode.gapData?.suggestedDocType}</span></span>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (selectedNode.gapData) {
                          onCreateDocFromLink(selectedNode.gapData.title);
                          setSelectedNodeId(null);
                        }
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 px-3 text-[10px] font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <Plus className="h-3 w-3" /> Provision Missing Doc & Write Outline
                    </button>
                  </div>
                ) : (
                  // Document node Details
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] text-gray-600 truncate">
                      Category: <span className="font-semibold text-gray-800">
                        {shelves.find(s => s.id === selectedNode.category)?.name || selectedNode.category}
                      </span>
                    </p>
                    {selectedNode.docData?.tags && selectedNode.docData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.docData.tags.map(tag => (
                          <span key={tag} className="text-[8px] bg-white border border-gray-100 rounded-md px-1.5 py-0.5 text-gray-500 font-semibold flex items-center gap-0.5">
                            <Tag className="h-2 w-2" /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (selectedNode.docData) {
                          onOpenDoc(selectedNode.docData);
                        }
                      }}
                      className="w-full border border-gray-200 hover:border-indigo-600 hover:bg-indigo-50/10 text-gray-700 hover:text-indigo-600 rounded-xl py-1.5 px-3 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <BookOpen className="h-3 w-3" /> Open in Workspace Editor
                    </button>
                  </div>
                )}
              </div>

              {/* Connected edges details */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Node Relationships ({connectedEdgesAndNodes.length})
                </span>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {connectedEdgesAndNodes.map(({ edge, node }) => (
                    <div 
                      key={node.id}
                      onClick={() => handleFocusGap(node.id)}
                      className="group p-2 hover:bg-gray-50 border border-gray-100 hover:border-indigo-150 rounded-xl cursor-pointer transition-all flex items-center gap-2"
                    >
                      <div 
                        className={`h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          node.isGap ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {node.isGap ? '?' : <FileText className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-bold text-gray-700 truncate group-hover:text-indigo-950">{node.label}</h4>
                        <p className="text-[8px] text-gray-400 truncate mt-0.5 leading-tight">{edge.reason || 'Semantic connection'}</p>
                      </div>
                      <span className="text-[8px] font-mono bg-gray-50 border border-gray-150 px-1 py-0.2 rounded font-bold text-gray-500">
                        {(edge.strength * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // B. Default Sidebar State: List Knowledge Gaps & Search
            <div className="flex flex-col gap-4">
              
              {/* Search filter input inside sidebar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Prefix match labels in graph..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-1.8 text-[11px] focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-colors"
                />
              </div>

              {searchQuery.trim() && (
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                    Matched Nodes ({searchedNodes.length})
                  </span>
                  <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                    {searchedNodes.map(node => (
                      <button
                        key={node.id}
                        onClick={() => handleFocusGap(node.id)}
                        className="w-full text-left p-1.5 hover:bg-indigo-50/30 border border-transparent hover:border-indigo-100 rounded-lg text-[10px] font-semibold text-gray-700 truncate flex items-center gap-2 cursor-pointer"
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                        <span className="truncate">{node.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Knowledge Gaps list section */}
              <div className="flex flex-col gap-2.5 flex-1 min-h-[250px]">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> Uncovered Knowledge Gaps ({knowledgeGaps.length})
                </span>

                <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {knowledgeGaps.length > 0 ? (
                    knowledgeGaps.map((gap, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleFocusGap(`gap-${idx}`)}
                        className="group border border-gray-150 hover:border-amber-300 bg-white hover:bg-amber-50/10 p-3 rounded-2xl cursor-pointer transition-all flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className="text-[11px] font-bold text-gray-800 leading-tight group-hover:text-amber-950 truncate max-w-[180px]">{gap.title}</h4>
                          <span className="text-[8px] font-mono bg-amber-50 text-amber-700 font-extrabold border border-amber-200 px-1.5 py-0.2 rounded shrink-0 uppercase">
                            {gap.relevance}
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-500 leading-normal truncate max-w-[210px]">{gap.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 justify-between">
                          <span className="text-[8px] text-gray-400 font-mono">Bridge: {gap.relatedDocIds.length} files</span>
                          <span className="text-[8px] text-indigo-600 font-bold group-hover:underline flex items-center gap-0.5">
                            Zoom to Discover <ChevronRight className="h-2 w-2" />
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-4 gap-2">
                      <HelpCircle className="h-7 w-7 text-gray-300 stroke-[1.5]" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">No analyzed gaps</span>
                        <span className="text-[9px] text-gray-400 max-w-[180px] mt-0.5 leading-normal">
                          Run the library scan above to find content opportunities in your documents.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick API key missing helper box if error occurs */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2.5 animate-fadeIn select-none mt-2">
              <BadgeAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Analysis Failed</h5>
                <p className="text-[9px] text-red-600 leading-normal mt-0.5">{error}</p>
                <button
                  onClick={handleAnalyzeLibrary}
                  className="mt-2 text-[9px] text-indigo-600 hover:underline font-bold flex items-center gap-1"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Retry scan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
