import { Node, MasterPath } from '@/types/graph';

interface ConnectionPoint {
  nodeId: string;
  masterPathPoint: { x: number; y: number };
  distanceToMaster: number;
  position: number; // Posición a lo largo del camino maestro
}

interface OptimizedConnection {
  sharedPoint: { x: number; y: number };
  nodeIds: string[];
  totalDistance: number;
}

interface ExistingConnection {
  start: { x: number; y: number };
  end: { x: number; y: number };
  connectedNodes: string[];
}

export class MSTOptimizer {
  private static calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  private static findClosestPointOnLine(nodeX: number, nodeY: number, lineStart: {x: number, y: number}, lineEnd: {x: number, y: number}): {point: {x: number, y: number}, distance: number} {
    const A = nodeX - lineStart.x;
    const B = nodeY - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const distance = this.calculateDistance(nodeX, nodeY, xx, yy);
    return {point: {x: xx, y: yy}, distance};
  }

  private static findClosestPointOnMasterPath(nodeX: number, nodeY: number, masterPath: Array<{x: number, y: number}>): {point: {x: number, y: number}, distance: number, position: number} {
    let minDistance = Infinity;
    let closestPoint = masterPath[0];
    let bestPosition = 0;

    for (let i = 0; i < masterPath.length - 1; i++) {
      const start = masterPath[i];
      const end = masterPath[i + 1];
      
      const result = this.findClosestPointOnLine(nodeX, nodeY, start, end);
      
      if (result.distance < minDistance) {
        minDistance = result.distance;
        closestPoint = result.point;
        
        // Calcular posición a lo largo del camino maestro
        let accumulatedDistance = 0;
        for (let j = 0; j < i; j++) {
          accumulatedDistance += this.calculateDistance(
            masterPath[j].x, masterPath[j].y,
            masterPath[j + 1].x, masterPath[j + 1].y
          );
        }
        
        const segmentDistance = this.calculateDistance(start.x, start.y, end.x, end.y);
        const pointOnSegmentDistance = this.calculateDistance(start.x, start.y, closestPoint.x, closestPoint.y);
        accumulatedDistance += pointOnSegmentDistance;
        bestPosition = accumulatedDistance;
      }
    }

    return {point: closestPoint, distance: minDistance, position: bestPosition};
  }

  static optimizeConnections(nodes: Node[], masterPath: MasterPath): Array<{from: string, to: string, segments: Array<{start: {x: number, y: number}, end: {x: number, y: number}}>}> {
    if (!masterPath || masterPath.points.length < 2) {
      return this.createDirectMST(nodes);
    }

    const connections: Array<{from: string, to: string, segments: Array<{start: {x: number, y: number}, end: {x: number, y: number}}>}> = [];
    const connectedNodes = new Set<string>();
    const existingConnections: ExistingConnection[] = [];

    // Procesar nodos de uno en uno, eligiendo la mejor conexión para cada uno
    const remainingNodes = [...nodes];
    
    // Comenzar con el nodo más cercano al camino maestro
    let currentNode = this.findClosestNodeToMasterPath(remainingNodes, masterPath);
    if (currentNode) {
      const closestToMaster = this.findClosestPointOnMasterPath(currentNode.x, currentNode.y, masterPath.points);
      
      connections.push({
        from: currentNode.id,
        to: 'master',
        segments: [{
          start: { x: currentNode.x, y: currentNode.y },
          end: closestToMaster.point
        }]
      });

      existingConnections.push({
        start: { x: currentNode.x, y: currentNode.y },
        end: closestToMaster.point,
        connectedNodes: [currentNode.id]
      });

      connectedNodes.add(currentNode.id);
      remainingNodes.splice(remainingNodes.findIndex(n => n.id === currentNode.id), 1);
    }

    // Para cada nodo restante, encontrar la mejor conexión
    while (remainingNodes.length > 0) {
      let bestNode: Node | null = null;
      let bestConnection: any = null;
      let bestDistance = Infinity;

      for (const node of remainingNodes) {
        // Opción 1: Conectar directamente al camino maestro
        const masterConnection = this.findClosestPointOnMasterPath(node.x, node.y, masterPath.points);
        
        if (masterConnection.distance < bestDistance) {
          bestDistance = masterConnection.distance;
          bestNode = node;
          bestConnection = {
            type: 'master',
            point: masterConnection.point,
            distance: masterConnection.distance
          };
        }

        // Opción 2: Conectar a una conexión existente
        for (const existingConn of existingConnections) {
          const connectionPoint = this.findClosestPointOnLine(
            node.x, node.y,
            existingConn.start,
            existingConn.end
          );

          if (connectionPoint.distance < bestDistance) {
            bestDistance = connectionPoint.distance;
            bestNode = node;
            bestConnection = {
              type: 'existing',
              point: connectionPoint.point,
              distance: connectionPoint.distance,
              existingConnection: existingConn
            };
          }
        }
      }

      if (bestNode && bestConnection) {
        if (bestConnection.type === 'master') {
          // Conectar al camino maestro
          connections.push({
            from: bestNode.id,
            to: 'master',
            segments: [{
              start: { x: bestNode.x, y: bestNode.y },
              end: bestConnection.point
            }]
          });

          existingConnections.push({
            start: { x: bestNode.x, y: bestNode.y },
            end: bestConnection.point,
            connectedNodes: [bestNode.id]
          });
        } else {
          // Conectar a una conexión existente
          connections.push({
            from: bestNode.id,
            to: 'bifurcation',
            segments: [{
              start: { x: bestNode.x, y: bestNode.y },
              end: bestConnection.point
            }]
          });

          // Crear nueva conexión que incluye este punto de bifurcación
          existingConnections.push({
            start: { x: bestNode.x, y: bestNode.y },
            end: bestConnection.point,
            connectedNodes: [bestNode.id]
          });

          // Extender la conexión existente hasta el punto de bifurcación
          const existingConn = bestConnection.existingConnection;
          existingConnections.push({
            start: bestConnection.point,
            end: existingConn.end,
            connectedNodes: [...existingConn.connectedNodes, bestNode.id]
          });
        }

        connectedNodes.add(bestNode.id);
        remainingNodes.splice(remainingNodes.findIndex(n => n.id === bestNode.id), 1);
      } else {
        break;
      }
    }

    return connections;
  }

