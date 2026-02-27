"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Inbox,
  FileText,
  Calendar,
  RefreshCw
} from "lucide-react";

interface EstadisticasGenerales {
  Total: number;
  Pendientes: number;
  Tomadas: number;
  Completadas: number;
  Rechazadas: number;
  Vencidas: number;
}

interface TiempoPromedio {
  PromedioCompletadas: number;
  PromedioTomada: number;
}

interface TareaPorUsuario {
  UsuarioId: number;
  UsuarioNombre: string;
  TotalTareas: number;
  Pendientes: number;
  Tomadas: number;
  Completadas: number;
  Rechazadas: number;
}

interface TareaPorBandeja {
  BandejaId: number;
  BandejaNombre: string;
  TotalTareas: number;
  Pendientes: number;
  Tomadas: number;
  Completadas: number;
  Rechazadas: number;
}

interface TareaPorPlantilla {
  PlantillaId: number;
  PlantillaNombre: string;
  TotalTareas: number;
  Completadas: number;
  Rechazadas: number;
}

interface TareaPorDia {
  Fecha: string;
  Total: number;
}

interface TopUsuario {
  UsuarioId: number;
  UsuarioNombre: string;
  TareasCompletadas: number;
  PromedioHoras: number;
}

interface EficienciaTipo {
  TipoAsignacion: string;
  Total: number;
  Completadas: number;
  PorcentajeExito: number;
}

interface Estadisticas {
  general: EstadisticasGenerales;
  tiempoPromedio: TiempoPromedio;
  tareasPorUsuario: TareaPorUsuario[];
  tareasPorBandeja: TareaPorBandeja[];
  tareasPorPlantilla: TareaPorPlantilla[];
  tareasPorDia: TareaPorDia[];
  topUsuarios: TopUsuario[];
  eficienciaTipoAsignacion: EficienciaTipo[];
}

