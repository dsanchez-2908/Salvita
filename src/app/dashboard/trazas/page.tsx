"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface Traza {
  Id: number;
  FechaHora: string;
  UsuarioId: number;
  Usuario: string;
  Accion: string;
  Proceso: string;
  Detalle: string;
}

interface Usuario {
  Id: number;
  Usuario: string;
  Nombre: string;
}

interface Modulo {
  Id: number;
  Nombre: string;
}

type SortField = "FechaHora" | "Usuario" | "Accion" | "Proceso" | "Detalle";
type SortOrder = "asc" | "desc";

export default function TrazasPage() {
  const { toast } = useToast();
  const [trazas, setTrazas] = useState<Traza[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [sortField, setSortField] = useState<SortField>("FechaHora");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Filtros
  const [tipoProceso, setTipoProceso] = useState("");
  const [moduloId, setModuloId] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [accion, setAccion] = useState("");
  const [detalle, setDetalle] = useState("");

  useEffect(() => {
    loadUsuarios();
    loadModulos();
  }, []);

  const loadUsuarios = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setUsuarios(data.data);
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  const loadModulos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/modulos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setModulos(data.data.filter((m: any) => m.Tipo === "Principal" || m.Tipo === "Independiente"));
      }
    } catch (error) {
      console.error("Error al cargar módulos:", error);
    }
  };

  const handleBuscar = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Construir query params
      const params = new URLSearchParams();
      
      // Construir el proceso basado en el tipo y módulo seleccionado
      let procesoFiltro = "";
      if (tipoProceso === "Modulos" && moduloId) {
        const modulo = modulos.find(m => m.Id === parseInt(moduloId));
        if (modulo) {
          procesoFiltro = `Módulo: ${modulo.Nombre}`;
        }
      } else if (tipoProceso && tipoProceso !== "Modulos") {
        procesoFiltro = tipoProceso;
      }
      
      if (procesoFiltro) params.append("proceso", procesoFiltro);
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      if (usuarioId) params.append("usuarioId", usuarioId);
      if (accion) params.append("accion", accion);
      if (detalle) params.append("detalle", detalle);

      const response = await fetch(`/api/trazas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTrazas(data.data);
        setBusquedaRealizada(true);
      } else {
        toast({
          title: "Error",
          description: data.message || "Error al cargar trazas",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar trazas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiar = () => {
    setTipoProceso("");
    setModuloId("");
    setFechaDesde("");
    setFechaHasta("");
    setUsuarioId("");
    setAccion("");
    setDetalle("");
    setTrazas([]);
    setBusquedaRealizada(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const trazasOrdenadas = [...trazas].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === "FechaHora") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const exportToCSV = () => {
    const headers = ["Fecha/Hora", "Usuario", "Acción", "Proceso", "Detalle"];
    const rows = trazasOrdenadas.map(t => [
      new Date(t.FechaHora).toLocaleString("es-AR"),
      t.Usuario,
      t.Accion,
      t.Proceso,
      t.Detalle
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `trazas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getAccionColor = (accion: string) => {
    switch (accion) {
      case "Agregar":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Modificar":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Eliminar":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Auditoría del Sistema</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipoProceso">Proceso</Label>
                <select
                  id="tipoProceso"
                  value={tipoProceso}
                  onChange={(e) => {
                    setTipoProceso(e.target.value);
                    setModuloId("");
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Todos los procesos</option>
                  <option value="Roles">Roles</option>
                  <option value="Usuarios">Usuarios</option>
                  <option value="Listas">Listas</option>
                  <option value="Módulos">Configuración Módulos</option>
                  <option value="Parámetros">Parámetros</option>
                  <option value="Modulos">Módulos</option>
                </select>
              </div>

              {tipoProceso === "Modulos" && (
                <div className="space-y-2">
                  <Label htmlFor="modulo">Módulo</Label>
                  <select
                    id="modulo"
                    value={moduloId}
                    onChange={(e) => setModuloId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Todos los módulos</option>
                    {modulos.map((modulo) => (
                      <option key={modulo.Id} value={modulo.Id}>
                        {modulo.Nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fechaDesde">Fecha Desde</Label>
                <Input
                  id="fechaDesde"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaHasta">Fecha Hasta</Label>
                <Input
                  id="fechaHasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usuario">Usuario</Label>
                <select
                  id="usuario"
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Todos los usuarios</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.Id} value={usuario.Id}>
                      {usuario.Usuario} - {usuario.Nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accion">Acción</Label>
                <select
                  id="accion"
                  value={accion}
                  onChange={(e) => setAccion(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Todas las acciones</option>
                  <option value="Agregar">Agregar</option>
                  <option value="Modificar">Modificar</option>
                  <option value="Eliminar">Eliminar</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="detalle">Detalle</Label>
                <Input
                  id="detalle"
                  placeholder="Buscar en detalle..."
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleBuscar} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
              <Button variant="outline" onClick={handleLimpiar}>
                Limpiar Filtros
              </Button>
              {trazas.length > 0 && (
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resultados {busquedaRealizada && `(${trazas.length} ${trazas.length === 1 ? "registro" : "registros"})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!busquedaRealizada ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aplique los filtros y haga clic en "Buscar" para ver los resultados</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : trazas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron registros con los filtros seleccionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="border p-2 text-left">
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort("FechaHora")}
                      >
                        Fecha/Hora
                        <SortIcon field="FechaHora" />
                      </button>
                    </th>
                    <th className="border p-2 text-left">
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort("Usuario")}
                      >
                        Usuario
                        <SortIcon field="Usuario" />
                      </button>
                    </th>
                    <th className="border p-2 text-left">
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort("Accion")}
                      >
                        Acción
                        <SortIcon field="Accion" />
                      </button>
                    </th>
                    <th className="border p-2 text-left">
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort("Proceso")}
                      >
                        Proceso
                        <SortIcon field="Proceso" />
                      </button>
                    </th>
                    <th className="border p-2 text-left">
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort("Detalle")}
                      >
                        Detalle
                        <SortIcon field="Detalle" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trazasOrdenadas.map((traza) => (
                    <tr
                      key={traza.Id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="border p-2 text-sm whitespace-nowrap">
                        {formatFecha(traza.FechaHora)}
                      </td>
                      <td className="border p-2 text-sm">
                        {traza.Usuario}
                      </td>
                      <td className="border p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getAccionColor(
                            traza.Accion
                          )}`}
                        >
                          {traza.Accion}
                        </span>
                      </td>
                      <td className="border p-2 text-sm">
                        {traza.Proceso}
                      </td>
                      <td className="border p-2 text-sm">
                        {traza.Detalle}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