  private static findClosestNodeToMasterPath(nodes: Node[], masterPath: MasterPath): Node | null {
    if (nodes.length === 0) return null;

    let closestNode = nodes[0];
    let minDistance = Infinity;

    for (const node of nodes) {
      const distance = this.findClosestPointOnMasterPath(node.x, node.y, masterPath.points).distance;
      if (distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    }

    return closestNode;
  }

  private static groupNearbyConnections(connectionPoints: ConnectionPoint[], nodes: Node[]): Array<ConnectionPoint[]> {
    const groups: Array<ConnectionPoint[]> = [];
    const used = new Set<string>();
    const POSITION_THRESHOLD = 100; // Distancia máxima en el camino maestro para agrupar
    const SPATIAL_THRESHOLD = 80; // Distancia máxima en el espacio para considerar agrupación

    for (const point of connectionPoints) {
      if (used.has(point.nodeId)) continue;

      const group = [point];
      used.add(point.nodeId);

      // Buscar nodos cercanos que puedan beneficiarse de una conexión compartida
      for (const otherPoint of connectionPoints) {
        if (used.has(otherPoint.nodeId)) continue;

        const positionDiff = Math.abs(point.position - otherPoint.position);
        const node1 = nodes.find(n => n.id === point.nodeId)!;
        const node2 = nodes.find(n => n.id === otherPoint.nodeId)!;
        const spatialDistance = this.calculateDistance(node1.x, node1.y, node2.x, node2.y);

        if (positionDiff < POSITION_THRESHOLD && spatialDistance < SPATIAL_THRESHOLD) {
          // Verificar si es más eficiente agrupar
          const separateDistance = point.distanceToMaster + otherPoint.distanceToMaster;
          
          // Calcular distancia si usáramos un punto común
          const sharedPoint = {
            x: (point.masterPathPoint.x + otherPoint.masterPathPoint.x) / 2,
            y: (point.masterPathPoint.y + otherPoint.masterPathPoint.y) / 2
          };
          
          const sharedDistance = 
            this.calculateDistance(node1.x, node1.y, sharedPoint.x, sharedPoint.y) +
            this.calculateDistance(node2.x, node2.y, sharedPoint.x, sharedPoint.y) +
            this.calculateDistance(sharedPoint.x, sharedPoint.y, point.masterPathPoint.x, point.masterPathPoint.y);

          if (sharedDistance < separateDistance * 1.1) { // 10% de tolerancia
            group.push(otherPoint);
            used.add(otherPoint.nodeId);
          }
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private static createOptimizedConnections(
    groups: Array<ConnectionPoint[]>,
    nodes: Node[],
    masterPath: MasterPath
  ): Array<{from: string, to: string, segments: Array<{start: {x: number, y: number}, end: {x: number, y: number}}>}> {
    const connections: Array<{from: string, to: string, segments: Array<{start: {x: number, y: number}, end: {x: number, y: number}}>}> = [];

    for (const group of groups) {
      if (group.length === 1) {
        // Conexión directa al camino maestro
        const point = group[0];
        const node = nodes.find(n => n.id === point.nodeId)!;
        connections.push({
          from: point.nodeId,
          to: 'master',
          segments: [{
            start: { x: node.x, y: node.y },
            end: point.masterPathPoint
          }]
        });
      } else {
        // Crear punto de bifurcación optimizado
        const centerX = group.reduce((sum, p) => {
          const node = nodes.find(n => n.id === p.nodeId)!;
          return sum + node.x;
        }, 0) / group.length;
        
        const centerY = group.reduce((sum, p) => {
          const node = nodes.find(n => n.id === p.nodeId)!;
          return sum + node.y;
        }, 0) / group.length;

        // Encontrar el mejor punto en el camino maestro para este grupo
        const avgPosition = group.reduce((sum, p) => sum + p.position, 0) / group.length;
        const sharedMasterPoint = this.findPointAtPosition(masterPath.points, avgPosition);

        // Crear punto de bifurcación
        const bifurcationPoint = {
          x: (centerX + sharedMasterPoint.x) / 2,
          y: (centerY + sharedMasterPoint.y) / 2
        };

        // Conexión del punto de bifurcación al camino maestro
        connections.push({
          from: 'bifurcation',
          to: 'master',
          segments: [{
            start: bifurcationPoint,
            end: sharedMasterPoint
          }]
        });

        // Conexiones de cada nodo al punto de bifurcación
        for (const point of group) {
          const node = nodes.find(n => n.id === point.nodeId)!;
          connections.push({
            from: point.nodeId,
            to: 'bifurcation',
            segments: [{
              start: { x: node.x, y: node.y },
              end: bifurcationPoint
            }]
          });
        }
      }
    }

    return connections;
  }

  private static findPointAtPosition(masterPath: Array<{x: number, y: number}>, targetPosition: number): {x: number, y: number} {
    let accumulatedDistance = 0;
    
    for (let i = 0; i < masterPath.length - 1; i++) {
      const start = masterPath[i];
      const end = masterPath[i + 1];
      const segmentLength = this.calculateDistance(start.x, start.y, end.x, end.y);
      
      if (accumulatedDistance + segmentLength >= targetPosition) {
        const ratio = (targetPosition - accumulatedDistance) / segmentLength;
        return {
          x: start.x + ratio * (end.x - start.x),
          y: start.y + ratio * (end.y - start.y)
        };
      }
      
      accumulatedDistance += segmentLength;
    }
    
    return masterPath[masterPath.length - 1];
  }

  private static createDirectMST(nodes: Node[]): Array<{from: string, to: string, segments: Array<{start: {x: number, y: number}, end: {x: number, y: number}}>}> {
    // Implementación MST tradicional para cuando no hay camino maestro
    const connections: Array<{from: string, to: string, segments: Array<{start: {x: number, y: number}, end: {x: number, y: number}}>}> = [];
    
    if (nodes.length < 2) return connections;

    const allEdges: Array<{from: string, to: string, weight: number}> = [];
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const weight = this.calculateDistance(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
        allEdges.push({
          from: nodes[i].id,
          to: nodes[j].id,
          weight
        });
      }
    }

    allEdges.sort((a, b) => a.weight - b.weight);

    const parent = new Map<string, string>();
    nodes.forEach(node => parent.set(node.id, node.id));

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
      parent.set(rootX, rootY);
      return true;
    };

    for (const edge of allEdges) {
      if (union(edge.from, edge.to)) {
        const fromNode = nodes.find(n => n.id === edge.from)!;
        const toNode = nodes.find(n => n.id === edge.to)!;
        
        connections.push({
          from: edge.from,
          to: edge.to,
          segments: [{
            start: { x: fromNode.x, y: fromNode.y },
            end: { x: toNode.x, y: toNode.y }
          }]
        });

        if (connections.length === nodes.length - 1) break;
      }
    }

    return connections;
  }
}