export default function MonitorTareasPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    // Establecer últimos 30 días por defecto
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    setFechaFin(hoy.toISOString().split('T')[0]);
    setFechaInicio(hace30Dias.toISOString().split('T')[0]);
    
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async (inicio?: string, fin?: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      let url = "/api/tareas/estadisticas";
      const params = new URLSearchParams();
      
      if (inicio && fin) {
        params.append("fechaInicio", inicio);
        params.append("fechaFin", fin);
      } else if (fechaInicio && fechaFin) {
        params.append("fechaInicio", fechaInicio);
        params.append("fechaFin", fechaFin);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error("Error al cargar estadísticas");
      }

      const data = await response.json();
      setEstadisticas(data.data);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    if (!fechaInicio || !fechaFin) {
      toast({
        title: "Advertencia",
        description: "Debe seleccionar ambas fechas",
        variant: "destructive",
      });
      return;
    }
    cargarEstadisticas(fechaInicio, fechaFin);
  };

  const calcularPorcentaje = (valor: number, total: number) => {
    if (total === 0) return 0;
    return ((valor / total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <div className="container mx-auto p-6">
        <p>No se pudieron cargar las estadísticas</p>
      </div>
    );
  }

  const { general, tiempoPromedio, tareasPorUsuario, tareasPorBandeja, tareasPorPlantilla, topUsuarios, eficienciaTipoAsignacion } = estadisticas;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Monitor de Tareas
          </h1>
          <p className="text-muted-foreground mt-1">
            Métricas y estadísticas del sistema de tareas
          </p>
        </div>
        <Button onClick={() => cargarEstadisticas()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Filtros de Fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="fechaInicio">Fecha Inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="fechaFin">Fecha Fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <Button onClick={handleFiltrar}>
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tareas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{general.Total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tareas en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{general.Completadas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {calcularPorcentaje(general.Completadas, general.Total)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{general.Pendientes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {calcularPorcentaje(general.Pendientes, general.Total)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{general.Vencidas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tiempo Promedio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tiempo Promedio de Resolución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Desde creación hasta completado</p>
                <p className="text-3xl font-bold">
                  {tiempoPromedio.PromedioCompletadas 
                    ? `${tiempoPromedio.PromedioCompletadas.toFixed(1)} días`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Desde creación hasta toma</p>
                <p className="text-2xl font-bold">
                  {tiempoPromedio.PromedioTomada 
                    ? `${tiempoPromedio.PromedioTomada.toFixed(1)} días`
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Eficiencia por Tipo de Asignación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {eficienciaTipoAsignacion.map((eficiencia) => (
                <div key={eficiencia.TipoAsignacion}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{eficiencia.TipoAsignacion}</span>
                    <span className="text-sm font-bold">{eficiencia.PorcentajeExito}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${eficiencia.PorcentajeExito}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {eficiencia.Completadas} de {eficiencia.Total} tareas
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tareas por Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Distribución por Usuario
          </CardTitle>
          <CardDescription>
            Tareas asignadas directamente a usuarios (Bandeja Personal)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tareasPorUsuario.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay tareas asignadas directamente a usuarios
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Usuario</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Pendientes</th>
                    <th className="text-right p-2">Tomadas</th>
                    <th className="text-right p-2">Completadas</th>
                    <th className="text-right p-2">Rechazadas</th>
                  </tr>
                </thead>
                <tbody>
                  {tareasPorUsuario.map((usuario) => (
                    <tr key={usuario.UsuarioId} className="border-b">
                      <td className="p-2 font-medium">{usuario.UsuarioNombre}</td>
                      <td className="text-right p-2">{usuario.TotalTareas}</td>
                      <td className="text-right p-2 text-yellow-600">{usuario.Pendientes}</td>
                      <td className="text-right p-2 text-blue-600">{usuario.Tomadas}</td>
                      <td className="text-right p-2 text-green-600">{usuario.Completadas}</td>
                      <td className="text-right p-2 text-red-600">{usuario.Rechazadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tareas por Bandeja */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Distribución por Bandeja
          </CardTitle>
          <CardDescription>
            Tareas asignadas a bandejas grupales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tareasPorBandeja.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay tareas asignadas a bandejas
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Bandeja</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Pendientes</th>
                    <th className="text-right p-2">Tomadas</th>
                    <th className="text-right p-2">Completadas</th>
                    <th className="text-right p-2">Rechazadas</th>
                  </tr>
                </thead>
                <tbody>
                  {tareasPorBandeja.map((bandeja) => (
                    <tr key={bandeja.BandejaId} className="border-b">
                      <td className="p-2 font-medium">{bandeja.BandejaNombre}</td>
                      <td className="text-right p-2">{bandeja.TotalTareas}</td>
                      <td className="text-right p-2 text-yellow-600">{bandeja.Pendientes}</td>
                      <td className="text-right p-2 text-blue-600">{bandeja.Tomadas}</td>
                      <td className="text-right p-2 text-green-600">{bandeja.Completadas}</td>
                      <td className="text-right p-2 text-red-600">{bandeja.Rechazadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Usuarios y Plantillas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Usuarios Finalizadores
            </CardTitle>
            <CardDescription>
              Usuarios que más tareas han completado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topUsuarios.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay datos disponibles
              </p>
            ) : (
              <div className="space-y-3">
                {topUsuarios.map((usuario, index) => (
                  <div key={usuario.UsuarioId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium">{usuario.UsuarioNombre}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{usuario.TareasCompletadas}</div>
                      <div className="text-xs text-muted-foreground">
                        {usuario.PromedioHoras ? `${usuario.PromedioHoras.toFixed(1)}h promedio` : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tareas por Plantilla
            </CardTitle>
            <CardDescription>
              Distribución de tareas por tipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tareasPorPlantilla.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay datos disponibles
              </p>
            ) : (
              <div className="space-y-3">
                {tareasPorPlantilla.slice(0, 10).map((plantilla) => (
                  <div key={plantilla.PlantillaId}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium truncate" title={plantilla.PlantillaNombre}>
                        {plantilla.PlantillaNombre}
                      </span>
                      <span className="text-sm font-bold">{plantilla.TotalTareas}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ 
                          width: `${calcularPorcentaje(plantilla.Completadas, plantilla.TotalTareas)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plantilla.Completadas} completadas, {plantilla.Rechazadas} rechazadas
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
