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
  ModuloId: number;
  ModuloNombre: string;
  TipoVisualizacion: "Agrupamiento" | "DetalleFiltrado";
  CampoAgrupamiento: string | null;
  CampoFiltro: string | null;
  ValorFiltro: string | null;
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
          ModuloId: config.ModuloId,
          ModuloNombre: config.ModuloNombre,
          TipoVisualizacion: config.TipoVisualizacion,
          CampoAgrupamiento: config.CampoAgrupamiento,
          CampoFiltro: config.CampoFiltro,
          ValorFiltro: config.ValorFiltro,
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
      ModuloId: 0,
      ModuloNombre: "",
      TipoVisualizacion: "Agrupamiento",
      CampoAgrupamiento: null,
      CampoFiltro: null,
      ValorFiltro: null,
    };
    setWidgets([...widgets, nuevoWidget]);
  };

  const actualizarWidget = (id: string, campo: string, valor: any) => {
    setWidgets(prevWidgets => prevWidgets.map(w => {
      if (w.id === id) {
        const updated = { ...w, [campo]: valor };
        
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
      if (!widget.ModuloId) {
        toast({
          title: "Error",
          description: "Todos los widgets deben tener un módulo seleccionado",
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

      if (widget.TipoVisualizacion === "DetalleFiltrado" && (!widget.CampoFiltro || !widget.ValorFiltro)) {
        toast({
          title: "Error",
          description: `El widget de ${widget.ModuloNombre} tipo Detalle Filtrado debe tener campo y valor de filtro`,
          variant: "destructive",
        });
        return;
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
            ModuloId: w.ModuloId,
            TipoVisualizacion: w.TipoVisualizacion,
            CampoAgrupamiento: w.CampoAgrupamiento,
            CampoFiltro: w.CampoFiltro,
            ValorFiltro: w.ValorFiltro,
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
                                <option value="Agrupamiento">
                                  <BarChart3 className="inline mr-2" />
                                  Agrupamiento
                                </option>
                                <option value="DetalleFiltrado">
                                  <Table2 className="inline mr-2" />
                                  Detalle Filtrado
                                </option>
                              </select>
                            </div>
                          </div>

                          {widget.ModuloId && widget.TipoVisualizacion === "Agrupamiento" && (
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
                          )}

                          {widget.ModuloId && widget.TipoVisualizacion === "DetalleFiltrado" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                          <option key={valor.Id} value={valor.Id}>
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
