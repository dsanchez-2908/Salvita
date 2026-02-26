"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Save, ArrowUp, ArrowDown, BarChart3, Table2 } from "lucide-react";

interface Rol {
  Id: number;
  Nombre: string;
  Descripcion: string;
}

interface Modulo {
  Id: number;
  Nombre: string;
  Tipo: string;
}

interface Campo {
  Nombre: string;
  TipoDato: string;
  ListaId: number | null;
}

interface ConfigWidget {
  id: string;
  Tipo: "Modulos" | "Tareas";
  ModuloId: number;
  ModuloNombre: string;
  TipoVisualizacion: "Agrupamiento" | "DetalleFiltrado" | "Totalizado";
  CampoAgrupamiento: string | null;
  CampoFiltro: string | null;
  ValorFiltro: string | null;
  FiltroOperador: string | null;
  FiltroActivo: boolean;
  // Campos específicos para Tareas
  TareasTipoVisualizacion: "PendientesPropios" | "PendientesTotales" | null;
  TareasCategoria: "BandejaPersonal" | "BandejasGrupal" | null;
}

interface ValorLista {
  Id: number;
  Valor: string;
}

export default function DashboardConfigPage() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(null);
  const [modulosDisponibles, setModulosDisponibles] = useState<Modulo[]>([]);
  const [widgets, setWidgets] = useState<ConfigWidget[]>([]);
  const [camposPorModulo, setCamposPorModulo] = useState<Record<number, Campo[]>>({});
  const [valoresLista, setValoresLista] = useState<Record<number, ValorLista[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (rolSeleccionado) {
      loadModulosDelRol();
      loadConfiguracionExistente();
    }
  }, [rolSeleccionado]);

  const loadRoles = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setRoles(data.data.filter((r: Rol) => r.Nombre !== "Administrador"));
      }
    } catch (error) {
      console.error("Error cargando roles:", error);
    }
  };

  const loadModulosDelRol = async () => {
    if (!rolSeleccionado) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Obtener permisos del rol
      const rolResponse = await fetch(`/api/roles?id=${rolSeleccionado}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rolData = await rolResponse.json();

      if (rolData.success) {
        const permisos = rolData.data.Permisos || [];
        const modulosConPermiso = permisos
          .filter((p: any) => p.PermisoVer)
          .map((p: any) => ({ Id: p.ModuloId, Nombre: p.ModuloNombre, Tipo: "" }));

        setModulosDisponibles(modulosConPermiso);

        // Cargar campos para cada módulo
        const camposMap: Record<number, Campo[]> = {};
        for (const modulo of modulosConPermiso) {
          const camposRes = await fetch(`/api/modulos/${modulo.Id}/datos`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const camposData = await camposRes.json();
          if (camposData.success) {
            const camposModulo = camposData.data.campos || [];
            camposMap[modulo.Id] = camposModulo;
            
            // Cargar valores de listas para cada módulo
            const camposConLista = camposModulo.filter((c: Campo) => c.ListaId);
            const valoresMap: Record<number, ValorLista[]> = {};
            
            for (const campo of camposConLista) {
              if (campo.ListaId) {
                try {
                  const valoresRes = await fetch(`/api/listas/${campo.ListaId}/valores`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const valoresData = await valoresRes.json();
                  if (valoresData.success) {
                    valoresMap[campo.ListaId] = valoresData.data;
                  }
                } catch (error) {
                  console.error(`Error cargando valores de lista ${campo.ListaId}:`, error);
                }
              }
            }
            
            if (Object.keys(valoresMap).length > 0) {
              setValoresLista(prev => ({ ...prev, ...valoresMap }));
            }
          }
        }
        setCamposPorModulo(camposMap);
      }
    } catch (error) {
      console.error("Error cargando módulos del rol:", error);
      toast({
        title: "Error",
        description: "Error cargando módulos del rol",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConfiguracionExistente = async () => {
    if (!rolSeleccionado) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/dashboard-config?rolId=${rolSeleccionado}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const widgetsExistentes = data.data.map((config: any, index: number) => ({
          id: `widget-${Date.now()}-${index}`,
          Tipo: config.Tipo || "Modulos", // Default a Modulos para compatibilidad con configs viejos
          // Campos de Módulos
          ModuloId: config.ModuloId || 0,
          ModuloNombre: config.ModuloNombre || "",
          TipoVisualizacion: config.TipoVisualizacion || "Agrupamiento",
          CampoAgrupamiento: config.CampoAgrupamiento || null,
          CampoFiltro: config.CampoFiltro || null,
          ValorFiltro: config.ValorFiltro || null,
          FiltroOperador: config.FiltroOperador || '=',
          FiltroActivo: config.FiltroActivo || false,
          // Campos de Tareas
          TareasTipoVisualizacion: config.TareasTipoVisualizacion || null,
          TareasCategoria: config.TareasCategoria || null,
        }));
        setWidgets(widgetsExistentes);
      } else {
        setWidgets([]);
      }
    } catch (error) {
      console.error("Error cargando configuración existente:", error);
    }
  };

  const agregarWidget = () => {
    const nuevoWidget: ConfigWidget = {
      id: `widget-${Date.now()}`,
      Tipo: "Modulos",
      ModuloId: 0,
      ModuloNombre: "",
      TipoVisualizacion: "Agrupamiento",
      CampoAgrupamiento: null,
      CampoFiltro: null,
      ValorFiltro: null,
      FiltroOperador: "=",
      FiltroActivo: false,
      TareasTipoVisualizacion: null,
      TareasCategoria: null,
    };
    setWidgets([...widgets, nuevoWidget]);
  };

  const actualizarWidget = (id: string, campo: string, valor: any) => {
    setWidgets(prevWidgets => prevWidgets.map(w => {
      if (w.id === id) {
        const updated = { ...w, [campo]: valor };
        
        // Si cambia el tipo (Modulos/Tareas), resetear campos específicos
        if (campo === "Tipo") {
          if (valor === "Modulos") {
            updated.TareasTipoVisualizacion = null;
            updated.TareasCategoria = null;
            updated.TipoVisualizacion = "Agrupamiento";
          } else if (valor === "Tareas") {
            updated.ModuloId = 0;
            updated.ModuloNombre = "";
            updated.CampoAgrupamiento = null;
            updated.CampoFiltro = null;
            updated.ValorFiltro = null;
            updated.TipoVisualizacion = "Agrupamiento";
            updated.TareasTipoVisualizacion = "PendientesPropios";
            updated.TareasCategoria = "BandejaPersonal";
          }
        }
        
        // Si cambia el módulo, actualizar el nombre y resetear campos
        if (campo === "ModuloId") {
          const modulo = modulosDisponibles.find(m => m.Id === parseInt(valor));
          updated.ModuloNombre = modulo?.Nombre || "";
          updated.CampoAgrupamiento = null;
          updated.CampoFiltro = null;
          updated.ValorFiltro = null;
          
          // Cargar campos del módulo si no están cargados
          if (valor && !camposPorModulo[parseInt(valor)]) {
            cargarCamposModulo(parseInt(valor));
          }
        }
        
        // Si cambia el tipo de visualización, resetear campos
        if (campo === "TipoVisualizacion") {
          updated.CampoAgrupamiento = null;
          updated.CampoFiltro = null;
          updated.ValorFiltro = null;
        }
        
        return updated;
      }
      return w;
    }));
  };

  const cargarCamposModulo = async (moduloId: number) => {
    try {
      const token = localStorage.getItem("token");
      console.log(`Cargando campos para módulo ${moduloId}...`);
      
      const camposRes = await fetch(`/api/modulos/${moduloId}/datos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const camposData = await camposRes.json();
      
      console.log(`Respuesta de módulo ${moduloId}:`, camposData);
      
      if (camposData.success) {
        const camposModulo = camposData.data.campos || [];
        console.log(`Campos obtenidos para módulo ${moduloId}:`, camposModulo);
        
        setCamposPorModulo(prev => {
          const updated = { ...prev, [moduloId]: camposModulo };
          console.log('Campos actualizados:', updated);
          return updated;
        });
        
        // Cargar valores de listas
        const camposConLista = camposModulo.filter((c: Campo) => c.ListaId);
        console.log(`Campos con lista en módulo ${moduloId}:`, camposConLista);
        
        const valoresMap: Record<number, ValorLista[]> = {};
        
        for (const campo of camposConLista) {
          if (campo.ListaId && !valoresLista[campo.ListaId]) {
            try {
              console.log(`Cargando valores de lista ${campo.ListaId}...`);
              const valoresRes = await fetch(`/api/listas/${campo.ListaId}/valores`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const valoresData = await valoresRes.json();
              if (valoresData.success) {
                valoresMap[campo.ListaId] = valoresData.data;
                console.log(`Valores de lista ${campo.ListaId}:`, valoresData.data);
              }
            } catch (error) {
              console.error(`Error cargando valores de lista ${campo.ListaId}:`, error);
            }
          }
        }
        
        if (Object.keys(valoresMap).length > 0) {
          setValoresLista(prev => {
            const updated = { ...prev, ...valoresMap };
            console.log('Valores de listas actualizados:', updated);
            return updated;
          });
        }
      }
    } catch (error) {
      console.error(`Error cargando campos del módulo ${moduloId}:`, error);
    }
  };

  const eliminarWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const moverWidget = (id: string, direccion: "arriba" | "abajo") => {
    const index = widgets.findIndex(w => w.id === id);
    if (
      (direccion === "arriba" && index > 0) ||
      (direccion === "abajo" && index < widgets.length - 1)
    ) {
      const newWidgets = [...widgets];
      const targetIndex = direccion === "arriba" ? index - 1 : index + 1;
      [newWidgets[index], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[index]];
      setWidgets(newWidgets);
    }
  };

  const guardarConfiguracion = async () => {
    if (!rolSeleccionado) {
      toast({
        title: "Error",
        description: "Debe seleccionar un rol",
        variant: "destructive",
      });
      return;
    }

    // Validar widgets
    for (const widget of widgets) {
      // Validar widgets de Módulos
      if (widget.Tipo === "Modulos") {
        if (!widget.ModuloId) {
          toast({
            title: "Error",
            description: "Todos los widgets de módulos deben tener un módulo seleccionado",
            variant: "destructive",
          });
          return;
        }

        if (widget.TipoVisualizacion === "Agrupamiento" && !widget.CampoAgrupamiento) {
          toast({
            title: "Error",
            description: `El widget de ${widget.ModuloNombre} tipo Agrupamiento debe tener un campo seleccionado`,
            variant: "destructive",
          });
          return;
        }

        if (widget.FiltroActivo && (!widget.CampoFiltro || !widget.ValorFiltro)) {
          toast({
            title: "Error",
            description: `El widget de ${widget.ModuloNombre} con filtro activo debe tener campo y valor de filtro`,
            variant: "destructive",
          });
          return;
        }
      }
      
      // Validar widgets de Tareas
      if (widget.Tipo === "Tareas") {
        if (!widget.TareasTipoVisualizacion || !widget.TareasCategoria) {
          toast({
            title: "Error",
            description: "Los widgets de tareas deben tener tipo de visualización y categoría seleccionados",
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch("/api/dashboard-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          RolId: rolSeleccionado,
          Configuraciones: widgets.map(w => ({
            Tipo: w.Tipo,
            // Campos para widgets de Módulos
            ModuloId: w.Tipo === "Modulos" ? w.ModuloId : null,
            TipoVisualizacion: w.Tipo === "Modulos" ? w.TipoVisualizacion : null,
            CampoAgrupamiento: w.Tipo === "Modulos" ? w.CampoAgrupamiento : null,
            CampoFiltro: w.Tipo === "Modulos" ? w.CampoFiltro : null,
            ValorFiltro: w.Tipo === "Modulos" ? w.ValorFiltro : null,
            FiltroOperador: w.Tipo === "Modulos" ? (w.FiltroOperador || '=') : null,
            FiltroActivo: w.Tipo === "Modulos" ? (w.FiltroActivo || false) : null,
            // Campos para widgets de Tareas
            TareasTipoVisualizacion: w.Tipo === "Tareas" ? w.TareasTipoVisualizacion : null,
            TareasCategoria: w.Tipo === "Tareas" ? w.TareasCategoria : null,
          })),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Éxito",
          description: "Configuración guardada exitosamente",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Error guardando configuración",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error guardando configuración:", error);
      toast({
        title: "Error",
        description: "Error guardando configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCamposPorTipo = (moduloId: number, tipoDato?: string) => {
    const campos = camposPorModulo[moduloId] || [];
    if (!tipoDato) return campos;
    return campos.filter(c => c.TipoDato === tipoDato);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure los widgets del dashboard por rol
          </p>
        </div>
      </div>

      {/* Selección de Rol */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Rol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Rol</Label>
            <select
              value={rolSeleccionado || ""}
              onChange={(e) => setRolSeleccionado(parseInt(e.target.value) || null)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            >
              <option value="">Seleccione un rol...</option>
              {roles.map((rol) => (
                <option key={rol.Id} value={rol.Id}>
                  {rol.Nombre}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Widgets */}
      {rolSeleccionado && (
        <>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Widgets del Dashboard</CardTitle>
                <Button onClick={agregarWidget} disabled={loading}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Widget
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Cargando módulos...</div>
              ) : widgets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay widgets configurados. Haga clic en "Agregar Widget" para comenzar.
                </div>
              ) : (
                <div className="space-y-4">
                  {widgets.map((widget, index) => (
                    <Card key={widget.id} className="border-2">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-semibold">Widget {index + 1}</h3>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => moverWidget(widget.id, "arriba")}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => moverWidget(widget.id, "abajo")}
                                disabled={index === widgets.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => eliminarWidget(widget.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Selector de Tipo: Módulos o Tareas */}
                          <div className="space-y-2">
                            <Label>Tipo de Widget</Label>
                            <select
                              value={widget.Tipo}
                              onChange={(e) => actualizarWidget(widget.id, "Tipo", e.target.value)}
                              className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            >
                              <option value="Modulos">Módulos</option>
                              <option value="Tareas">Tareas</option>
                            </select>
                          </div>

                          {/* Campos para Widgets de Módulos */}
                          {widget.Tipo === "Modulos" && (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Módulo</Label>
                                  <select
                                    value={widget.ModuloId || ""}
                                    onChange={(e) =>
                                      actualizarWidget(widget.id, "ModuloId", e.target.value)
                                    }
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                  >
                                    <option value="">Seleccione un módulo...</option>
                                    {modulosDisponibles.map((modulo) => (
                                      <option key={modulo.Id} value={modulo.Id}>
                                        {modulo.Nombre}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Tipo de Visualización</Label>
                                  <select
                                    value={widget.TipoVisualizacion}
                                    onChange={(e) =>
                                      actualizarWidget(widget.id, "TipoVisualizacion", e.target.value)
                                    }
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    disabled={!widget.ModuloId}
                                  >
                                    <option value="Agrupamiento">Agrupamiento</option>
                                    <option value="DetalleFiltrado">Detalle Filtrado</option>
                                    <option value="Totalizado">Totalizado</option>
                              </select>
                            </div>
                          </div>

                          {widget.ModuloId && widget.TipoVisualizacion === "Agrupamiento" && (
                            <>
                              <div className="space-y-2">
                                <Label>Campo de Agrupamiento</Label>
                                <select
                                  value={widget.CampoAgrupamiento || ""}
                                  onChange={(e) =>
                                    actualizarWidget(widget.id, "CampoAgrupamiento", e.target.value)
                                  }
                                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                >
                                  <option value="">Seleccione un campo...</option>
                                  {getCamposPorTipo(widget.ModuloId).map((campo) => (
                                    <option key={campo.Nombre} value={campo.Nombre}>
                                      {campo.Nombre}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="border-t pt-4 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`filtro-${widget.id}`}
                                    checked={widget.FiltroActivo}
                                    onChange={(e) => actualizarWidget(widget.id, "FiltroActivo", e.target.checked)}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`filtro-${widget.id}`} className="font-normal">
                                    Aplicar filtro opcional
                                  </Label>
                                </div>

                                {widget.FiltroActivo && (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-6 border-l-2">
                                    <div className="space-y-2">
                                      <Label className="text-sm">Campo</Label>
                                      <select
                                        value={widget.CampoFiltro || ""}
                                        onChange={(e) => {
                                          actualizarWidget(widget.id, "CampoFiltro", e.target.value);
                                          actualizarWidget(widget.id, "ValorFiltro", null);
                                        }}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                      >
                                        <option value="">Seleccione...</option>
                                        {getCamposPorTipo(widget.ModuloId).map((campo) => (
                                          <option key={campo.Nombre} value={campo.Nombre}>
                                            {campo.Nombre}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-sm">Operador</Label>
                                      <select
                                        value={widget.FiltroOperador || "="}
                                        onChange={(e) => actualizarWidget(widget.id, "FiltroOperador", e.target.value)}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                      >
                                        <option value="=">=</option>
                                        <option value="<>">≠</option>
                                        <option value="<">&lt;</option>
                                        <option value=">">&gt;</option>
                                        <option value="<=">≤</option>
                                        <option value=">=">≥</option>
                                      </select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-sm">Valor</Label>
                                      {(() => {
                                        const campo = getCamposPorTipo(widget.ModuloId).find(
                                          c => c.Nombre === widget.CampoFiltro
                                        );
                                        
                                        if (campo?.ListaId && valoresLista[campo.ListaId]) {
                                          return (
                                            <select
                                              value={widget.ValorFiltro || ""}
                                              onChange={(e) => actualizarWidget(widget.id, "ValorFiltro", e.target.value)}
                                              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                            >
                                              <option value="">Seleccione...</option>
                                              {valoresLista[campo.ListaId].map((valor) => (
                                                <option key={valor.Id} value={valor.Valor}>
                                                  {valor.Valor}
                                                </option>
                                              ))}
                                            </select>
                                          );
                                        }
                                        
                                        return (
                                          <input
                                            type="text"
                                            value={widget.ValorFiltro || ""}
                                            onChange={(e) => actualizarWidget(widget.id, "ValorFiltro", e.target.value)}
                                            placeholder="Valor"
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                                            disabled={!widget.CampoFiltro}
                                          />
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {widget.ModuloId && widget.TipoVisualizacion === "DetalleFiltrado" && (
                            <div className="space-y-2 border-t pt-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <input
                                  type="checkbox"
                                  id={`filtro-det-${widget.id}`}
                                  checked={widget.FiltroActivo}
                                  onChange={(e) => actualizarWidget(widget.id, "FiltroActivo", e.target.checked)}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`filtro-det-${widget.id}`} className="font-normal">
                                  Aplicar filtro
                                </Label>
                              </div>

                              {widget.FiltroActivo && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6 border-l-2">
                                  <div className="space-y-2">
                                    <Label>Campo de Filtro</Label>
                                    <select
                                      value={widget.CampoFiltro || ""}
                                      onChange={(e) => {
                                        actualizarWidget(widget.id, "CampoFiltro", e.target.value);
                                        actualizarWidget(widget.id, "ValorFiltro", null);
                                      }}
                                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    >
                                      <option value="">Seleccione un campo...</option>
                                      {getCamposPorTipo(widget.ModuloId).map((campo) => (
                                        <option key={campo.Nombre} value={campo.Nombre}>
                                          {campo.Nombre}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Operador</Label>
                                    <select
                                      value={widget.FiltroOperador || "="}
                                      onChange={(e) => actualizarWidget(widget.id, "FiltroOperador", e.target.value)}
                                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    >
                                      <option value="=">=</option>
                                      <option value="<>">≠</option>
                                      <option value="<">&lt;</option>
                                      <option value=">">&gt;</option>
                                      <option value="<=">≤</option>
                                      <option value=">=">≥</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Valor del Filtro</Label>
                                    {(() => {
                                      const campo = getCamposPorTipo(widget.ModuloId).find(
                                        c => c.Nombre === widget.CampoFiltro
                                      );
                                      
                                      if (campo?.ListaId && valoresLista[campo.ListaId]) {
                                        return (
                                          <select
                                            value={widget.ValorFiltro || ""}
                                            onChange={(e) =>
                                              actualizarWidget(widget.id, "ValorFiltro", e.target.value)
                                            }
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                          >
                                            <option value="">Seleccione un valor...</option>
                                            {valoresLista[campo.ListaId].map((valor) => (
                                              <option key={valor.Id} value={valor.Valor}>
                                                {valor.Valor}
                                              </option>
                                            ))}
                                          </select>
                                        );
                                      }
                                      
                                      return (
                                        <input
                                          type="text"
                                          value={widget.ValorFiltro || ""}
                                          onChange={(e) =>
                                            actualizarWidget(widget.id, "ValorFiltro", e.target.value)
                                          }
                                          placeholder="Ingrese el valor del filtro"
                                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                          disabled={!widget.CampoFiltro}
                                        />
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {widget.ModuloId && widget.TipoVisualizacion === "Totalizado" && (
                            <div className="space-y-2 border-t pt-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <input
                                  type="checkbox"
                                  id={`filtro-tot-${widget.id}`}
                                  checked={widget.FiltroActivo}
                                  onChange={(e) => actualizarWidget(widget.id, "FiltroActivo", e.target.checked)}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`filtro-tot-${widget.id}`} className="font-normal">
                                  Aplicar filtro al total
                                </Label>
                              </div>

                              {widget.FiltroActivo && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6 border-l-2">
                                  <div className="space-y-2">
                                    <Label>Campo de Filtro</Label>
                                    <select
                                      value={widget.CampoFiltro || ""}
                                      onChange={(e) => {
                                        actualizarWidget(widget.id, "CampoFiltro", e.target.value);
                                        actualizarWidget(widget.id, "ValorFiltro", null);
                                      }}
                                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    >
                                      <option value="">Seleccione un campo...</option>
                                      {getCamposPorTipo(widget.ModuloId).map((campo) => (
                                        <option key={campo.Nombre} value={campo.Nombre}>
                                          {campo.Nombre}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Operador</Label>
                                    <select
                                      value={widget.FiltroOperador || "="}
                                      onChange={(e) => actualizarWidget(widget.id, "FiltroOperador", e.target.value)}
                                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    >
                                      <option value="=">=</option>
                                      <option value="<>">≠</option>
                                      <option value="<">&lt;</option>
                                      <option value=">">&gt;</option>
                                      <option value="<=">≤</option>
                                      <option value=">=">≥</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Valor del Filtro</Label>
                                    {(() => {
                                      const campo = getCamposPorTipo(widget.ModuloId).find(
                                        c => c.Nombre === widget.CampoFiltro
                                      );
                                      
                                      if (campo?.ListaId && valoresLista[campo.ListaId]) {
                                        return (
                                          <select
                                            value={widget.ValorFiltro || ""}
                                            onChange={(e) =>
                                              actualizarWidget(widget.id, "ValorFiltro", e.target.value)
                                            }
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                          >
                                            <option value="">Seleccione un valor...</option>
                                            {valoresLista[campo.ListaId].map((valor) => (
                                              <option key={valor.Id} value={valor.Valor}>
                                                {valor.Valor}
                                              </option>
                                            ))}
                                          </select>
                                        );
                                      }
                                      
                                      return (
                                        <input
                                          type="text"
                                          value={widget.ValorFiltro || ""}
                                          onChange={(e) =>
                                            actualizarWidget(widget.id, "ValorFiltro", e.target.value)
                                          }
                                          placeholder="Ingrese el valor del filtro"
                                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                          disabled={!widget.CampoFiltro}
                                        />
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                            </>
                          )}

                          {/* Campos para Widgets de Tareas */}
                          {widget.Tipo === "Tareas" && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Tipo de Visualización</Label>
                                  <select
                                    value={widget.TareasTipoVisualizacion || ""}
                                    onChange={(e) =>
                                      actualizarWidget(widget.id, "TareasTipoVisualizacion", e.target.value)
                                    }
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                  >
                                    <option value="">Seleccione tipo...</option>
                                    <option value="PendientesPropios">Pendientes Propios</option>
                                    <option value="PendientesTotales">Pendientes Totales</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Categoría</Label>
                                  <select
                                    value={widget.TareasCategoria || ""}
                                    onChange={(e) =>
                                      actualizarWidget(widget.id, "TareasCategoria", e.target.value)
                                    }
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                  >
                                    <option value="">Seleccione categoría...</option>
                                    <option value="BandejaPersonal">Bandeja Personal</option>
                                    <option value="BandejasGrupal">Bandejas Grupal</option>
                                  </select>
                                </div>
                              </div>

                              {/* Descripción del widget según configuración */}
                              {widget.TareasTipoVisualizacion && widget.TareasCategoria && (
                                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                                  <p className="text-sm text-blue-900">
                                    {widget.TareasTipoVisualizacion === "PendientesPropios" &&
                                      widget.TareasCategoria === "BandejaPersonal" && (
                                        <>
                                          <strong>Visualización:</strong> Muestra las tareas pendientes del usuario en su bandeja personal.
                                          Incluye contador de tareas vencidas.
                                        </>
                                      )}
                                    {widget.TareasTipoVisualizacion === "PendientesPropios" &&
                                      widget.TareasCategoria === "BandejasGrupal" && (
                                        <>
                                          <strong>Visualización:</strong> Muestra agregado de todas las bandejas del usuario:
                                          total pendientes, tareas tomadas por el usuario, y tareas vencidas.
                                        </>
                                      )}
                                    {widget.TareasTipoVisualizacion === "PendientesTotales" &&
                                      widget.TareasCategoria === "BandejaPersonal" && (
                                        <>
                                          <strong>Visualización:</strong> Lista todos los usuarios con tareas pendientes en su bandeja personal,
                                          mostrando contadores de pendientes y vencidas por usuario.
                                        </>
                                      )}
                                    {widget.TareasTipoVisualizacion === "PendientesTotales" &&
                                      widget.TareasCategoria === "BandejasGrupal" && (
                                        <>
                                          <strong>Visualización:</strong> Lista todas las bandejas con sus tareas pendientes y tomadas,
                                          mostrando contadores totales y vencidas por bandeja.
                                        </>
                                      )}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setWidgets([])}>
              Cancelar
            </Button>
            <Button onClick={guardarConfiguracion} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
