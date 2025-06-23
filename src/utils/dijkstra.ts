import { Graph, PathResult } from '@/types/graph';

export class GraphAlgorithms {
  private static calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  // Encuentra el punto más cercano en la polilínea del camino maestro
  private static findClosestPointOnMasterPath(nodeX: number, nodeY: number, masterPath: Array<{x: number, y: number}>): {point: {x: number, y: number}, distance: number} {
    let minDistance = Infinity;
    let closestPoint = masterPath[0];

    for (let i = 0; i < masterPath.length - 1; i++) {
      const start = masterPath[i];
      const end = masterPath[i + 1];
      
      // Encontrar el punto más cercano en el segmento
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

      const distance = this.calculateDistance(nodeX, nodeY, xx, yy);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = {x: xx, y: yy};
      }
    }

    return {point: closestPoint, distance: minDistance};
  }

  // Calcula la distancia a lo largo del camino maestro entre dos puntos
  private static calculateDistanceAlongMasterPath(point1: {x: number, y: number}, point2: {x: number, y: number}, masterPath: Array<{x: number, y: number}>): number {
    // Encuentra las posiciones de los puntos en la polilínea
    let pos1 = 0, pos2 = 0;
    let found1 = false, found2 = false;
    let accumulatedDistance = 0;

    for (let i = 0; i < masterPath.length - 1; i++) {
      const segmentDistance = this.calculateDistance(masterPath[i].x, masterPath[i].y, masterPath[i + 1].x, masterPath[i + 1].y);
      
      // Verificar si point1 está en este segmento
      if (!found1) {
        const distToStart = this.calculateDistance(point1.x, point1.y, masterPath[i].x, masterPath[i].y);
        const distToEnd = this.calculateDistance(point1.x, point1.y, masterPath[i + 1].x, masterPath[i + 1].y);
        if (distToStart + distToEnd <= segmentDistance + 1) { // Tolerancia de 1px
          pos1 = accumulatedDistance + distToStart;
          found1 = true;
        }
      }

      // Verificar si point2 está en este segmento
      if (!found2) {
        const distToStart = this.calculateDistance(point2.x, point2.y, masterPath[i].x, masterPath[i].y);
        const distToEnd = this.calculateDistance(point2.x, point2.y, masterPath[i + 1].x, masterPath[i + 1].y);
        if (distToStart + distToEnd <= segmentDistance + 1) { // Tolerancia de 1px
          pos2 = accumulatedDistance + distToStart;
          found2 = true;
        }
      }

      accumulatedDistance += segmentDistance;
    }

    return Math.abs(pos2 - pos1);
  }

  static dijkstra(graph: Graph, startNodeId: string): Map<string, PathResult> {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Initialize distances
    graph.nodes.forEach(node => {
      distances.set(node.id, node.id === startNodeId ? 0 : Infinity);
      previous.set(node.id, null);
      unvisited.add(node.id);
    });

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
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

      // Update distances to neighbors
      const currentNodeData = graph.nodes.find(n => n.id === currentNode);
      if (!currentNodeData) continue;

      graph.edges.forEach(edge => {
        let neighborId: string | null = null;
        
        if (edge.from === currentNode) {
          neighborId = edge.to;
        } else if (edge.to === currentNode) {
          neighborId = edge.from;
        }

        if (neighborId && unvisited.has(neighborId)) {
          const neighborNode = graph.nodes.find(n => n.id === neighborId);
          if (!neighborNode) return;

          // Use actual distance between nodes
          const edgeWeight = this.calculateDistance(
            currentNodeData.x, currentNodeData.y,
            neighborNode.x, neighborNode.y
          );

          const altDistance = (distances.get(currentNode) || 0) + edgeWeight;
          
          if (altDistance < (distances.get(neighborId) || Infinity)) {
            distances.set(neighborId, altDistance);
            previous.set(neighborId, currentNode);
          }
        }
      });
    }

    // Build paths
    const results = new Map<string, PathResult>();
    
    graph.nodes.forEach(node => {
      if (node.id === startNodeId) return;
      
      const path: string[] = [];
      let current: string | null = node.id;
      
      while (current !== null) {
        path.unshift(current);
        current = previous.get(current) || null;
      }
      
      if (path[0] === startNodeId) {
        results.set(node.id, {
          path,
          totalDistance: distances.get(node.id) || Infinity
        });
      }
    });

    return results;
  }

  static findMinimumSpanningTree(graph: Graph): { edges: Array<{from: string, to: string}>, totalWeight: number } {
    if (graph.nodes.length === 0) return { edges: [], totalWeight: 0 };
    if (graph.nodes.length === 1) return { edges: [], totalWeight: 0 };

    const masterPath = graph.masterPaths.length > 0 ? graph.masterPaths[0] : null;
    const allPossibleEdges: Array<{from: string, to: string, weight: number}> = [];
    
    for (let i = 0; i < graph.nodes.length; i++) {
      for (let j = i + 1; j < graph.nodes.length; j++) {
        const nodeA = graph.nodes[i];
        const nodeB = graph.nodes[j];
        
        let weight: number;
        
        if (masterPath && masterPath.points.length > 1) {
          // Si hay un camino maestro, calcular distancia considerándolo
          const closestA = this.findClosestPointOnMasterPath(nodeA.x, nodeA.y, masterPath.points);
          const closestB = this.findClosestPointOnMasterPath(nodeB.x, nodeB.y, masterPath.points);
          
          // Distancia = distancia del nodo A al camino maestro + distancia a lo largo del camino maestro + distancia del camino maestro al nodo B
          const distanceAlongPath = this.calculateDistanceAlongMasterPath(closestA.point, closestB.point, masterPath.points);
          weight = closestA.distance + distanceAlongPath + closestB.distance;
        } else {
          // Sin camino maestro, usar distancia directa
          weight = this.calculateDistance(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
        }
        
        allPossibleEdges.push({
          from: nodeA.id,
          to: nodeB.id,
          weight
        });
      }
    }

    // Ordenar por peso (algoritmo de Kruskal)
    allPossibleEdges.sort((a, b) => a.weight - b.weight);

    // Union-Find para detectar ciclos
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();

    // Inicializar Union-Find
    graph.nodes.forEach(node => {
      parent.set(node.id, node.id);
      rank.set(node.id, 0);
    });

    const find = (x: string): string => {
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    };

    const union = (x: string, y: string): boolean => {
      const rootX = find(x);
      const rootY = find(y);
      
      if (rootX === rootY) return false;
      
      const rankX = rank.get(rootX) || 0;
      const rankY = rank.get(rootY) || 0;
      
      if (rankX < rankY) {
        parent.set(rootX, rootY);
      } else if (rankX > rankY) {
        parent.set(rootY, rootX);
      } else {
        parent.set(rootY, rootX);
        rank.set(rootX, rankX + 1);
      }
      
      return true;
    };

    const mstEdges: Array<{from: string, to: string}> = [];
    let totalWeight = 0;

    // Algoritmo de Kruskal
    for (const edge of allPossibleEdges) {
      if (union(edge.from, edge.to)) {
        mstEdges.push({from: edge.from, to: edge.to});
        totalWeight += edge.weight;
        
        // Si ya tenemos n-1 aristas, hemos terminado
        if (mstEdges.length === graph.nodes.length - 1) {
          break;
        }
      }
    }

    return { edges: mstEdges, totalWeight };
  }
}
