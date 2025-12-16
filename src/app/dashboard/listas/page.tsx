"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Edit, Trash2, Search } from "lucide-react";

export default function ListasPage() {
  const [listas, setListas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    Nombre: "",
    Descripcion: "",
    Estado: "Activo",
    Valores: [{ Valor: "", Orden: 0 }],
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
      const response = await fetch("/api/listas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setListas(data.data);
    } catch (error) {
      toast({ title: "Error", description: "Error cargando datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const url = editingId ? `/api/listas?id=${editingId}` : "/api/listas";
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
        toast({ title: "Éxito", description: data.message || "Operación exitosa" });
        setShowModal(false);
        resetForm();
        loadData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al guardar", variant: "destructive" });
    }
  };

  const handleEdit = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/listas?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEditingId(id);
        setFormData({
          Nombre: data.data.Nombre,
          Descripcion: data.data.Descripcion || "",
          Estado: data.data.Estado,
          Valores: data.data.Valores?.length > 0 ? data.data.Valores : [{ Valor: "", Orden: 0 }],
        });
        setShowModal(true);
      }
    } catch (error) {
      toast({ title: "Error", description: "Error cargando lista", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "¿Eliminar esta lista?",
      description: "Se perderán todos los valores asociados. Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar"
    });
    if (!confirmed) return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/listas?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Éxito", description: "Lista eliminada" });
        loadData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al eliminar", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      Nombre: "",
      Descripcion: "",
      Estado: "Activo",
      Valores: [{ Valor: "", Orden: 0 }],
    });
  };

  const addValor = () => {
    setFormData({
      ...formData,
      Valores: [...formData.Valores, { Valor: "", Orden: formData.Valores.length }],
    });
  };

  const removeValor = (index: number) => {
    setFormData({
      ...formData,
      Valores: formData.Valores.filter((_, i) => i !== index),
    });
  };

  const updateValor = (index: number, valor: string) => {
    const newValores = [...formData.Valores];
    newValores[index].Valor = valor;
    setFormData({ ...formData, Valores: newValores });
  };

  const filteredListas = listas.filter((l) =>
    l.Nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Listas</h1>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Lista
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar listas..."
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
                <TableHead>Cantidad Valores</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListas.map((lista) => (
                <TableRow key={lista.Id}>
                  <TableCell className="font-medium">{lista.Nombre}</TableCell>
                  <TableCell>{lista.Descripcion || "-"}</TableCell>
                  <TableCell>{lista.CantidadValores || 0}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      lista.Estado === "Activo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {lista.Estado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(lista.Id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(lista.Id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <h2 className="text-2xl font-bold">{editingId ? "Editar Lista" : "Nueva Lista"}</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.Nombre}
                    onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input
                    id="descripcion"
                    value={formData.Descripcion}
                    onChange={(e) => setFormData({ ...formData, Descripcion: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valores</Label>
                  {formData.Valores.map((valor, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        value={valor.Valor}
                        onChange={(e) => updateValor(index, e.target.value)}
                        placeholder="Valor"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeValor(index)}
                        disabled={formData.Valores.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addValor} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Agregar Valor
                  </Button>
                </div>

                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">Guardar</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1">
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
