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
import { Plus, Edit, Trash2, Search, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReportesPage() {
  const [reportes, setReportes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    Nombre: "",
    Tipo: "Query",
    Query: "",
    StoreProcedure: "",
    APIEndpoint: "",
    Descripcion: "",
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
      const response = await fetch("/api/reportes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setReportes(data.data);
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
      const url = editingId ? `/api/reportes?id=${editingId}` : "/api/reportes";
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
      const response = await fetch(`/api/reportes?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEditingId(id);
        const reporteData = data.data;
        setFormData({
          Nombre: reporteData.Nombre,
          Tipo: reporteData.Tipo,
          Query: reporteData.Query || "",
          StoreProcedure: reporteData.StoreProcedure || "",
          APIEndpoint: reporteData.APIEndpoint || "",
          Descripcion: reporteData.Descripcion || "",
          Estado: reporteData.Estado,
        });
        setShowModal(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error cargando reporte",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "¿Eliminar este reporte?",
      description: "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/reportes?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Éxito", description: "Reporte eliminado" });
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
      Tipo: "Query",
      Query: "",
      StoreProcedure: "",
      APIEndpoint: "",
      Descripcion: "",
      Estado: "Activo",
    });
  };

  const filteredReportes = reportes.filter((r) =>
    r.Nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Reporte
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar reportes..."
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
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReportes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No hay reportes registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredReportes.map((reporte) => (
                  <TableRow key={reporte.Id}>
                    <TableCell className="font-medium">{reporte.Nombre}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {reporte.Tipo}
                      </span>
                    </TableCell>
                    <TableCell>{reporte.Descripcion || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          reporte.Estado === "Activo"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {reporte.Estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(reporte.Id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(reporte.Id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>
                <div className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  {editingId ? "Editar Reporte" : "Nuevo Reporte"}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="nombre">
                      Nombre del Reporte <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nombre"
                      value={formData.Nombre}
                      onChange={(e) =>
                        setFormData({ ...formData, Nombre: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="tipo">
                      Tipo <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.Tipo}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, Tipo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Query">Query</SelectItem>
                        <SelectItem value="StoreProcedure">
                          Store Procedure
                        </SelectItem>
                        <SelectItem value="API">API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Select
                      value={formData.Estado}
                      onValueChange={(value: string) =>
                        setFormData({ ...formData, Estado: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.Descripcion}
                      onChange={(e) =>
                        setFormData({ ...formData, Descripcion: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  {/* Campos específicos según tipo */}
                  {formData.Tipo === "Query" && (
                    <div className="col-span-2">
                      <Label htmlFor="query">
                        Query SQL <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="query"
                        value={formData.Query}
                        onChange={(e) =>
                          setFormData({ ...formData, Query: e.target.value })
                        }
                        rows={8}
                        placeholder="SELECT * FROM ..."
                        className="font-mono text-sm"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Ingrese la consulta SQL que se ejecutará para generar el
                        reporte
                      </p>
                    </div>
                  )}

                  {formData.Tipo === "StoreProcedure" && (
                    <div className="col-span-2">
                      <Label htmlFor="storeprocedure">
                        Store Procedure <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="storeprocedure"
                        value={formData.StoreProcedure}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            StoreProcedure: e.target.value,
                          })
                        }
                        placeholder="sp_nombre_procedimiento"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Nombre del procedimiento almacenado
                      </p>
                    </div>
                  )}

                  {formData.Tipo === "API" && (
                    <div className="col-span-2">
                      <Label htmlFor="apiendpoint">
                        API Endpoint <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="apiendpoint"
                        value={formData.APIEndpoint}
                        onChange={(e) =>
                          setFormData({ ...formData, APIEndpoint: e.target.value })
                        }
                        placeholder="https://api.ejemplo.com/datos"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        URL completa del endpoint de la API
                      </p>
                    </div>
                  )}
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
                    {editingId ? "Guardar Cambios" : "Crear Reporte"}
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
