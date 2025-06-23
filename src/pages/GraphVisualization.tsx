
import { useState, useEffect } from 'react';
import { GraphCanvas } from '@/components/GraphCanvas';
import { Toolbar } from '@/components/Toolbar';
import { Graph } from '@/types/graph';
import { GraphAlgorithms } from '@/utils/dijkstra';
import { toast } from 'sonner';

const GraphVisualization = () => {
  const [activeTool, setActiveTool] = useState<'select' | 'addNode' | 'addEdge' | 'setMain' | 'masterPath'>('addNode');
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [] });
  const [optimalPaths, setOptimalPaths] = useState<Map<string, any> | undefined>();
  const [showOptimalPaths, setShowOptimalPaths] = useState(false);
  const [optimalDistance, setOptimalDistance] = useState<number | undefined>();
  const [autoOptimalEnabled, setAutoOptimalEnabled] = useState(true);

  // Calcular automáticamente la ruta óptima cuando cambia el grafo
  useEffect(() => {
    if (!autoOptimalEnabled) return;
    
    const mainNode = graph.nodes.find(n => n.isMain);
    
    if (mainNode && graph.nodes.length >= 2 && graph.edges.length > 0) {
      try {
        const paths = GraphAlgorithms.dijkstra(graph, mainNode.id);
        const mst = GraphAlgorithms.findMinimumSpanningTree(graph);
        
        setOptimalPaths(paths);
        setOptimalDistance(mst.totalWeight);
        setShowOptimalPaths(true);
      } catch (error) {
        console.error('Error calculating optimal path:', error);
      }
    } else {
      setOptimalPaths(undefined);
      setOptimalDistance(undefined);
      setShowOptimalPaths(false);
    }
  }, [graph, autoOptimalEnabled]);

  const handleClear = () => {
    setGraph({ nodes: [], edges: [] });
    setOptimalPaths(undefined);
    setShowOptimalPaths(false);
    setOptimalDistance(undefined);
    toast.success('Canvas limpiado');
  };

  const handleToggleAutoOptimal = () => {
    setAutoOptimalEnabled(!autoOptimalEnabled);
    toast.info(`Auto-óptimo ${!autoOptimalEnabled ? 'activado' : 'desactivado'}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Visualizador de Grafos y Rutas Óptimas
          </h1>
          <p className="text-lg text-gray-600">
            Agrega bloques y observa cómo se calcula automáticamente la ruta más eficiente en tiempo real
          </p>
        </div>

        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onClear={handleClear}
          onToggleAutoOptimal={handleToggleAutoOptimal}
          autoOptimalEnabled={autoOptimalEnabled}
          nodeCount={graph.nodes.length}
          edgeCount={graph.edges.length}
          optimalDistance={optimalDistance}
        />

        <div className="flex justify-center">
          <GraphCanvas
            activeTool={activeTool}
            graph={graph}
            onGraphChange={setGraph}
            optimalPaths={optimalPaths}
            showOptimalPaths={showOptimalPaths}
          />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="font-semibold text-lg mb-3">Instrucciones:</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Herramientas:</h4>
              <ul className="space-y-1">
                <li><strong>Agregar Bloque:</strong> Haz clic en el canvas para agregar nuevos bloques</li>
                <li><strong>Conectar:</strong> Haz clic en dos bloques para crear una conexión</li>
                <li><strong>Marcar Principal:</strong> Haz clic en un bloque para marcarlo como punto de inicio</li>
                <li><strong>Camino Maestro:</strong> Conecta bloques que deben estar obligatoriamente en la ruta</li>
                <li><strong>Seleccionar:</strong> Arrastra bloques para reposicionarlos</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Visualización:</h4>
              <ul className="space-y-1">
                <li><span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>Bloque Principal</li>
                <li><span className="inline-block w-3 h-3 bg-indigo-600 rounded-full mr-2"></span>Bloques Normales</li>
                <li><span className="inline-block w-8 h-0.5 bg-purple-600 mr-2"></span>Camino Maestro</li>
                <li><span className="inline-block w-8 h-0.5 bg-green-600 mr-2"></span>Ruta Óptima</li>
                <li><span className="inline-block w-8 h-0.5 bg-gray-600 mr-2"></span>Conexiones</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;
