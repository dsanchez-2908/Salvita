"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Edit, Trash2, X, Search, Inbox } from "lucide-react";

interface Bandeja {
  Id: number;
  Nombre: string;
  Descripcion: string;
  Estado: string;
  CantidadUsuarios: number;
  CantidadRoles: number;
  FechaCreacion: string;
}

interface Usuario {
  Id: number;
  Nombre: string;
  Usuario: string;
}

interface Rol {
  Id: number;
  Nombre: string;
}

export default function BandejasPage() {
  const [bandejas, setBandejas] = useState<Bandeja[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    Nombre: "",
    Descripcion: "",
    Estado: "Activa",
    Usuarios: [] as number[],
    Roles: [] as number[],
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

      // Cargar bandejas
      const [bandejasRes, usuariosRes, rolesRes] = await Promise.all([
        fetch("/api/bandejas", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/usuarios", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/roles", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [bandejasData, usuariosData, rolesData] = await Promise.all([
        bandejasRes.json(),
        usuariosRes.json(),
        rolesRes.json(),
      ]);

      if (bandejasData.success) setBandejas(bandejasData.data);
      if (usuariosData.success) setUsuarios(usuariosData.data);
      if (rolesData.success) setRoles(rolesData.data);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast({
        title: "Error",
        description: "Error al cargar datos",
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
      const url = "/api/bandejas";
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
          description: data.message || `Bandeja ${editingId ? "actualizada" : "creada"} exitosamente`,
        });
        setShowForm(false);
        resetForm();
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al guardar la bandeja",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al guardar la bandeja",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/bandejas?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setFormData({
          Nombre: data.data.Nombre,
          Descripcion: data.data.Descripcion || "",
          Estado: data.data.Estado,
          Usuarios: data.data.Usuarios.map((u: Usuario) => u.Id),
          Roles: data.data.Roles.map((r: Rol) => r.Id),
        });
        setEditingId(id);
        setShowForm(true);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al cargar la bandeja",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    const confirmed = await confirm({
      title: "Confirmar eliminación",
      description: `¿Está seguro de eliminar la bandeja "${nombre}"?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/bandejas?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Bandeja eliminada exitosamente",
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al eliminar la bandeja",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al eliminar la bandeja",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      Nombre: "",
      Descripcion: "",
      Estado: "Activa",
      Usuarios: [],
      Roles: [],
    });
    setEditingId(null);
  };

  const toggleUsuario = (usuarioId: number) => {
    setFormData((prev) => ({
      ...prev,
      Usuarios: prev.Usuarios.includes(usuarioId)
        ? prev.Usuarios.filter((id) => id !== usuarioId)
        : [...prev.Usuarios, usuarioId],
    }));
  };

  const toggleRol = (rolId: number) => {
    setFormData((prev) => ({
      ...prev,
      Roles: prev.Roles.includes(rolId)
        ? prev.Roles.filter((id) => id !== rolId)
        : [...prev.Roles, rolId],
    }));
  };

  const bandejasFiltradas = bandejas.filter((b) =>
    b.Nombre.toLowerCase().includes(searchTerm.toLowerCase())
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
          <Inbox className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold dark:text-white">Administración de Bandejas</h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Bandeja
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold dark:text-white">
                {editingId ? "Editar Bandeja" : "Nueva Bandeja"}
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
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.Nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, Nombre: e.target.value })
                    }
                    placeholder="Ej: Bandeja de Enfermeros"
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
                    <option value="Activa">Activa</option>
                    <option value="Inactiva">Inactiva</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea
                  id="descripcion"
                  value={formData.Descripcion}
                  onChange={(e) =>
                    setFormData({ ...formData, Descripcion: e.target.value })
                  }
                  placeholder="Descripción de la bandeja"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Usuarios */}
                <div>
                  <Label className="mb-2 block">Usuarios</Label>
                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto dark:border-gray-600">
                    {usuarios.map((usuario) => (
                      <label
                        key={usuario.Id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.Usuarios.includes(usuario.Id)}
                          onChange={() => toggleUsuario(usuario.Id)}
                          className="rounded"
                        />
                        <span className="text-sm dark:text-white">
                          {usuario.Nombre} ({usuario.Usuario})
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.Usuarios.length} usuario(s) seleccionado(s)
                  </p>
                </div>

                {/* Roles */}
                <div>
                  <Label className="mb-2 block">Roles</Label>
                  <div className="border rounded-md p-3 max-h-60 overflow-y-auto dark:border-gray-600">
                    {roles.map((rol) => (
                      <label
                        key={rol.Id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.Roles.includes(rol.Id)}
                          onChange={() => toggleRol(rol.Id)}
                          className="rounded"
                        />
                        <span className="text-sm dark:text-white">{rol.Nombre}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.Roles.length} rol(es) seleccionado(s)
                  </p>
                </div>
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
            placeholder="Buscar bandejas..."
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
                  Descripción
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usuarios
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Roles
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
              {bandejasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
                  >
                    {searchTerm
                      ? `No se encontraron resultados para "${searchTerm}"`
                      : 'No hay bandejas. Haz clic en "Nueva Bandeja" para crear la primera.'}
                  </td>
                </tr>
              ) : (
                bandejasFiltradas.map((bandeja) => (
                  <tr
                    key={bandeja.Id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {bandeja.Nombre}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {bandeja.Descripcion || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-gray-100">
                      {bandeja.CantidadUsuarios}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-gray-100">
                      {bandeja.CantidadRoles}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          bandeja.Estado === "Activa"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {bandeja.Estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(bandeja.Id)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(bandeja.Id, bandeja.Nombre)}
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
