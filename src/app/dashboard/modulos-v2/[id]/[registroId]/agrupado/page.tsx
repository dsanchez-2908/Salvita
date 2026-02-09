"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Search, Calendar, Clock, User, FileText } from "lucide-react";

interface RegistroAgrupado {
  Id: number;
  FechaCreacion: string;
  UsuarioCreacion?: string;
  _ModuloId: number;
  _ModuloNombre: string;
  _ModuloIcono: string;
  _Campos: any[];
  [key: string]: any;
}

export default function VistaAgrupadaV2Page() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const moduloId = params.id as string;
  const registroId = params.registroId as string;

  const [registros, setRegistros] = useState<RegistroAgrupado[]>([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState<RegistroAgrupado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modulo, setModulo] = useState<any>(null);
  const [registroPrincipal, setRegistroPrincipal] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [moduloId, registroId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = registros.filter((registro) => {
        // Buscar en todos los campos del registro (excepto los que empiezan con _)
        return Object.entries(registro).some(([key, value]) => {
          if (key.startsWith("_") || key === "Id" || key === "FechaCreacion") return false;
          if (value === null || value === undefined) return false;
          return value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
      setRegistrosFiltrados(filtered);
    } else {
      setRegistrosFiltrados(registros);
    }
  }, [searchTerm, registros]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Cargar información del módulo
      const moduloRes = await fetch(`/api/modulos-v2?id=${moduloId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const moduloData = await moduloRes.json();

      if (moduloData.success) {
        setModulo(moduloData.data);
      }

      // Cargar información del registro principal
      const registroRes = await fetch(`/api/modulos-v2/${moduloId}/datos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const registroData = await registroRes.json();
      
      if (registroData.success) {
        const regPrincipal = registroData.data.registros.find((r: any) => r.Id === parseInt(registroId));
        setRegistroPrincipal(regPrincipal);
      }

      // Cargar registros agrupados
      const response = await fetch(`/api/modulos-v2/${moduloId}/${registroId}/agrupado`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setRegistros(data.data);
        setRegistrosFiltrados(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Error cargando registros",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error cargando datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIconComponent = (iconName: string) => {
    // Retornar el icono correspondiente o uno por defecto
    return <FileText className="w-5 h-5" />;
  };

  const renderCampoValor = (campo: any, valor: any) => {
    if (valor === null || valor === undefined) return "-";

    switch (campo.TipoDato) {
      case "Fecha":
        return formatDate(valor);
      case "FechaHora":
        return `${formatDate(valor)} ${formatTime(valor)}`;
      case "Numero":
      case "Decimal":
        return valor.toLocaleString("es-AR");
      case "Booleano":
        return valor ? "Sí" : "No";
      case "Archivo":
        if (valor) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={async (e) => {
                e.stopPropagation(); // Evitar que se dispare el click del card
                try {
                  const token = localStorage.getItem("token");
                  const response = await fetch(`/api/documentos/viewer?documentId=${valor}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const data = await response.json();
                  if (data.success) {
                    window.open(data.viewerUrl, '_blank');
                  } else {
                    toast({
                      title: "Error",
                      description: "No se pudo abrir el archivo",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  console.error("Error:", error);
                  toast({
                    title: "Error",
                    description: "Error al abrir el archivo",
                    variant: "destructive",
                  });
                }
              }}
            >
              <FileText className="h-4 w-4 mr-1" />
              Ver Archivo
            </Button>
          );
        }
        return "-";
      default:
        return valor.toString();
    }
  };

  const getRegistroPrincipalNombre = () => {
    if (!registroPrincipal || !modulo?.Campos) return `Registro #${registroId}`;
    
    // Buscar el primer campo visible para usar como título
    const campoVisible = modulo.Campos.find((c: any) => c.VisibleEnGrilla);
    if (campoVisible) {
      const valor = registroPrincipal[campoVisible.NombreColumna];
      if (valor) return valor;
    }
    
    return `Registro #${registroId}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/modulos-v2/${moduloId}/${registroId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold dark:text-white">
              Historial de {getRegistroPrincipalNombre()}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Registros consolidados de todos los módulos relacionados
            </p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar en registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Registros */}
      {registrosFiltrados.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {searchTerm
                ? "No se encontraron registros con ese criterio"
                : "No hay registros para mostrar"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {registrosFiltrados.map((registro) => (
            <Card
              key={`${registro._ModuloId}-${registro.Id}`}
              className="hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750"
              onClick={() =>
                router.push(
                  `/dashboard/modulos-v2/${registro._ModuloId}/${registro.Id}`
                )
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      {getIconComponent(registro._ModuloIcono)}
                    </div>
                    <div>
                      <CardTitle className="text-lg dark:text-white">
                        {registro._ModuloNombre}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(registro.FechaCreacion)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(registro.FechaCreacion)}
                        </div>
                        {registro.UsuarioCreacion && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{registro.UsuarioCreacion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {registro.Id}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {registro._Campos
                    .filter((campo: any) => campo.VisibleEnGrilla)
                    .slice(0, 6)
                    .map((campo: any) => (
                      <div key={campo.Nombre} className="space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {campo.Nombre}
                        </p>
                        <div className="text-sm font-medium dark:text-gray-200">
                          {renderCampoValor(campo, registro[campo.Nombre])}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resumen */}
      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Mostrando {registrosFiltrados.length} de {registros.length} registros totales
      </div>
    </div>
  );
}
