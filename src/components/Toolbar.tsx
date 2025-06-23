
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ToolbarProps {
  activeTool: 'select' | 'addNode' | 'addEdge' | 'setMain' | 'masterPath';
  onToolChange: (tool: 'select' | 'addNode' | 'addEdge' | 'setMain' | 'masterPath') => void;
  onClear: () => void;
  onToggleAutoOptimal: () => void;
  autoOptimalEnabled: boolean;
  nodeCount: number;
  edgeCount: number;
  optimalDistance?: number;
}

export const Toolbar = ({
  activeTool,
  onToolChange,
  onClear,
  onToggleAutoOptimal,
  autoOptimalEnabled,
  nodeCount,
  edgeCount,
  optimalDistance
}: ToolbarProps) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            <Button
              variant={activeTool === 'select' ? 'default' : 'outline'}
              onClick={() => onToolChange('select')}
              size="sm"
            >
              Seleccionar
            </Button>
            <Button
              variant={activeTool === 'addNode' ? 'default' : 'outline'}
              onClick={() => onToolChange('addNode')}
              size="sm"
            >
              Agregar Bloque
            </Button>
            <Button
              variant={activeTool === 'addEdge' ? 'default' : 'outline'}
              onClick={() => onToolChange('addEdge')}
              size="sm"
            >
              Conectar
            </Button>
            <Button
              variant={activeTool === 'setMain' ? 'default' : 'outline'}
              onClick={() => onToolChange('setMain')}
              size="sm"
            >
              Marcar Principal
            </Button>
            <Button
              variant={activeTool === 'masterPath' ? 'default' : 'outline'}
              onClick={() => onToolChange('masterPath')}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Camino Maestro
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={onToggleAutoOptimal}
              variant={autoOptimalEnabled ? 'default' : 'outline'}
              className={autoOptimalEnabled ? 'bg-green-600 hover:bg-green-700' : ''}
              size="sm"
            >
              {autoOptimalEnabled ? 'Auto-Óptimo ON' : 'Auto-Óptimo OFF'}
            </Button>
            <Button
              onClick={onClear}
              variant="destructive"
              size="sm"
            >
              Limpiar Todo
            </Button>
          </div>

          <div className="flex gap-3 ml-auto">
            <Badge variant="secondary">
              Bloques: {nodeCount}
            </Badge>
            <Badge variant="secondary">
              Conexiones: {edgeCount}
            </Badge>
            {optimalDistance !== undefined && (
              <Badge className="bg-green-100 text-green-800">
                Distancia Óptima: {optimalDistance.toFixed(1)}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
