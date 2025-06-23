
import { Graph, PathResult } from '@/types/graph';

export class GraphAlgorithms {
  private static calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
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

    // Crear todas las posibles conexiones con sus pesos
    const allPossibleEdges: Array<{from: string, to: string, weight: number}> = [];
    
    for (let i = 0; i < graph.nodes.length; i++) {
      for (let j = i + 1; j < graph.nodes.length; j++) {
        const nodeA = graph.nodes[i];
        const nodeB = graph.nodes[j];
        const weight = this.calculateDistance(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
        
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
