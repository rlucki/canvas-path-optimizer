
import { useState, useEffect } from 'react';
import { GraphCanvas } from '@/components/GraphCanvas';
import { Toolbar } from '@/components/Toolbar';
import { Graph } from '@/types/graph';
import { GraphAlgorithms } from '@/utils/dijkstra';
import { toast } from 'sonner';

const GraphVisualization = () => {
  const [activeTool, setActiveTool] = useState<'select' | 'addNode' | 'measureDistance' | 'setMain' | 'masterPath'>('addNode');
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [], masterPaths: [] });
  const [optimalMST, setOptimalMST] = useState<Array<{from: string, to: string}> | undefined>();
  const [optimizedConnections, setOptimizedConnections] = useState<Array<{from: string, to: string, segments: Array<{start: {x: number, y: number}, end: {x: number, y: number}}>}> | undefined>();
  const [showOptimalPaths, setShowOptimalPaths] = useState(false);
  const [optimalDistance, setOptimalDistance] = useState<number | undefined>();
  const [autoOptimalEnabled, setAutoOptimalEnabled] = useState(true);
  const [isDrawingMasterPath, setIsDrawingMasterPath] = useState(false);

  // Calcular automáticamente el MST cuando cambia el grafo
  useEffect(() => {
    if (!autoOptimalEnabled) return;
    
    if (graph.nodes.length >= 2) {
      try {
        const mst = GraphAlgorithms.findMinimumSpanningTree(graph);
        
        setOptimalMST(mst.edges);
        setOptimizedConnections(mst.optimizedConnections);
        setOptimalDistance(mst.totalWeight);
        setShowOptimalPaths(true);
      } catch (error) {
        console.error('Error calculating MST:', error);
      }
    } else {
      setOptimalMST(undefined);
      setOptimizedConnections(undefined);
      setOptimalDistance(undefined);
      setShowOptimalPaths(false);
    }
  }, [graph, autoOptimalEnabled]);

  const handleClear = () => {
    setGraph({ nodes: [], edges: [], masterPaths: [] });
    setOptimalMST(undefined);
    setShowOptimalPaths(false);
    setOptimalDistance(undefined);
    setIsDrawingMasterPath(false);
    toast.success('Canvas limpiado');
  };

  const handleToggleAutoOptimal = () => {
    setAutoOptimalEnabled(!autoOptimalEnabled);
    toast.info(`Auto-óptimo ${!autoOptimalEnabled ? 'activado' : 'desactivado'}`);
  };

  const handleToolChange = (tool: 'select' | 'addNode' | 'measureDistance' | 'setMain' | 'masterPath') => {
    if (tool === 'masterPath' && !isDrawingMasterPath) {
      setIsDrawingMasterPath(true);
      toast.info('Dibuja el camino maestro. Haz clic en "Finalizar" cuando termines.');
    } else if (tool !== 'masterPath' && isDrawingMasterPath) {
      setIsDrawingMasterPath(false);
    }
    
    if (tool === 'measureDistance') {
      toast.info('Haz clic en cualquier bloque para ver su distancia al bloque principal');
    }
    
    setActiveTool(tool);
  };

  const handleFinishMasterPath = () => {
    setIsDrawingMasterPath(false);
    setActiveTool('select');
    toast.success('Camino maestro finalizado');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">
            Visualizador de Grafos y Rutas Óptimas
          </h1>
          <p className="text-lg text-gray-600">
            Agrega bloques y observa cómo se calcula automáticamente el camino más eficiente que los conecta todos
          </p>
        </div>

        <Toolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onClear={handleClear}
          onToggleAutoOptimal={handleToggleAutoOptimal}
          autoOptimalEnabled={autoOptimalEnabled}
          nodeCount={graph.nodes.length}
          edgeCount={graph.edges.length}
          optimalDistance={optimalDistance}
          isDrawingMasterPath={isDrawingMasterPath}
          onFinishMasterPath={handleFinishMasterPath}
        />

        <div className="flex justify-center">
          <GraphCanvas
            activeTool={activeTool}
            graph={graph}
            onGraphChange={setGraph}
            optimalMST={optimalMST}
            showOptimalPaths={showOptimalPaths}
            isDrawingMasterPath={isDrawingMasterPath}
            optimizedConnections={optimizedConnections}
          />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="font-semibold text-lg mb-3">Instrucciones:</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Herramientas:</h4>
              <ul className="space-y-1">
                <li><strong>Agregar Bloque:</strong> Haz clic en el canvas para agregar nuevos bloques</li>
                <li><strong>Medir Distancia:</strong> Haz clic en un bloque para ver su distancia al bloque principal</li>
                <li><strong>Marcar Principal:</strong> Haz clic en un bloque para marcarlo como punto de inicio</li>
                <li><strong>Camino Maestro:</strong> Dibuja una polilínea que debe ser respetada en la ruta</li>
                <li><strong>Seleccionar:</strong> Arrastra bloques para reposicionarlos</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Visualización:</h4>
              <ul className="space-y-1">
                <li><span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>Bloque Principal</li>
                <li><span className="inline-block w-3 h-3 bg-indigo-600 rounded-full mr-2"></span>Bloques Normales</li>
                <li><span className="inline-block w-8 h-0.5 bg-purple-600 mr-2"></span>Camino Maestro</li>
                <li><span className="inline-block w-8 h-0.5 bg-green-600 mr-2"></span>Camino Óptimo con Bifurcaciones</li>
                <li><span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-2"></span>Puntos de Bifurcación</li>
                <li><span className="inline-block w-8 h-0.5 bg-blue-600 mr-2"></span>Medición de Distancia</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;
