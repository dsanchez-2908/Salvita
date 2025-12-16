"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Edit, Trash2, Search } from "lucide-react";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    Nombre: "",
    Usuario: "",
    Clave: "",
    Roles: [] as number[],
    Estado: "Activo",
  });
  const { toast } = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [usuariosRes, rolesRes] = await Promise.all([
        fetch("/api/usuarios", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/roles", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [usuariosData, rolesData] = await Promise.all([
        usuariosRes.json(),
        rolesRes.json(),
      ]);

      if (usuariosData.success) setUsuarios(usuariosData.data);
      if (rolesData.success) {
        // Filtrar solo roles activos para la selección
        const rolesActivos = rolesData.data.filter((rol: any) => rol.Estado === "Activo");
        setRoles(rolesActivos);
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
      const url = editingId
        ? `/api/usuarios?id=${editingId}`
        : "/api/usuarios";
      const method = editingId ? "PUT" : "POST";

      const body: any = {
        Nombre: formData.Nombre,
        Usuario: formData.Usuario,
        Estado: formData.Estado,
        Roles: formData.Roles,
      };

      if (!editingId) {
        body.Clave = formData.Clave;
      }

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
      const response = await fetch(`/api/usuarios?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setEditingId(id);
        setFormData({
          Nombre: data.data.Nombre,
          Usuario: data.data.Usuario,
          Clave: "",
          Roles: data.data.Roles?.map((r: any) => r.Id) || [],
          Estado: data.data.Estado,
        });
        setShowModal(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error cargando usuario",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "¿Eliminar este usuario?",
      description: "Se perderá el acceso al sistema. Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar"
    });
    if (!confirmed) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/usuarios?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Usuario eliminado",
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
      Usuario: "",
      Clave: "",
      Roles: [],
      Estado: "Activo",
    });
  };

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.Usuario.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar usuarios..."
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
                <TableHead>Usuario</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Alta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsuarios.map((usuario) => (
                <TableRow key={usuario.Id}>
                  <TableCell>{usuario.Nombre}</TableCell>
                  <TableCell>{usuario.Usuario}</TableCell>
                  <TableCell>{usuario.Roles || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        usuario.Estado === "Activo"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {usuario.Estado}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(usuario.FechaAlta).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(usuario.Id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(usuario.Id)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Usuario" : "Nuevo Usuario"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="usuario">Usuario</Label>
                  <Input
                    id="usuario"
                    value={formData.Usuario}
                    onChange={(e) =>
                      setFormData({ ...formData, Usuario: e.target.value })
                    }
                    required
                  />
                </div>

                {!editingId && (
                  <div className="space-y-2">
                    <Label htmlFor="clave">Contraseña</Label>
                    <Input
                      id="clave"
                      type="password"
                      value={formData.Clave}
                      onChange={(e) =>
                        setFormData({ ...formData, Clave: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Roles</Label>
                  <div className="space-y-2">
                    {roles.map((rol) => (
                      <label key={rol.Id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.Roles.includes(rol.Id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                Roles: [...formData.Roles, rol.Id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                Roles: formData.Roles.filter((r) => r !== rol.Id),
                              });
                            }
                          }}
                        />
                        <span>{rol.Nombre}</span>
                      </label>
                    ))}
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
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Baja">Baja</option>
                  </select>
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
