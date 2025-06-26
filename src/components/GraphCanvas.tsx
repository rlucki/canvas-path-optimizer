import { useRef, useEffect, useState, useCallback } from 'react';
import { Node, Edge, Graph, MasterPath } from '@/types/graph';
import { toast } from 'sonner';

interface GraphCanvasProps {
  activeTool: 'select' | 'addNode' | 'addEdge' | 'setMain' | 'masterPath' | 'measureDistance';
  graph: Graph;
  onGraphChange: (graph: Graph) => void;
  optimalMST?: Array<{from: string, to: string}>;
  showOptimalPaths: boolean;
  isDrawingMasterPath: boolean;
  optimizedConnections?: Array<{from: string, to: string, segments: Array<{start: {x: number, y: number}, end: {x: number, y: number}}>}>;
}

interface PathSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
  distance: number;
  type: 'connection' | 'bifurcation' | 'master';
  label?: string;
}

export const GraphCanvas = ({
  activeTool,
  graph,
  onGraphChange,
  optimalMST,
  showOptimalPaths,
  isDrawingMasterPath,
  optimizedConnections
}: GraphCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  const [currentMasterPath, setCurrentMasterPath] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [measurementPath, setMeasurementPath] = useState<PathSegment[] | null>(null);
  const [measuredNodeId, setMeasuredNodeId] = useState<string | null>(null);

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

  const calculateDistance = useCallback((x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }, []);

  const getMainNode = useCallback((): Node | null => {
    return graph.nodes.find(node => node.isMain) || (graph.nodes.length > 0 ? graph.nodes[0] : null);
  }, [graph.nodes]);

  const findOptimizedPathToMainNode = useCallback((targetNodeId: string): PathSegment[] | null => {
    const mainNode = getMainNode();
    if (!mainNode || !optimizedConnections || optimizedConnections.length === 0) {
      return null;
    }

    // Crear un mapa de todas las posiciones conocidas
    const allPositions = new Map<string, {x: number, y: number}>();
    const adjacencyList = new Map<string, Array<{nodeId: string, distance: number, segmentInfo: {start: {x: number, y: number}, end: {x: number, y: number}, type: string}}>>();

    // Agregar posiciones de nodos reales
    graph.nodes.forEach(node => {
      allPositions.set(node.id, {x: node.x, y: node.y});
      adjacencyList.set(node.id, []);
    });

    // Procesar todas las conexiones optimizadas
    optimizedConnections.forEach(connection => {
      connection.segments.forEach(segment => {
        const startKey = `${segment.start.x.toFixed(1)},${segment.start.y.toFixed(1)}`;
        const endKey = `${segment.end.x.toFixed(1)},${segment.end.y.toFixed(1)}`;
        
        // Agregar posiciones
        allPositions.set(startKey, segment.start);
        allPositions.set(endKey, segment.end);
        
        if (!adjacencyList.has(startKey)) adjacencyList.set(startKey, []);
        if (!adjacencyList.has(endKey)) adjacencyList.set(endKey, []);

        const distance = calculateDistance(segment.start.x, segment.start.y, segment.end.x, segment.end.y);
        
        // Determinar el tipo de conexión
        let connectionType = 'connection';
        if (connection.to === 'master') connectionType = 'master';
        else if (connection.to === 'bifurcation') connectionType = 'bifurcation';

        // Crear conexiones bidireccionales con información del segmento
        const segmentInfo = {
          start: segment.start,
          end: segment.end,
          type: connectionType
        };

        adjacencyList.get(startKey)?.push({
          nodeId: endKey, 
          distance, 
          segmentInfo
        });
        adjacencyList.get(endKey)?.push({
          nodeId: startKey, 
          distance, 
          segmentInfo
        });
      });

      // Conectar nodos reales a la red de conexiones
      const fromNode = graph.nodes.find(n => n.id === connection.from);
      if (fromNode) {
        // Encontrar el punto más cercano en los segmentos
        let closestPoint = null;
        let minDistance = Infinity;
        let closestSegment = null;
        
        connection.segments.forEach(segment => {
          const startDistance = calculateDistance(fromNode.x, fromNode.y, segment.start.x, segment.start.y);
          const endDistance = calculateDistance(fromNode.x, fromNode.y, segment.end.x, segment.end.y);
          
          if (startDistance < minDistance) {
            minDistance = startDistance;
            closestPoint = `${segment.start.x.toFixed(1)},${segment.start.y.toFixed(1)}`;
            closestSegment = segment;
          }
          if (endDistance < minDistance) {
            minDistance = endDistance;
            closestPoint = `${segment.end.x.toFixed(1)},${segment.end.y.toFixed(1)}`;
            closestSegment = segment;
          }
        });
        
        if (closestPoint && minDistance < 30 && closestSegment) {
          const segmentInfo = {
            start: { x: fromNode.x, y: fromNode.y },
            end: allPositions.get(closestPoint)!,
            type: 'connection'
          };

          adjacencyList.get(connection.from)?.push({
            nodeId: closestPoint, 
            distance: minDistance, 
            segmentInfo
          });
          adjacencyList.get(closestPoint)?.push({
            nodeId: connection.from, 
            distance: minDistance, 
            segmentInfo
          });
        }
      }
    });

    // Usar algoritmo de Dijkstra para encontrar el camino más corto
    const distances = new Map<string, number>();
    const previous = new Map<string, {nodeId: string | null, segmentInfo: any}>();
    const unvisited = new Set<string>();

    // Inicializar
    for (const nodeId of allPositions.keys()) {
      distances.set(nodeId, nodeId === targetNodeId ? 0 : Infinity);
      previous.set(nodeId, {nodeId: null, segmentInfo: null});
      unvisited.add(nodeId);
    }

    while (unvisited.size > 0) {
      // Encontrar nodo no visitado con distancia mínima
      let currentNode: string | null = null;
      let minDistance = Infinity;
      
      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = nodeId;
        }
      }

      if (!currentNode || minDistance === Infinity) break;
      unvisited.delete(currentNode);

      if (currentNode === mainNode.id) break;

      // Actualizar distancias a vecinos
      const neighbors = adjacencyList.get(currentNode) || [];
      for (const neighbor of neighbors) {
        if (unvisited.has(neighbor.nodeId)) {
          const altDistance = (distances.get(currentNode) || 0) + neighbor.distance;
          
          if (altDistance < (distances.get(neighbor.nodeId) || Infinity)) {
            distances.set(neighbor.nodeId, altDistance);
            previous.set(neighbor.nodeId, {
              nodeId: currentNode,
              segmentInfo: neighbor.segmentInfo
            });
          }
        }
      }
    }

    // Reconstruir el camino
    if (!previous.get(mainNode.id)?.nodeId) return null;

    const pathSegments: PathSegment[] = [];
    let current: string | null = mainNode.id;
    
    while (current !== null) {
      const prevInfo = previous.get(current);
      if (prevInfo?.nodeId && prevInfo?.segmentInfo) {
        const segment = prevInfo.segmentInfo;
        pathSegments.unshift({
          start: segment.start,
          end: segment.end,
          distance: calculateDistance(segment.start.x, segment.start.y, segment.end.x, segment.end.y),
          type: segment.type as 'connection' | 'bifurcation' | 'master',
          label: `${calculateDistance(segment.start.x, segment.start.y, segment.end.x, segment.end.y).toFixed(1)}m`
        });
      }
      current = prevInfo?.nodeId || null;
    }

    return pathSegments.length > 0 ? pathSegments : null;
  }, [graph.nodes, optimizedConnections, calculateDistance, getMainNode]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (isDrawingMasterPath) return;
    
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

      case 'measureDistance':
        if (clickedNode) {
          const mainNode = getMainNode();
          if (!mainNode) {
            toast.error('No hay bloque principal definido');
            setMeasurementPath(null);
            setMeasuredNodeId(null);
            return;
          }
          
          if (clickedNode.id === mainNode.id) {
            toast.info('Este es el bloque principal (distancia: 0 metros)');
            setMeasurementPath(null);
            setMeasuredNodeId(null);
            return;
          }

          // Buscar el camino optimizado
          const pathSegments = findOptimizedPathToMainNode(clickedNode.id);
          
          if (pathSegments && pathSegments.length > 0) {
            setMeasurementPath(pathSegments);
            setMeasuredNodeId(clickedNode.id);
            
            const totalDistance = pathSegments.reduce((sum, segment) => sum + segment.distance, 0);
            const segmentDetails = pathSegments.map((segment, index) => 
              `Tramo ${index + 1}: ${segment.distance.toFixed(1)}m (${segment.type})`
            ).join('\n');
            
            toast.success(`Recorrido desde ${clickedNode.label} al bloque principal:\n${segmentDetails}\nDistancia total: ${totalDistance.toFixed(1)} metros`);
          } else {
            // Fallback: línea directa si no hay conexión optimizada
            const directDistance = calculateDistance(clickedNode.x, clickedNode.y, mainNode.x, mainNode.y);
            setMeasurementPath([{
              start: { x: clickedNode.x, y: clickedNode.y },
              end: { x: mainNode.x, y: mainNode.y },
              distance: directDistance,
              type: 'connection',
              label: `${directDistance.toFixed(1)}m (directo)`
            }]);
            setMeasuredNodeId(clickedNode.id);
            toast.warning(`No hay camino optimizado. Distancia directa: ${directDistance.toFixed(1)} metros`);
          }
        } else {
          toast.info('Haz clic en un bloque para medir su distancia al bloque principal');
          setMeasurementPath(null);
          setMeasuredNodeId(null);
        }
        break;
    }
  }, [activeTool, graph, onGraphChange, edgeStart, getCanvasCoordinates, findNodeAt, isDrawingMasterPath, getMainNode, calculateDistance, findOptimizedPathToMainNode]);

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

  // Limpiar medición cuando se cambia de herramienta
  useEffect(() => {
    if (activeTool !== 'measureDistance') {
      setMeasurementPath(null);
      setMeasuredNodeId(null);
    }
  }, [activeTool]);

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

    // Draw optimized connections (nuevo sistema de bifurcaciones)
    if (showOptimalPaths && optimizedConnections) {
      // Dibujar puntos de bifurcación
      const bifurcationPoints = new Set<string>();
      
      optimizedConnections.forEach(connection => {
        connection.segments.forEach(segment => {
          // Dibujar cada segmento
          ctx.beginPath();
          ctx.moveTo(segment.start.x, segment.start.y);
          ctx.lineTo(segment.end.x, segment.end.y);
          
          // Diferentes estilos según el tipo de conexión
          if (connection.to === 'master') {
            // Conexión al camino maestro (sólida)
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 6;
            ctx.setLineDash([]);
          } else if (connection.to === 'bifurcation') {
            // Conexión a punto de bifurcación (rayada)
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 4]);
          } else {
            // Conexiones directas (sólida fina)
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
          }
          
          ctx.stroke();
          ctx.setLineDash([]);

          // Marcar puntos de bifurcación
          if (connection.to === 'bifurcation') {
            bifurcationPoints.add(`${segment.end.x},${segment.end.y}`);
          }
        });
      });

      // Dibujar puntos de bifurcación como círculos verdes
      bifurcationPoints.forEach(pointStr => {
        const [x, y] = pointStr.split(',').map(Number);
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#16a34a';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    } else if (showOptimalPaths && optimalMST) {
      optimalMST.forEach(edge => {
        const fromNode = graph.nodes.find(n => n.id === edge.from);
        const toNode = graph.nodes.find(n => n.id === edge.to);
        
        if (fromNode && toNode) {
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(toNode.x, toNode.y);
          ctx.strokeStyle = '#16a34a';
          ctx.lineWidth = 4;
          ctx.stroke();
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

    // Draw measurement path with individual segment lengths
    if (measurementPath && activeTool === 'measureDistance') {
      measurementPath.forEach((segment, index) => {
        // Dibujar el segmento con color según tipo
        ctx.beginPath();
        ctx.moveTo(segment.start.x, segment.start.y);
        ctx.lineTo(segment.end.x, segment.end.y);
        
        // Color según tipo de conexión
        switch (segment.type) {
          case 'master':
            ctx.strokeStyle = '#3b82f6'; // Azul para conexión a master path
            break;
          case 'bifurcation':
            ctx.strokeStyle = '#f59e0b'; // Amber para bifurcaciones
            break;
          default:
            ctx.strokeStyle = '#3b82f6'; // Azul por defecto
        }
        
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dibujar la distancia del segmento
        const midX = (segment.start.x + segment.end.x) / 2;
        const midY = (segment.start.y + segment.end.y) / 2;
        
        // Fondo blanco para el texto
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(midX - 30, midY - 12, 60, 20);
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 1;
        ctx.strokeRect(midX - 30, midY - 12, 60, 20);
        
        // Texto con la distancia
        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${segment.distance.toFixed(1)}m`, midX, midY + 2);

        // Dibujar puntos de conexión
        ctx.beginPath();
        ctx.arc(segment.start.x, segment.start.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = segment.type === 'bifurcation' ? '#f59e0b' : '#3b82f6';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(segment.end.x, segment.end.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = segment.type === 'bifurcation' ? '#f59e0b' : '#3b82f6';
        ctx.fill();
      });

      // Mostrar distancia total del recorrido
      const totalDistance = measurementPath.reduce((sum, seg) => sum + seg.distance, 0);
      const lastPoint = measurementPath[measurementPath.length - 1].end;
      
      // Fondo para el total
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lastPoint.x - 50, lastPoint.y - 40, 100, 25);
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.strokeRect(lastPoint.x - 50, lastPoint.y - 40, 100, 25);
      
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#dc2626';
      ctx.fillText(`Total: ${totalDistance.toFixed(1)}m`, lastPoint.x, lastPoint.y - 22);

      // Resaltar el nodo medido
      const measuredNode = graph.nodes.find(n => n.id === measuredNodeId);
      if (measuredNode) {
        ctx.beginPath();
        ctx.arc(measuredNode.x, measuredNode.y, 35, 0, 2 * Math.PI);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Highlight node when measuring distance
    if (activeTool === 'measureDistance') {
      const mainNode = getMainNode();
      if (mainNode) {
        ctx.beginPath();
        ctx.arc(mainNode.x, mainNode.y, 30, 0, 2 * Math.PI);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [graph, selectedNode, edgeStart, activeTool, showOptimalPaths, optimalMST, currentMasterPath, optimizedConnections, measurementPath, measuredNodeId, getMainNode]);

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
