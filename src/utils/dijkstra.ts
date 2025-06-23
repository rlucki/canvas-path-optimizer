
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

  static findMinimumSpanningTree(graph: Graph): { edges: string[], totalWeight: number } {
    if (graph.nodes.length === 0) return { edges: [], totalWeight: 0 };

    const mstEdges: string[] = [];
    const visited = new Set<string>();
    let totalWeight = 0;

    // Start with the main node or first node
    const mainNode = graph.nodes.find(n => n.isMain) || graph.nodes[0];
    visited.add(mainNode.id);

    while (visited.size < graph.nodes.length) {
      let minEdge: { id: string, weight: number } | null = null;

      graph.edges.forEach(edge => {
        const fromVisited = visited.has(edge.from);
        const toVisited = visited.has(edge.to);

        // Edge connects visited to unvisited
        if (fromVisited !== toVisited) {
          const fromNode = graph.nodes.find(n => n.id === edge.from);
          const toNode = graph.nodes.find(n => n.id === edge.to);
          
          if (fromNode && toNode) {
            const weight = this.calculateDistance(
              fromNode.x, fromNode.y,
              toNode.x, toNode.y
            );

            if (!minEdge || weight < minEdge.weight) {
              minEdge = { id: edge.id, weight };
            }
          }
        }
      });

      if (minEdge) {
        mstEdges.push(minEdge.id);
        totalWeight += minEdge.weight;
        
        const edge = graph.edges.find(e => e.id === minEdge!.id);
        if (edge) {
          visited.add(edge.from);
          visited.add(edge.to);
        }
      } else {
        break; // No more edges to add
      }
    }

    return { edges: mstEdges, totalWeight };
  }
}
