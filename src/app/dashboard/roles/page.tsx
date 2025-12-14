"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, Search } from "lucide-react";

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [modulos, setModulos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    Nombre: "",
    Descripcion: "",
    Estado: "Activo",
    Permisos: [] as any[],
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [rolesRes, modulosRes] = await Promise.all([
        fetch("/api/roles", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/modulos", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [rolesData, modulosData] = await Promise.all([
        rolesRes.json(),
        modulosRes.json(),
      ]);

      if (rolesData.success) setRoles(rolesData.data);
      if (modulosData.success) {
        setModulos(modulosData.data);
        // Inicializar permisos para todos los módulos
        setFormData((prev) => ({
          ...prev,
          Permisos: modulosData.data.map((m: any) => ({
            ModuloId: m.Id,
            ModuloNombre: m.Nombre,
            PermisoVer: true,
            PermisoAgregar: false,
            PermisoModificar: false,
            PermisoEliminar: false,
          })),
        }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error cargando datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      const url = editingId ? `/api/roles?id=${editingId}` : "/api/roles";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: data.message || "Operación exitosa",
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
      toast({
        title: "Error",
        description: "Error al guardar",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/roles?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setEditingId(id);
        
        // Mapear permisos existentes con todos los módulos
        const permisosMap = new Map(
          data.data.Permisos?.map((p: any) => [p.ModuloId, p]) || []
        );

        const permisos = modulos.map((m) => {
          const permiso = permisosMap.get(m.Id);
          return {
            ModuloId: m.Id,
            ModuloNombre: m.Nombre,
            PermisoVer: permiso?.PermisoVer || false,
            PermisoAgregar: permiso?.PermisoAgregar || false,
            PermisoModificar: permiso?.PermisoModificar || false,
            PermisoEliminar: permiso?.PermisoEliminar || false,
          };
        });

        setFormData({
          Nombre: data.data.Nombre,
          Descripcion: data.data.Descripcion || "",
          Estado: data.data.Estado,
          Permisos: permisos,
        });
        setShowModal(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error cargando rol",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este rol?")) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/roles?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Rol eliminado",
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
      toast({
        title: "Error",
        description: "Error al eliminar",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      Nombre: "",
      Descripcion: "",
      Estado: "Activo",
      Permisos: modulos.map((m) => ({
        ModuloId: m.Id,
        ModuloNombre: m.Nombre,
        PermisoVer: true,
        PermisoAgregar: false,
        PermisoModificar: false,
        PermisoEliminar: false,
      })),
    });
  };

  const updatePermiso = (moduloId: number, campo: string, valor: boolean) => {
    setFormData({
      ...formData,
      Permisos: formData.Permisos.map((p) =>
        p.ModuloId === moduloId ? { ...p, [campo]: valor } : p
      ),
    });
  };

  const filteredRoles = roles.filter((r) =>
    r.Nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Roles</h1>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Rol
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((rol) => (
                <TableRow key={rol.Id}>
                  <TableCell className="font-medium">{rol.Nombre}</TableCell>
                  <TableCell>{rol.Descripcion || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        rol.Estado === "Activo"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {rol.Estado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(rol.Id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rol.Id)}
                      disabled={rol.Nombre === "Administrador"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Rol" : "Nuevo Rol"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={formData.Nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, Nombre: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <select
                      id="estado"
                      value={formData.Estado}
                      onChange={(e) =>
                        setFormData({ ...formData, Estado: e.target.value })
                      }
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.Descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, Descripcion: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Permisos por Módulo</Label>
                  <div className="border rounded-md p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Módulo</TableHead>
                          <TableHead className="text-center">Ver</TableHead>
                          <TableHead className="text-center">Agregar</TableHead>
                          <TableHead className="text-center">Modificar</TableHead>
                          <TableHead className="text-center">Eliminar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.Permisos.map((permiso) => (
                          <TableRow key={permiso.ModuloId}>
                            <TableCell>{permiso.ModuloNombre}</TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={permiso.PermisoVer}
                                onChange={(e) =>
                                  updatePermiso(
                                    permiso.ModuloId,
                                    "PermisoVer",
                                    e.target.checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={permiso.PermisoAgregar}
                                onChange={(e) =>
                                  updatePermiso(
                                    permiso.ModuloId,
                                    "PermisoAgregar",
                                    e.target.checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={permiso.PermisoModificar}
                                onChange={(e) =>
                                  updatePermiso(
                                    permiso.ModuloId,
                                    "PermisoModificar",
                                    e.target.checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={permiso.PermisoEliminar}
                                onChange={(e) =>
                                  updatePermiso(
                                    permiso.ModuloId,
                                    "PermisoEliminar",
                                    e.target.checked
                                  )
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    Guardar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancelar
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
