"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
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
    AccesoTrazas: false,
    Permisos: [] as any[],
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
      const [rolesRes, modulosRes] = await Promise.all([
        fetch("/api/roles", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/modulos-v2/estructura", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [rolesData, modulosData] = await Promise.all([
        rolesRes.json(),
        modulosRes.json(),
      ]);

      if (rolesData.success) setRoles(rolesData.data);
      if (modulosData.success) {
        // Construir permisos por relación padre-hijo
        const todosLosPermisos: any[] = [];
        
        modulosData.data.forEach((padre: any) => {
          // Permiso para el módulo principal
          todosLosPermisos.push({
            ModuloPadreId: null,
            ModuloId: padre.Id,
            ModuloNombre: padre.Nombre,
            ModuloPadreNombre: null,
            Tipo: 'Principal',
            TieneHijos: padre.TieneHijos,
            Orden: padre.Orden,
            PermisoVer: false,
            PermisoVerAgrupado: false,
            PermisoVerRelacionado: false,
            PermisoAgregar: false,
            PermisoModificar: false,
            PermisoEliminar: false,
          });
          
          // Permisos para cada hijo en el contexto de este padre
          if (padre.ModulosHijos && padre.ModulosHijos.length > 0) {
            padre.ModulosHijos.forEach((hijo: any) => {
              todosLosPermisos.push({
                ModuloPadreId: padre.Id,
                ModuloId: hijo.Id,
                ModuloNombre: hijo.Nombre,
                ModuloPadreNombre: padre.Nombre,
                Tipo: 'Secundario',
                TieneHijos: false,
                Orden: hijo.Orden,
                PermisoVer: false,
                PermisoVerAgrupado: false,
                PermisoVerRelacionado: false,
                PermisoAgregar: false,
                PermisoModificar: false,
                PermisoEliminar: false,
              });
            });
          }
        });
        
        setModulos(todosLosPermisos);
        
        // Inicializar permisos
        setFormData((prev) => ({
          ...prev,
          Permisos: todosLosPermisos,
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
        
        // Mapear permisos existentes usando clave compuesta (ModuloPadreId, ModuloId)
        const permisosMap = new Map(
          data.data.Permisos?.map((p: any) => 
            [`${p.ModuloPadreId || 'null'}-${p.ModuloId}`, p]
          ) || []
        );

        const permisos = modulos.map((m) => {
          const key = `${m.ModuloPadreId || 'null'}-${m.ModuloId}`;
          const permiso = permisosMap.get(key);
          return {
            ModuloPadreId: m.ModuloPadreId,
            ModuloId: m.ModuloId,
            ModuloNombre: m.ModuloNombre,
            ModuloPadreNombre: m.ModuloPadreNombre,
            Tipo: m.Tipo,
            TieneHijos: m.TieneHijos,
            Orden: m.Orden,
            PermisoVer: permiso?.PermisoVer || false,
            PermisoVerAgrupado: permiso?.PermisoVerAgrupado || false,
            PermisoVerRelacionado: permiso?.PermisoVerRelacionado || false,
            PermisoAgregar: permiso?.PermisoAgregar || false,
            PermisoModificar: permiso?.PermisoModificar || false,
            PermisoEliminar: permiso?.PermisoEliminar || false,
          };
        });

        setFormData({
          Nombre: data.data.Nombre,
          Descripcion: data.data.Descripcion || "",
          Estado: data.data.Estado,
          AccesoTrazas: data.data.AccesoTrazas || false,
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
    const confirmed = await confirm({
      title: "¿Eliminar este rol?",
      description: "Se quitarán todos los permisos asociados. Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar"
    });
    if (!confirmed) return;

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
      AccesoTrazas: false,
      Permisos: modulos.map((m) => ({ ...m })),
    });
  };

  const updatePermiso = (moduloPadreId: number | null, moduloId: number, campo: string, valor: boolean) => {
    setFormData({
      ...formData,
      Permisos: formData.Permisos.map((p) =>
        (p.ModuloPadreId === moduloPadreId && p.ModuloId === moduloId) 
          ? { ...p, [campo]: valor } 
          : p
      ),
    });
  };

  const getModuloInfo = (moduloPadreId: number | null, moduloId: number) => {
    const modulo = modulos.find(m => 
      m.ModuloPadreId === moduloPadreId && m.ModuloId === moduloId
    );
    return modulo;
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
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.AccesoTrazas}
                      onChange={(e) =>
                        setFormData({ ...formData, AccesoTrazas: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span>Acceso a Consultas / Auditoría</span>
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                    Permite al rol acceder a la pantalla de consultas y auditoría de trazas del sistema
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Permisos por Módulo</Label>
                  <div className="border rounded-md max-h-[400px] overflow-y-auto relative bg-background">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b">
                        <tr>
                          <th className="w-1/4 bg-white dark:bg-gray-950 text-left p-3 font-medium">Módulo</th>
                          <th className="text-center w-[10%] bg-white dark:bg-gray-950 p-3 font-medium">Ver</th>
                          <th className="text-center w-[12%] bg-white dark:bg-gray-950 p-3 font-medium">Ver Agrupado</th>
                          <th className="text-center w-[12%] bg-white dark:bg-gray-950 p-3 font-medium">Ver Relacionado</th>
                          <th className="text-center w-[10%] bg-white dark:bg-gray-950 p-3 font-medium">Agregar</th>
                          <th className="text-center w-[10%] bg-white dark:bg-gray-950 p-3 font-medium">Modificar</th>
                          <th className="text-center w-[10%] bg-white dark:bg-gray-950 p-3 font-medium">Eliminar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Módulos principales */}
                        {formData.Permisos
                          .filter((permiso) => permiso.Tipo === "Principal")
                          .sort((a, b) => (a.Orden || 0) - (b.Orden || 0))
                          .map((permiso) => {
                            return (
                              <>
                                <tr key={`principal-${permiso.ModuloId}`} className="bg-blue-50 dark:bg-blue-900/20 font-medium border-b">
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 text-xs rounded bg-blue-600 text-white font-semibold">
                                        Principal
                                      </span>
                                      <span className="font-semibold">{permiso.ModuloNombre}</span>
                                    </div>
                                  </td>
                                  <td className="text-center p-3">
                                    <input
                                      type="checkbox"
                                      checked={permiso.PermisoVer}
                                      onChange={(e) =>
                                        updatePermiso(
                                          permiso.ModuloPadreId,
                                          permiso.ModuloId,
                                          "PermisoVer",
                                          e.target.checked
                                        )
                                      }
                                      className="w-4 h-4"
                                    />
                                  </td>
                                  <td className={`text-center p-3 ${!permiso.TieneHijos ? 'bg-gray-100 dark:bg-gray-900' : ''}`}>
                                    {permiso.TieneHijos ? (
                                      <input
                                        type="checkbox"
                                        checked={permiso.PermisoVerAgrupado}
                                        onChange={(e) =>
                                          updatePermiso(
                                            permiso.ModuloPadreId,
                                            permiso.ModuloId,
                                            "PermisoVerAgrupado",
                                            e.target.checked
                                          )
                                        }
                                        className="w-4 h-4"
                                      />
                                    ) : (
                                      <span className="text-xs text-gray-400">N/A</span>
                                    )}
                                  </td>
                                  <td className="text-center p-3">
                                    <input
                                      type="checkbox"
                                      checked={permiso.PermisoVerRelacionado}
                                      onChange={(e) =>
                                        updatePermiso(
                                          permiso.ModuloPadreId,
                                          permiso.ModuloId,
                                          "PermisoVerRelacionado",
                                          e.target.checked
                                        )
                                      }
                                      className="w-4 h-4"
                                    />
                                  </td>
                                  <td className="text-center p-3">
                                    <input
                                      type="checkbox"
                                      checked={permiso.PermisoAgregar}
                                      onChange={(e) =>
                                        updatePermiso(
                                          permiso.ModuloPadreId,
                                          permiso.ModuloId,
                                          "PermisoAgregar",
                                          e.target.checked
                                        )
                                      }
                                      className="w-4 h-4"
                                    />
                                  </td>
                                  <td className="text-center p-3">
                                    <input
                                      type="checkbox"
                                      checked={permiso.PermisoModificar}
                                      onChange={(e) =>
                                        updatePermiso(
                                          permiso.ModuloPadreId,
                                          permiso.ModuloId,
                                          "PermisoModificar",
                                          e.target.checked
                                        )
                                      }
                                      className="w-4 h-4"
                                    />
                                  </td>
                                  <td className="text-center p-3">
                                    <input
                                      type="checkbox"
                                      checked={permiso.PermisoEliminar}
                                      onChange={(e) =>
                                        updatePermiso(
                                          permiso.ModuloPadreId,
                                          permiso.ModuloId,
                                          "PermisoEliminar",
                                          e.target.checked
                                        )
                                      }
                                      className="w-4 h-4"
                                    />
                                  </td>
                                </tr>
                                
                                {/* Módulos secundarios de este principal */}
                                {formData.Permisos
                                  .filter((p) => p.Tipo === "Secundario" && p.ModuloPadreId === permiso.ModuloId)
                                  .sort((a, b) => (a.Orden || 0) - (b.Orden || 0))
                                  .map((permisoSec) => (
                                    <tr key={`secundario-${permisoSec.ModuloPadreId}-${permisoSec.ModuloId}`} className="bg-gray-50 dark:bg-gray-800/50 border-b">
                                      <td className="p-3">
                                        <div className="flex items-center gap-2 pl-8">
                                          <span className="text-gray-400">└─</span>
                                          <span className="px-2 py-0.5 text-xs rounded bg-gray-500 text-white">
                                            Secundario
                                          </span>
                                          <span>{permisoSec.ModuloNombre}</span>
                                        </div>
                                      </td>
                                      <td className="text-center p-3">
                                        <input
                                          type="checkbox"
                                          checked={permisoSec.PermisoVer}
                                          onChange={(e) =>
                                            updatePermiso(
                                              permisoSec.ModuloPadreId,
                                              permisoSec.ModuloId,
                                              "PermisoVer",
                                              e.target.checked
                                            )
                                          }
                                          className="w-4 h-4"
                                        />
                                      </td>
                                      <td className="text-center bg-gray-100 dark:bg-gray-900 p-3">
                                        <span className="text-xs text-gray-400">N/A</span>
                                      </td>
                                      <td className="text-center bg-gray-100 dark:bg-gray-900 p-3">
                                        <span className="text-xs text-gray-400">N/A</span>
                                      </td>
                                      <td className="text-center p-3">
                                        <input
                                          type="checkbox"
                                          checked={permisoSec.PermisoAgregar}
                                          onChange={(e) =>
                                            updatePermiso(
                                              permisoSec.ModuloPadreId,
                                              permisoSec.ModuloId,
                                              "PermisoAgregar",
                                              e.target.checked
                                            )
                                          }
                                          className="w-4 h-4"
                                        />
                                      </td>
                                      <td className="text-center p-3">
                                        <input
                                          type="checkbox"
                                          checked={permisoSec.PermisoModificar}
                                          onChange={(e) =>
                                            updatePermiso(
                                              permisoSec.ModuloPadreId,
                                              permisoSec.ModuloId,
                                              "PermisoModificar",
                                              e.target.checked
                                            )
                                          }
                                          className="w-4 h-4"
                                        />
                                      </td>
                                      <td className="text-center p-3">
                                        <input
                                          type="checkbox"
                                          checked={permisoSec.PermisoEliminar}
                                          onChange={(e) =>
                                            updatePermiso(
                                              permisoSec.ModuloPadreId,
                                              permisoSec.ModuloId,
                                              "PermisoEliminar",
                                              e.target.checked
                                            )
                                          }
                                          className="w-4 h-4"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                              </>
                            );
                          })}
                      </tbody>
                    </table>
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
