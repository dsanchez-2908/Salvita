"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar, User, Filter as FilterIcon, Search, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";

interface Tarea {
  TareaId: number;
  Estado: string;
  TipoAsignacion: string;
  PlantillaNombre: string;
  FechaCreacion: string;
  FechaVencimiento: string | null;
  FechaFinalizacion: string | null;
  UsuarioCreacion: string;
  UsuarioCreacionNombre: string;
  UsuarioFinalizacionNombre: string | null;
  AsignacionActual: string;
  TotalRegistros: number;
  EsVencida: number;
}

interface Plantilla {
  Id: number;
  Nombre: string;
}

interface Usuario {
  Id: number;
  Nombre: string;
  Usuario: string;
}

export default function ConsultaTareasPage() {
  const router = useRouter();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(false);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Filtros
  const [tareaId, setTareaId] = useState("");
  const [plantillaId, setPlantillaId] = useState("");
  const [estado, setEstado] = useState("");
  const [fechaAltaDesde, setFechaAltaDesde] = useState("");
  const [fechaAltaHasta, setFechaAltaHasta] = useState("");
  const [fechaFinalizacionDesde, setFechaFinalizacionDesde] = useState("");
  const [fechaFinalizacionHasta, setFechaFinalizacionHasta] = useState("");
  const [vencida, setVencida] = useState("");
  const [usuarioCreacionId, setUsuarioCreacionId] = useState("");
  const [usuarioFinalizacionId, setUsuarioFinalizacionId] = useState("");

  const estados = ["Pendiente", "Tomada", "Completada", "Rechazada"];

  useEffect(() => {
    cargarPlantillas();
    cargarUsuarios();
  }, []);

  const cargarPlantillas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/plantillas-tareas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setPlantillas(data.data || []);
      }
    } catch (error) {
      console.error("Error al cargar plantillas:", error);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setUsuarios(data.data || []);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  const buscarTareas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const params = new URLSearchParams();
      if (tareaId) params.append("tareaId", tareaId);
      if (plantillaId) params.append("plantillaId", plantillaId);
      if (estado) params.append("estado", estado);
      if (fechaAltaDesde) params.append("fechaAltaDesde", fechaAltaDesde);
      if (fechaAltaHasta) params.append("fechaAltaHasta", fechaAltaHasta);
      if (fechaFinalizacionDesde) params.append("fechaFinalizacionDesde", fechaFinalizacionDesde);
      if (fechaFinalizacionHasta) params.append("fechaFinalizacionHasta", fechaFinalizacionHasta);
      if (vencida) params.append("vencida", vencida);
      if (usuarioCreacionId) params.append("usuarioCreacionId", usuarioCreacionId);
      if (usuarioFinalizacionId) params.append("usuarioFinalizacionId", usuarioFinalizacionId);

      const response = await fetch(`/api/tareas/consulta?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTareas(data.data || []);
      } else {
        console.error("Error al buscar tareas:", data.error);
      }
    } catch (error) {
      console.error("Error al buscar tareas:", error);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setTareaId("");
    setPlantillaId("");
    setEstado("");
    setFechaAltaDesde("");
    setFechaAltaHasta("");
    setFechaFinalizacionDesde("");
    setFechaFinalizacionHasta("");
    setVencida("");
    setUsuarioCreacionId("");
    setUsuarioFinalizacionId("");
    setTareas([]);
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return "-";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, string> = {
      Pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Tomada: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Completada: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Rechazada: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return badges[estado] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  const getEstadoIcon = (estado: string) => {
    const icons: Record<string, JSX.Element> = {
      Pendiente: <Clock className="h-4 w-4 text-yellow-600" />,
      Tomada: <AlertCircle className="h-4 w-4 text-blue-600" />,
      Completada: <CheckCircle className="h-4 w-4 text-green-600" />,
      Rechazada: <XCircle className="h-4 w-4 text-red-600" />,
    };
    return icons[estado] || <Clock className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Consulta de Tareas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Búsqueda avanzada de tareas con filtros múltiples
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <FilterIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filtros de Búsqueda</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Código de Tarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código de Tarea
            </label>
            <input
              type="number"
              value={tareaId}
              onChange={(e) => setTareaId(e.target.value)}
              placeholder="ID de la tarea"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Plantilla */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Plantilla de Tarea
            </label>
            <select
              value={plantillaId}
              onChange={(e) => setPlantillaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Todas las plantillas</option>
              {plantillas.map((p) => (
                <option key={p.Id} value={p.Id}>
                  {p.Nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Todos los estados</option>
              {estados.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Alta Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Alta Desde
            </label>
            <input
              type="date"
              value={fechaAltaDesde}
              onChange={(e) => setFechaAltaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Fecha Alta Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Alta Hasta
            </label>
            <input
              type="date"
              value={fechaAltaHasta}
              onChange={(e) => setFechaAltaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Fecha Finalización Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Finalización Desde
            </label>
            <input
              type="date"
              value={fechaFinalizacionDesde}
              onChange={(e) => setFechaFinalizacionDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Fecha Finalización Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Finalización Hasta
            </label>
            <input
              type="date"
              value={fechaFinalizacionHasta}
              onChange={(e) => setFechaFinalizacionHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          {/* Vencida */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tarea Vencida
            </label>
            <select
              value={vencida}
              onChange={(e) => setVencida(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Todas</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </div>

          {/* Usuario Creación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Usuario de Creación
            </label>
            <select
              value={usuarioCreacionId}
              onChange={(e) => setUsuarioCreacionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => (
                <option key={u.Id} value={u.Id}>
                  {u.Nombre} ({u.Usuario})
                </option>
              ))}
            </select>
          </div>

          {/* Usuario Finalización */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Usuario de Finalización
            </label>
            <select
              value={usuarioFinalizacionId}
              onChange={(e) => setUsuarioFinalizacionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => (
                <option key={u.Id} value={u.Id}>
                  {u.Nombre} ({u.Usuario})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <Button onClick={buscarTareas} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            {loading ? "Buscando..." : "Buscar"}
          </Button>
          <Button variant="outline" onClick={limpiarFiltros}>
            Limpiar Filtros
          </Button>
        </div>
      </div>

      {/* Resultados */}
      {tareas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resultados ({tareas.length} {tareas.length === 1 ? "tarea" : "tareas"})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Asignado a
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Plantilla
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Registros
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha Creación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Usuario Creación
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
                {tareas.map((tarea) => (
                  <tr
                    key={tarea.TareaId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/tarea/${tarea.TareaId}?modo=consulta`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      #{tarea.TareaId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getEstadoIcon(tarea.Estado)}
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getEstadoBadge(tarea.Estado)}`}>
                          {tarea.Estado}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {tarea.AsignacionActual || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {tarea.PlantillaNombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {tarea.TotalRegistros > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {tarea.TotalRegistros}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatearFecha(tarea.FechaCreacion)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {tarea.UsuarioCreacionNombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tarea.FechaVencimiento ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${tarea.EsVencida ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
                            {formatearFecha(tarea.FechaVencimiento)}
                            {tarea.EsVencida === 1 && " ⚠️"}
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
                          router.push(`/dashboard/tarea/${tarea.TareaId}?modo=consulta`);
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
        </div>
      )}

      {/* Sin resultados */}
      {!loading && tareas.length === 0 && (fechaAltaDesde || plantillaId || estado || tareaId) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No se encontraron tareas con los filtros seleccionados
          </p>
        </div>
      )}
    </div>
  );
}
