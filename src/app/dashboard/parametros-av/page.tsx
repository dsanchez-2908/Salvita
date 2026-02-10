"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Edit, Trash2, X, MessageSquare, Settings as SettingsIcon } from "lucide-react";

interface ParametroAV {
  Id: number;
  ModuloId: number;
  ModuloNombre: string;
  ModuloIcono: string;
  Prompt: string | null;
  Temperatura: string | null;
  MaxTokens: string | null;
  Modelo: string | null;
  Estado: string;
  FechaCreacion: string;
  FechaModificacion: string;
  UsuarioCreacion: string;
  UsuarioModificacion: string;
}

interface Modulo {
  Id: number;
  Nombre: string;
  Icono: string;
  MostrarEnMenu: boolean;
}

export default function ParametrosAVPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [parametros, setParametros] = useState<ParametroAV[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    ModuloId: "",
    Prompt: "",
    Temperatura: "",
    MaxTokens: "",
    Modelo: "",
    Estado: "Activo",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Cargar parámetros AV
      const resParametros = await fetch("/api/parametros-av", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataParametros = await resParametros.json();

      // Cargar módulos que se muestran en el menú
      const resModulos = await fetch("/api/modulos-v2?soloMenu=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataModulos = await resModulos.json();

      if (dataParametros.success) {
        setParametros(dataParametros.data || []);
      }

      if (dataModulos.success) {
        setModulos(dataModulos.data || []);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
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

    try {
      const token = localStorage.getItem("token");
      const url = editingId
        ? `/api/parametros-av?id=${editingId}`
        : "/api/parametros-av";

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: editingId ? "Actualizado" : "Creado",
          description: data.message,
        });
        setShowModal(false);
        resetForm();
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error guardando configuración:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (parametro: ParametroAV) => {
    setEditingId(parametro.Id);
    setFormData({
      ModuloId: parametro.ModuloId.toString(),
      Prompt: parametro.Prompt || "",
      Temperatura: parametro.Temperatura || "",
      MaxTokens: parametro.MaxTokens || "",
      Modelo: parametro.Modelo || "",
      Estado: parametro.Estado,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "¿Eliminar configuración?",
      message: "Esta acción no se puede deshacer.",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/parametros-av?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Eliminado",
          description: data.message,
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error eliminando configuración:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la configuración",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      ModuloId: "",
      Prompt: "",
      Temperatura: "",
      MaxTokens: "",
      Modelo: "",
      Estado: "Activo",
    });
  };

  const getModulosSinConfiguracion = () => {
    const modulosConfigurados = parametros.map((p) => p.ModuloId);
    return modulos.filter((m) => !modulosConfigurados.includes(m.Id));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Parámetros Asistente Virtual
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure el asistente virtual para cada módulo
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} disabled={getModulosSinConfiguracion().length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Configuración
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuraciones por Módulo</CardTitle>
        </CardHeader>
        <CardContent>
          {parametros.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay configuraciones del asistente virtual</p>
              <p className="text-sm">Agregue una configuración para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {parametros.map((parametro) => (
                <div
                  key={parametro.Id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <SettingsIcon className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">{parametro.ModuloNombre}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          parametro.Estado === "Activo"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {parametro.Estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                      {parametro.Prompt && (
                        <div className="col-span-2">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Prompt:
                          </span>
                          <p className="text-gray-600 dark:text-gray-400 mt-1 break-words">
                            {parametro.Prompt.length > 200
                              ? `${parametro.Prompt.substring(0, 200)}...`
                              : parametro.Prompt}
                          </p>
                        </div>
                      )}

                      {parametro.Modelo && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Modelo:
                          </span>
                          <p className="text-gray-600 dark:text-gray-400">{parametro.Modelo}</p>
                        </div>
                      )}

                      {parametro.Temperatura && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Temperatura:
                          </span>
                          <p className="text-gray-600 dark:text-gray-400">{parametro.Temperatura}</p>
                        </div>
                      )}

                      {parametro.MaxTokens && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Max Tokens:
                          </span>
                          <p className="text-gray-600 dark:text-gray-400">{parametro.MaxTokens}</p>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      Creado por {parametro.UsuarioCreacion} -{" "}
                      {new Date(parametro.FechaCreacion).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(parametro)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(parametro.Id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {editingId
                    ? "Editar Configuración del Asistente Virtual"
                    : "Nueva Configuración del Asistente Virtual"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modulo">Módulo *</Label>
                  <select
                    id="modulo"
                    value={formData.ModuloId}
                    onChange={(e) =>
                      setFormData({ ...formData, ModuloId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Seleccionar módulo...</option>
                    {editingId ? (
                      // Si estamos editando, mostrar solo el módulo actual
                      modulos
                        .filter(
                          (m) =>
                            m.Id ===
                            parametros.find((p) => p.Id === editingId)?.ModuloId
                        )
                        .map((modulo) => (
                          <option key={modulo.Id} value={modulo.Id}>
                            {modulo.Nombre}
                          </option>
                        ))
                    ) : (
                      // Si es nuevo, mostrar solo módulos sin configuración
                      getModulosSinConfiguracion().map((modulo) => (
                        <option key={modulo.Id} value={modulo.Id}>
                          {modulo.Nombre}
                        </option>
                      ))
                    )}
                  </select>
                  {!editingId && getModulosSinConfiguracion().length === 0 && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Todos los módulos ya tienen configuración del asistente
                      virtual
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt del Sistema</Label>
                  <Textarea
                    id="prompt"
                    value={formData.Prompt}
                    onChange={(e) =>
                      setFormData({ ...formData, Prompt: e.target.value })
                    }
                    placeholder="Eres un asistente experto en..."
                    rows={6}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Instrucciones base para el comportamiento del asistente en este
                    módulo
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input
                      id="modelo"
                      value={formData.Modelo}
                      onChange={(e) =>
                        setFormData({ ...formData, Modelo: e.target.value })
                      }
                      placeholder="gpt-4, claude-3, etc."
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Ej: gpt-4-turbo, claude-3-opus
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temperatura">Temperatura</Label>
                    <Input
                      id="temperatura"
                      value={formData.Temperatura}
                      onChange={(e) =>
                        setFormData({ ...formData, Temperatura: e.target.value })
                      }
                      placeholder="0.7"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Creatividad: 0.0 - 2.0
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input
                      id="maxTokens"
                      value={formData.MaxTokens}
                      onChange={(e) =>
                        setFormData({ ...formData, MaxTokens: e.target.value })
                      }
                      placeholder="2000"
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Longitud máxima de respuesta
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    value={formData.Estado}
                    onChange={(e) =>
                      setFormData({ ...formData, Estado: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingId ? "Guardar Cambios" : "Crear Configuración"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
