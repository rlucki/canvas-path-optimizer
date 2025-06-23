
export interface Node {
  id: string;
  x: number;
  y: number;
  isMain: boolean;
  label: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  weight: number;
  isMaster?: boolean; // Nuevo: marca si es parte del camino maestro
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface PathResult {
  path: string[];
  totalDistance: number;
}
