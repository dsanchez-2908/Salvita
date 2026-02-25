"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  ClipboardList,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

interface Tarea {
  TareaId: number;
  PlantillaNombre: string;
  Observaciones: string;
  FechaCreacion: string;
  FechaVencimiento: string | null;
  Estado: string;
  TipoAsignacion: string;
  UsuarioAsignadoNombre: string | null;
  BandejaAsignadaNombre: string | null;
  TomoNombre: string | null;
  CreadoPorNombre: string;
  NumeroRegistros: number;
  FechaTomo: string | null;
}

interface Bandeja {
  BandejaId: number;
  NombreBandeja: string;
  DescripcionBandeja: string;
}

export default function BandejaTareasPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const bandejaId = params.id as string;

  const [bandeja, setBandeja] = useState<Bandeja | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [tareasFiltradas, setTareasFiltradas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState<string>("Todas");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (bandejaId) {
      cargarBandeja();
      cargarTareas();
    }
  }, [bandejaId]);

  useEffect(() => {
    filtrarTareas();
  }, [tareas, estadoFiltro, busqueda]);

  const cargarBandeja = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/bandejas/usuario", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        const bandejaEncontrada = data.data.find(
          (b: Bandeja) => b.BandejaId === parseInt(bandejaId)
        );
        if (bandejaEncontrada) {
          setBandeja(bandejaEncontrada);
        } else {
          toast({
            title: "Error",
            description: "No tienes acceso a esta bandeja",
            variant: "destructive",
          });
          router.push("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const cargarTareas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas?bandejaId=${bandejaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTareas(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al cargar tareas",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al cargar tareas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtrarTareas = () => {
    let resultado = [...tareas];

    if (estadoFiltro !== "Todas") {
      resultado = resultado.filter((t) => t.Estado === estadoFiltro);
    }

    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(
        (t) =>
          t.PlantillaNombre.toLowerCase().includes(termino) ||
          t.Observaciones?.toLowerCase().includes(termino) ||
          t.CreadoPorNombre.toLowerCase().includes(termino)
      );
    }

    setTareasFiltradas(resultado);
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "Pendiente":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "Tomada":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case "Finalizada":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "Rechazada":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getEstadoBadge = (estado: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-semibold";
    switch (estado) {
      case "Pendiente":
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case "Tomada":
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case "Finalizada":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case "Rechazada":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const esVencida = (fechaVencimiento: string | null, estado: string) => {
    if (!fechaVencimiento || estado === "Finalizada" || estado === "Rechazada")
      return false;
    return new Date(fechaVencimiento) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando tareas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center gap-3">
            <Filter className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {bandeja?.NombreBandeja || "Bandeja"}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {tareasFiltradas.length} tarea{tareasFiltradas.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Descripción de la bandeja */}
      {bandeja?.DescripcionBandeja && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {bandeja.DescripcionBandeja}
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por plantilla, observaciones..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {["Todas", "Pendiente", "Tomada", "Finalizada", "Rechazada"].map(
              (estado) => (
                <Button
                  key={estado}
                  variant={estadoFiltro === estado ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEstadoFiltro(estado)}
                >
                  {estado}
                  {estadoFiltro === estado && (
                    <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {estado === "Todas"
                        ? tareas.length
                        : tareas.filter((t) => t.Estado === estado).length}
                    </span>
                  )}
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Lista de Tareas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {tareasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron tareas en esta bandeja
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Plantilla
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tomada por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Registros
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Creada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tareasFiltradas.map((tarea) => (
                  <tr
                    key={tarea.TareaId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/tarea/${tarea.TareaId}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getEstadoIcon(tarea.Estado)}
                        <span className={getEstadoBadge(tarea.Estado)}>
                          {tarea.Estado}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tarea.PlantillaNombre}
                      </div>
                      {tarea.Observaciones && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {tarea.Observaciones}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {tarea.TomoNombre ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900 dark:text-white">
                            {tarea.TomoNombre}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Sin tomar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {tarea.NumeroRegistros > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {tarea.NumeroRegistros}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatearFecha(tarea.FechaCreacion)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tarea.FechaVencimiento ? (
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            esVencida(tarea.FechaVencimiento, tarea.Estado)
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          <Calendar className="h-4 w-4" />
                          {formatearFecha(tarea.FechaVencimiento)}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/tarea/${tarea.TareaId}`);
                        }}
                      >
                        Ver Detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
