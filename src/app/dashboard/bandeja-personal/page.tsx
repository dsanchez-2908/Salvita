"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Inbox
} from "lucide-react";

interface Tarea {
  TareaId: number;
  PlantillaNombre: string;
  TipoAsignacion: string;
  NumeroRegistros: number;
  FechaCreacion: string;
  FechaVencimiento?: string;
  Estado: string;
  CreadoPorNombre: string;
}

type EstadoFiltro = "Todas" | "Pendiente" | "Tomada" | "Completada" | "Rechazada";

export default function BandejaPersonalPage() {
  const router = useRouter();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [tareasFiltradas, setTareasFiltradas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("Todas");

  useEffect(() => {
    cargarTareas();
  }, []);

  useEffect(() => {
    filtrarTareas();
  }, [tareas, busqueda, estadoFiltro]);

  const cargarTareas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      // Filtrar solo tareas asignadas directamente al usuario
      const response = await fetch("/api/tareas?tipoAsignacion=Usuario", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error("Error al cargar las tareas");
      }

      const data = await response.json();
      setTareas(data.data || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error al cargar tareas:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtrarTareas = () => {
    let resultado = [...tareas];

    // Filtrar por estado
    if (estadoFiltro !== "Todas") {
      resultado = resultado.filter(t => t.Estado === estadoFiltro);
    }

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(t => 
        t.PlantillaNombre.toLowerCase().includes(busquedaLower)
      );
    }

    setTareasFiltradas(resultado);
  };

  const formatearFecha = (fecha: string) => {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case "Pendiente":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "Tomada":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case "Completada":
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
      case "Completada":
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case "Rechazada":
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  };

  const esVencida = (fechaVencimiento?: string) => {
    if (!fechaVencimiento) return false;
    try {
      const vencimiento = new Date(fechaVencimiento);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return vencimiento < hoy;
    } catch {
      return false;
    }
  };

  const contarPorEstado = (estado: EstadoFiltro) => {
    if (estado === "Todas") return tareas.length;
    return tareas.filter(t => t.Estado === estado).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando tareas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Error al cargar tareas</h3>
            <p className="text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            <Inbox className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex items-center gap-3">
            <Inbox className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Bandeja Personal
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {tareasFiltradas.length} tarea{tareasFiltradas.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Descripción */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Tareas asignadas directamente a ti
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por plantilla..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {(["Todas", "Pendiente", "Tomada", "Completada", "Rechazada"] as EstadoFiltro[]).map((estado) => (
              <Button
                key={estado}
                variant={estadoFiltro === estado ? "default" : "outline"}
                size="sm"
                onClick={() => setEstadoFiltro(estado)}
              >
                {estado}
                {estadoFiltro === estado && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {contarPorEstado(estado)}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Tareas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {tareasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {busqueda || estadoFiltro !== "Todas" 
                ? "No se encontraron tareas con los filtros aplicados"
                : "No tienes tareas asignadas en tu bandeja personal"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Plantilla
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Registros
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Creada por
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      #{tarea.TareaId}
                    </td>
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
                      {tarea.CreadoPorNombre || "Sin información"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatearFecha(tarea.FechaCreacion)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tarea.FechaVencimiento ? (
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            esVencida(tarea.FechaVencimiento)
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          <span>
                            {formatearFecha(tarea.FechaVencimiento)}
                            {esVencida(tarea.FechaVencimiento) && " ⚠️"}
                          </span>
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
