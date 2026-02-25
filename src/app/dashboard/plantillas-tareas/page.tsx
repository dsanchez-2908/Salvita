"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Edit, Trash2, X, Search, ClipboardList } from "lucide-react";

interface PlantillaTarea {
  Id: number;
  Nombre: string;
  Indicaciones: string;
  Estado: string;
  FechaCreacion: string;
}

export default function PlantillasTareasPage() {
  const [plantillas, setPlantillas] = useState<PlantillaTarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    Nombre: "",
    Indicaciones: "",
    Estado: "Activo",
  });

  const { toast } = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch("/api/plantillas-tareas", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setPlantillas(data.data);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast({
        title: "Error",
        description: "Error al cargar plantillas de tareas",
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
      const url = "/api/plantillas-tareas";
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...formData, Id: editingId } : formData;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: data.message || `Plantilla ${editingId ? "actualizada" : "creada"} exitosamente`,
        });
        setShowForm(false);
        resetForm();
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al guardar la plantilla",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al guardar la plantilla",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/plantillas-tareas?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setFormData({
          Nombre: data.data.Nombre,
          Indicaciones: data.data.Indicaciones || "",
          Estado: data.data.Estado,
        });
        setEditingId(id);
        setShowForm(true);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al cargar la plantilla",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    const confirmed = await confirm({
      title: "Confirmar eliminación",
      message: `¿Está seguro de eliminar la plantilla "${nombre}"?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/plantillas-tareas?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Plantilla eliminada exitosamente",
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al eliminar la plantilla",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al eliminar la plantilla",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      Nombre: "",
      Indicaciones: "",
      Estado: "Activo",
    });
    setEditingId(null);
  };

  const plantillasFiltradas = plantillas.filter((p) =>
    p.Nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold dark:text-white">Administración de Tareas</h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold dark:text-white">
                {editingId ? "Editar Tarea" : "Nueva Tarea"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre de la tarea *</Label>
                  <Input
                    id="nombre"
                    value={formData.Nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, Nombre: e.target.value })
                    }
                    placeholder="Ej: Revisión de documentación"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <select
                    id="estado"
                    value={formData.Estado}
                    onChange={(e) =>
                      setFormData({ ...formData, Estado: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="indicaciones">Indicaciones</Label>
                <textarea
                  id="indicaciones"
                  value={formData.Indicaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, Indicaciones: e.target.value })
                  }
                  placeholder="Describe de manera general lo que se debe hacer en esta tarea..."
                  rows={5}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Estas indicaciones se mostrarán cuando se cree una tarea de este tipo
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
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
                  {editingId ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Indicaciones
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {plantillasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
                  >
                    {searchTerm
                      ? `No se encontraron resultados para "${searchTerm}"`
                      : 'No hay tareas. Haz clic en "Nueva Tarea" para crear la primera.'}
                  </td>
                </tr>
              ) : (
                plantillasFiltradas.map((plantilla) => (
                  <tr
                    key={plantilla.Id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {plantilla.Nombre}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {plantilla.Indicaciones ? (
                        <div className="max-w-md truncate">
                          {plantilla.Indicaciones}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          plantilla.Estado === "Activo"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {plantilla.Estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(plantilla.Id)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDelete(plantilla.Id, plantilla.Nombre)
                          }
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
