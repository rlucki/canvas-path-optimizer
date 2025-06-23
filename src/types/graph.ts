
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
  isMaster?: boolean;
}

export interface MasterPath {
  id: string;
  points: Array<{ x: number; y: number }>;
  isComplete: boolean;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  masterPaths: MasterPath[];
}

export interface PathResult {
  path: string[];
  totalDistance: number;
}
