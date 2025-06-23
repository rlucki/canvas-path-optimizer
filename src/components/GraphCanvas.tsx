import { useRef, useEffect, useState, useCallback } from 'react';
import { Node, Edge, Graph, MasterPath } from '@/types/graph';
import { toast } from 'sonner';

interface GraphCanvasProps {
  activeTool: 'select' | 'addNode' | 'addEdge' | 'setMain' | 'masterPath';
  graph: Graph;
  onGraphChange: (graph: Graph) => void;
  optimalMST?: Array<{from: string, to: string}>;
  showOptimalPaths: boolean;
  isDrawingMasterPath: boolean;
}

export const GraphCanvas = ({
  activeTool,
  graph,
  onGraphChange,
  optimalMST,
  showOptimalPaths,
  isDrawingMasterPath
}: GraphCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  const [currentMasterPath, setCurrentMasterPath] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCanvasCoordinates = useCallback((event: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }, []);

  const findNodeAt = useCallback((x: number, y: number): Node | null => {
    return graph.nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= 25;
    }) || null;
  }, [graph.nodes]);

  const findClosestPointOnMasterPath = useCallback((nodeX: number, nodeY: number, masterPath: Array<{x: number, y: number}>): {point: {x: number, y: number}, distance: number} => {
    let minDistance = Infinity;
    let closestPoint = masterPath[0];

    for (let i = 0; i < masterPath.length - 1; i++) {
      const start = masterPath[i];
      const end = masterPath[i + 1];
      
      const A = nodeX - start.x;
      const B = nodeY - start.y;
      const C = end.x - start.x;
      const D = end.y - start.y;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      
      let param = -1;
      if (lenSq !== 0) {
        param = dot / lenSq;
      }

      let xx, yy;
      if (param < 0) {
        xx = start.x;
        yy = start.y;
      } else if (param > 1) {
        xx = end.x;
        yy = end.y;
      } else {
        xx = start.x + param * C;
        yy = start.y + param * D;
      }

      const distance = Math.sqrt(Math.pow(nodeX - xx, 2) + Math.pow(nodeY - yy, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = {x: xx, y: yy};
      }
    }

    return {point: closestPoint, distance: minDistance};
  }, []);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (isDrawingMasterPath) return; // No permitir clicks normales mientras se dibuja
    
    const coords = getCanvasCoordinates(event);
    const clickedNode = findNodeAt(coords.x, coords.y);

    switch (activeTool) {
      case 'addNode':
        if (!clickedNode) {
          const newNode: Node = {
            id: `node-${Date.now()}`,
            x: coords.x,
            y: coords.y,
            isMain: graph.nodes.length === 0,
            label: `Bloque ${graph.nodes.length + 1}`
          };

          onGraphChange({
            ...graph,
            nodes: [...graph.nodes, newNode]
          });
          toast.success(`${newNode.label} agregado`);
        }
        break;

      case 'addEdge':
        if (clickedNode) {
          if (!edgeStart) {
            setEdgeStart(clickedNode.id);
            toast.info('Selecciona el segundo bloque para conectar');
          } else if (edgeStart !== clickedNode.id) {
            const edgeExists = graph.edges.some(edge =>
              (edge.from === edgeStart && edge.to === clickedNode.id) ||
              (edge.from === clickedNode.id && edge.to === edgeStart)
            );

            if (!edgeExists) {
              const newEdge: Edge = {
                id: `edge-${Date.now()}`,
                from: edgeStart,
                to: clickedNode.id,
                weight: 1,
                isMaster: false
              };
              onGraphChange({
                ...graph,
                edges: [...graph.edges, newEdge]
              });
              toast.success('Conexión creada');
            } else {
              toast.warning('Ya existe una conexión entre estos bloques');
            }
            setEdgeStart(null);
          }
        } else {
          setEdgeStart(null);
        }
        break;

      case 'setMain':
        if (clickedNode) {
          const updatedNodes = graph.nodes.map(node => ({
            ...node,
            isMain: node.id === clickedNode.id
          }));
          onGraphChange({
            ...graph,
            nodes: updatedNodes
          });
          toast.success(`${clickedNode.label} marcado como principal`);
        }
        break;

      case 'select':
        setSelectedNode(clickedNode?.id || null);
        break;
    }
  }, [activeTool, graph, onGraphChange, edgeStart, getCanvasCoordinates, findNodeAt, isDrawingMasterPath]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (isDrawingMasterPath && activeTool === 'masterPath') {
      const coords = getCanvasCoordinates(event);
      setCurrentMasterPath([coords]);
      setIsDrawing(true);
      return;
    }

    if (activeTool !== 'select') return;
    
    const coords = getCanvasCoordinates(event);
    const clickedNode = findNodeAt(coords.x, coords.y);
    
    if (clickedNode) {
      setDraggedNode(clickedNode.id);
      setDragOffset({
        x: coords.x - clickedNode.x,
        y: coords.y - clickedNode.y
      });
    }
  }, [activeTool, getCanvasCoordinates, findNodeAt, isDrawingMasterPath]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const coords = getCanvasCoordinates(event);

    if (isDrawing && isDrawingMasterPath && activeTool === 'masterPath') {
      // Agregar punto a la polilínea si está lo suficientemente lejos del último punto
      const lastPoint = currentMasterPath[currentMasterPath.length - 1];
      if (lastPoint) {
        const distance = Math.sqrt(Math.pow(coords.x - lastPoint.x, 2) + Math.pow(coords.y - lastPoint.y, 2));
        if (distance > 10) { // Mínima distancia entre puntos
          setCurrentMasterPath(prev => [...prev, coords]);
        }
      }
      return;
    }

    if (!draggedNode || activeTool !== 'select') return;
    
    const updatedNodes = graph.nodes.map(node =>
      node.id === draggedNode
        ? { ...node, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }
        : node
    );
    
    onGraphChange({
      ...graph,
      nodes: updatedNodes
    });
  }, [draggedNode, activeTool, graph, onGraphChange, dragOffset, getCanvasCoordinates, isDrawing, isDrawingMasterPath, currentMasterPath]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && isDrawingMasterPath) {
      if (currentMasterPath.length > 1) {
        const newMasterPath: MasterPath = {
          id: `masterpath-${Date.now()}`,
          points: currentMasterPath,
          isComplete: false
        };
        
        onGraphChange({
          ...graph,
          masterPaths: [...graph.masterPaths, newMasterPath]
        });
      }
      setCurrentMasterPath([]);
      setIsDrawing(false);
      return;
    }

    setDraggedNode(null);
  }, [isDrawing, isDrawingMasterPath, currentMasterPath, graph, onGraphChange]);

  // Limpiar camino maestro cuando se cambia de herramienta
  useEffect(() => {
    if (!isDrawingMasterPath) {
      setCurrentMasterPath([]);
      setIsDrawing(false);
    }
  }, [isDrawingMasterPath]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw completed master paths
    graph.masterPaths.forEach(masterPath => {
      if (masterPath.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(masterPath.points[0].x, masterPath.points[0].y);
        
        for (let i = 1; i < masterPath.points.length; i++) {
          ctx.lineTo(masterPath.points[i].x, masterPath.points[i].y);
        }
        
        ctx.strokeStyle = '#9333ea';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    });

    // Draw current master path being drawn
    if (currentMasterPath.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentMasterPath[0].x, currentMasterPath[0].y);
      
      for (let i = 1; i < currentMasterPath.length; i++) {
        ctx.lineTo(currentMasterPath[i].x, currentMasterPath[i].y);
      }
      
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([10, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw manual edges
    graph.edges.forEach(edge => {
      const fromNode = graph.nodes.find(n => n.id === edge.from);
      const toNode = graph.nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();

        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        const distance = Math.sqrt(Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2));
        
        ctx.fillStyle = '#475569';
        ctx.font = '12px sans-serif';
        ctx.fillText(distance.toFixed(0), midX + 5, midY - 5);
      }
    });

    // Draw optimal MST that respects master path
    if (showOptimalPaths && optimalMST) {
      const masterPath = graph.masterPaths.length > 0 ? graph.masterPaths[0] : null;
      
      optimalMST.forEach(mstEdge => {
        const fromNode = graph.nodes.find(n => n.id === mstEdge.from);
        const toNode = graph.nodes.find(n => n.id === mstEdge.to);
        
        if (fromNode && toNode) {
          if (masterPath && masterPath.points.length > 1) {
            // Dibujar conexión a través del camino maestro
            const closestA = findClosestPointOnMasterPath(fromNode.x, fromNode.y, masterPath.points);
            const closestB = findClosestPointOnMasterPath(toNode.x, toNode.y, masterPath.points);
            
            // Línea del nodo A al camino maestro
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(closestA.point.x, closestA.point.y);
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Línea del camino maestro al nodo B
            ctx.beginPath();
            ctx.moveTo(closestB.point.x, closestB.point.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Destacar el segmento del camino maestro que se usa
            ctx.beginPath();
            ctx.moveTo(closestA.point.x, closestA.point.y);
            ctx.lineTo(closestB.point.x, closestB.point.y);
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 6;
            ctx.stroke();
          } else {
            // Sin camino maestro, conexión directa
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 6;
            ctx.stroke();
          }
        }
      });
    }

    // Draw nodes
    graph.nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 25, 0, 2 * Math.PI);
      
      if (node.isMain) {
        ctx.fillStyle = '#dc2626';
      } else if (selectedNode === node.id) {
        ctx.fillStyle = '#3b82f6';
      } else {
        ctx.fillStyle = '#6366f1';
      }
      
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label.replace('Bloque ', ''), node.x, node.y + 4);
    });

    // Draw edge preview when creating edge
    if (edgeStart && activeTool === 'addEdge') {
      const startNode = graph.nodes.find(n => n.id === edgeStart);
      if (startNode) {
        ctx.beginPath();
        ctx.arc(startNode.x, startNode.y, 25, 0, 2 * Math.PI);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }, [graph, selectedNode, edgeStart, activeTool, showOptimalPaths, optimalMST, currentMasterPath, findClosestPointOnMasterPath]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg bg-white">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className={isDrawingMasterPath ? "cursor-crosshair" : "cursor-crosshair"}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};
