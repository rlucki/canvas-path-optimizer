
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            GraphOptim
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Herramienta avanzada para visualización y optimización de grafos. 
            Diseña circuitos, encuentra rutas óptimas y analiza conexiones con algoritmos de vanguardia.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                </div>
                Canvas Interactivo
              </CardTitle>
              <CardDescription>
                Agrega bloques y conexiones de manera intuitiva en un lienzo 2D interactivo
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                </div>
                Algoritmo de Dijkstra
              </CardTitle>
              <CardDescription>
                Encuentra automáticamente las rutas más eficientes entre todos los nodos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-purple-600 rounded-sm"></div>
                </div>
                Visualización en Tiempo Real
              </CardTitle>
              <CardDescription>
                Observa las conexiones y rutas óptimas con visualización clara y detallada
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center space-y-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>¿Listo para optimizar tus grafos?</CardTitle>
              <CardDescription>
                Comienza a crear tu red de bloques y descubre las rutas más eficientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/graph')} 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
              >
                Abrir Visualizador de Grafos
              </Button>
            </CardContent>
          </Card>

          <div className="text-sm text-gray-500 space-y-2">
            <p>Perfecto para:</p>
            <div className="flex flex-wrap justify-center gap-4">
              <span className="bg-white px-3 py-1 rounded-full border">Diseño de Circuitos</span>
              <span className="bg-white px-3 py-1 rounded-full border">Análisis de Redes</span>
              <span className="bg-white px-3 py-1 rounded-full border">Optimización de Rutas</span>
              <span className="bg-white px-3 py-1 rounded-full border">Teoría de Grafos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
