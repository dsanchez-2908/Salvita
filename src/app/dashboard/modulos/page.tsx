"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical, Save, X, Edit, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Modulo, Lista, TipoDato, TipoModulo, CreateModuloRequest, Campo } from "@/types";

export default function ModulosPage() {
  const { toast } = useToast();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModulo, setEditingModulo] = useState<Modulo | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    Nombre: "",
    Tipo: "Principal" as TipoModulo,
    ModuloPadreId: null as number | null,
    Icono: "FileText",
    Orden: 1,
  });

  const [campos, setCampos] = useState<(Omit<Campo, "CampoId" | "ModuloId"> & { tempId: string })[]>([
    {
      tempId: crypto.randomUUID(),
      Nombre: "",
      TipoDato: "Texto",
      Largo: 100,
      ListaId: null,
      Orden: 1,
      Visible: true,
      VisibleEnGrilla: true,
      Obligatorio: false,
    },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Obtener módulos
      const resModulos = await fetch("/api/modulos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resModulos.ok) {
        const dataModulos = await resModulos.json();
        setModulos(dataModulos.data || []);
      }

      // Obtener listas
      const resListas = await fetch("/api/listas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resListas.ok) {
        const dataListas = await resListas.json();
        setListas(dataListas.data || []);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.Nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del módulo es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (campos.length === 0 || !campos[0].Nombre) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un campo",
        variant: "destructive",
      });
      return;
    }

    // Validar que todos los campos tengan nombre
    for (let i = 0; i < campos.length; i++) {
      if (!campos[i].Nombre.trim()) {
        toast({
          title: "Error",
          description: `El campo ${i + 1} debe tener un nombre`,
          variant: "destructive",
        });
        return;
      }
      if (campos[i].TipoDato === "Lista" && !campos[i].ListaId) {
        toast({
          title: "Error",
          description: `El campo "${campos[i].Nombre}" requiere seleccionar una lista`,
          variant: "destructive",
        });
        return;
      }
    }

    const requestData: CreateModuloRequest = {
      Nombre: formData.Nombre,
      Tipo: formData.Tipo,
      ModuloPrincipalId: formData.ModuloPadreId,
      Icono: formData.Icono,
      Orden: formData.Orden,
      Campos: campos.map(({ tempId, ...campo }) => campo),
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/modulos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Módulo creado correctamente",
        });
        setShowForm(false);
        resetForm();
        fetchData();
        // Recargar la página para actualizar el sidebar
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "No se pudo crear el módulo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al crear el módulo",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      Nombre: "",
      Tipo: "Principal",
      ModuloPadreId: null,
      Icono: "FileText",
      Orden: modulos.length + 1,
    });
    setCampos([
      {
        tempId: crypto.randomUUID(),
        Nombre: "",
        TipoDato: "Texto",
        Largo: 100,
        ListaId: null,
        Orden: 1,
        Visible: true,
        VisibleEnGrilla: true,
        Obligatorio: false,
      },
    ]);
  };

  const addCampo = () => {
    setCampos([
      ...campos,
      {
        tempId: crypto.randomUUID(),
        Nombre: "",
        TipoDato: "Texto",
        Largo: 100,
        ListaId: null,
        Orden: campos.length + 1,
        Visible: true,
        VisibleEnGrilla: true,
        Obligatorio: false,
      },
    ]);
  };

  const removeCampo = (index: number) => {
    if (campos.length > 1) {
      setCampos(campos.filter((_, i) => i !== index));
    }
  };

  const updateCampo = (index: number, field: string, value: any) => {
    const newCampos = [...campos];
    
    // Si cambiamos el tipo de dato, resetear campos relacionados
    if (field === "TipoDato") {
      if (value === "Texto") {
        newCampos[index] = { ...newCampos[index], TipoDato: value, Largo: 100, ListaId: null };
      } else if (value === "Lista") {
        newCampos[index] = { ...newCampos[index], TipoDato: value, Largo: null, ListaId: null };
      } else {
        newCampos[index] = { ...newCampos[index], TipoDato: value, Largo: null, ListaId: null };
      }
    } else {
      newCampos[index] = { ...newCampos[index], [field]: value };
    }
    
    setCampos(newCampos);
  };

  const handleDeleteModulo = async (moduloId: number) => {
    if (!confirm("¿Está seguro de eliminar este módulo? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/modulos?id=${moduloId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Módulo eliminado correctamente",
        });
        fetchData();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "No se pudo eliminar el módulo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al eliminar el módulo",
        variant: "destructive",
      });
    }
  };

  const tiposDato: TipoDato[] = ["Texto", "Descripcion", "Numero", "Fecha", "FechaHora", "Lista", "Archivo"];
  const tiposModulo: TipoModulo[] = ["Principal", "Secundario", "Independiente"];
  const iconos = ["FileText", "Users", "Calendar", "Home", "Settings", "List", "Folder", "File"];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Administración de Módulos</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Módulo
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Crear Nuevo Módulo</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información del Módulo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre del Módulo *</Label>
                  <Input
                    id="nombre"
                    value={formData.Nombre}
                    onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                    placeholder="ej: Residentes"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tipo">Tipo de Módulo</Label>
                  <select
                    id="tipo"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.Tipo}
                    onChange={(e) =>
                      setFormData({ ...formData, Tipo: e.target.value as TipoModulo })
                    }
                  >
                    {tiposModulo.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.Tipo === "Secundario" && (
                  <div>
                    <Label htmlFor="moduloPadre">Módulo Padre *</Label>
                    <select
                      id="moduloPadre"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.ModuloPadreId || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ModuloPadreId: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {modulos
                        .filter((m) => m.Tipo === "Principal")
                        .map((m) => (
                          <option key={m.Id} value={m.Id}>
                            {m.Nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <Label htmlFor="icono">Icono</Label>
                  <select
                    id="icono"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.Icono}
                    onChange={(e) => setFormData({ ...formData, Icono: e.target.value })}
                  >
                    {iconos.map((icono) => (
                      <option key={icono} value={icono}>
                        {icono}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={formData.Orden}
                    onChange={(e) =>
                      setFormData({ ...formData, Orden: parseInt(e.target.value) || 1 })
                    }
                    min="1"
                  />
                </div>
              </div>

              {/* Campos */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg">Campos del Módulo</Label>
                  <Button type="button" size="sm" onClick={addCampo}>
                    <Plus className="mr-2 h-4 w-4" /> Agregar Campo
                  </Button>
                </div>

                <div className="space-y-3">
                  {campos.map((campo, index) => (
                    <Card key={campo.tempId} className="p-4">
                      <div className="grid grid-cols-12 gap-3 items-start">
                        <div className="col-span-1 flex items-center justify-center pt-8">
                          <GripVertical className="h-5 w-5 text-gray-400" />
                        </div>

                        <div className="col-span-3">
                          <Label>Nombre *</Label>
                          <Input
                            value={campo.Nombre}
                            onChange={(e) => updateCampo(index, "Nombre", e.target.value)}
                            placeholder="Nombre del campo"
                            required
                          />
                        </div>

                        <div className="col-span-2">
                          <Label>Tipo *</Label>
                          <select
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            value={campo.TipoDato}
                            onChange={(e) => updateCampo(index, "TipoDato", e.target.value)}
                          >
                            {tiposDato.map((tipo) => (
                              <option key={tipo} value={tipo}>
                                {tipo}
                              </option>
                            ))}
                          </select>
                        </div>

                        {campo.TipoDato === "Texto" && (
                          <div className="col-span-1">
                            <Label>Largo</Label>
                            <Input
                              type="number"
                              value={campo.Largo || 100}
                              onChange={(e) =>
                                updateCampo(index, "Largo", parseInt(e.target.value) || 100)
                              }
                              min="1"
                              max="8000"
                            />
                          </div>
                        )}

                        {campo.TipoDato === "Lista" && (
                          <div className="col-span-2">
                            <Label htmlFor={`lista-${campo.tempId}`}>Lista *</Label>
                            <select
                              id={`lista-${campo.tempId}`}
                              className="w-full border border-gray-300 rounded-md px-3 py-2"
                              value={campo.ListaId || ""}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                const newValue = selectedValue && selectedValue !== "" ? parseInt(selectedValue, 10) : null;
                                
                                const updatedCampos = [...campos];
                                updatedCampos[index] = { ...updatedCampos[index], ListaId: newValue };
                                setCampos(updatedCampos);
                              }}
                              required
                            >
                              <option value="">Seleccionar...</option>
                              {listas.map((lista) => (
                                <option key={`lista-opt-${lista.Id}`} value={lista.Id}>
                                  {lista.Nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {campo.TipoDato !== "Texto" && campo.TipoDato !== "Lista" && (
                          <div className="col-span-1"></div>
                        )}

                        <div className="col-span-3 space-y-1 pt-6">
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={campo.Obligatorio}
                              onChange={(e) => updateCampo(index, "Obligatorio", e.target.checked)}
                            />
                            <span>Obligatorio</span>
                          </label>
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={campo.VisibleEnGrilla}
                              onChange={(e) =>
                                updateCampo(index, "VisibleEnGrilla", e.target.checked)
                              }
                            />
                            <span>Visible en grilla</span>
                          </label>
                        </div>

                        <div className="col-span-1 flex items-center justify-center pt-8">
                          {campos.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCampo(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" /> Crear Módulo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Módulos */}
      <Card>
        <CardHeader>
          <CardTitle>Módulos Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {modulos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="mx-auto h-12 w-12 mb-3 text-gray-400" />
              <p>No hay módulos creados</p>
              <p className="text-sm mt-2">Haz clic en "Nuevo Módulo" para crear uno</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">Icono</th>
                    <th className="text-left p-3">Orden</th>
                    <th className="text-left p-3">Tabla</th>
                    <th className="text-right p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {modulos.map((modulo) => (
                    <tr key={modulo.ModuloId} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{modulo.Nombre}</td>
                      <td className="p-3">{modulo.Tipo}</td>
                      <td className="p-3">{modulo.Icono}</td>
                      <td className="p-3">{modulo.Orden}</td>
                      <td className="p-3 text-xs text-gray-500">{modulo.NombreTabla}</td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteModulo(modulo.ModuloId)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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
