
import { useRef, useEffect, useState, useCallback } from 'react';
import { Node, Edge, Graph } from '@/types/graph';
import { GraphAlgorithms } from '@/utils/dijkstra';
import { toast } from 'sonner';

interface GraphCanvasProps {
  activeTool: 'select' | 'addNode' | 'addEdge' | 'setMain';
  graph: Graph;
  onGraphChange: (graph: Graph) => void;
  optimalPaths?: Map<string, any>;
  showOptimalPaths: boolean;
}

export const GraphCanvas = ({
  activeTool,
  graph,
  onGraphChange,
  optimalPaths,
  showOptimalPaths
}: GraphCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [edgeStart, setEdgeStart] = useState<string | null>(null);

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

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
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
          toast.success(`Bloque agregado: ${newNode.label}`);
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
                weight: 1
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
  }, [activeTool, graph, onGraphChange, edgeStart, getCanvasCoordinates, findNodeAt]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
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
  }, [activeTool, getCanvasCoordinates, findNodeAt]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!draggedNode || activeTool !== 'select') return;
    
    const coords = getCanvasCoordinates(event);
    const updatedNodes = graph.nodes.map(node =>
      node.id === draggedNode
        ? { ...node, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }
        : node
    );
    
    onGraphChange({
      ...graph,
      nodes: updatedNodes
    });
  }, [draggedNode, activeTool, graph, onGraphChange, dragOffset, getCanvasCoordinates]);

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

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

    // Draw edges
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

        // Draw distance label
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        const distance = Math.sqrt(Math.pow(toNode.x - fromNode.x, 2) + Math.pow(toNode.y - fromNode.y, 2));
        
        ctx.fillStyle = '#475569';
        ctx.font = '12px sans-serif';
        ctx.fillText(distance.toFixed(0), midX + 5, midY - 5);
      }
    });

    // Draw optimal paths if showing
    if (showOptimalPaths && optimalPaths) {
      const mainNode = graph.nodes.find(n => n.isMain);
      if (mainNode) {
        optimalPaths.forEach((pathResult, targetNodeId) => {
          for (let i = 0; i < pathResult.path.length - 1; i++) {
            const fromNode = graph.nodes.find(n => n.id === pathResult.path[i]);
            const toNode = graph.nodes.find(n => n.id === pathResult.path[i + 1]);
            
            if (fromNode && toNode) {
              ctx.beginPath();
              ctx.moveTo(fromNode.x, fromNode.y);
              ctx.lineTo(toNode.x, toNode.y);
              ctx.strokeStyle = '#16a34a';
              ctx.lineWidth = 4;
              ctx.stroke();
            }
          }
        });
      }
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

      // Draw node label
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
  }, [graph, selectedNode, edgeStart, activeTool, showOptimalPaths, optimalPaths]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg bg-white">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};
