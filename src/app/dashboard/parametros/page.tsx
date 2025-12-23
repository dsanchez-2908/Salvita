"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Edit, Trash2, X, Image as ImageIcon } from "lucide-react";

interface Parametro {
  Id: number;
  Parametro: string;
  Valor: string;
  FechaCreacion: string;
  FechaModificacion: string;
}

export default function ParametrosPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    Parametro: "",
    Valor: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    loadParametros();
  }, []);

  const loadParametros = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/parametros", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setParametros(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar parámetros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (parametro: Parametro) => {
    setEditingId(parametro.Id);
    setFormData({
      Parametro: parametro.Parametro,
      Valor: parametro.Valor,
    });
    
    // Si es el logo, mostrar preview
    if (parametro.Parametro === "Logo Sistema" && parametro.Valor) {
      setPreviewUrl(parametro.Valor);
    }
    
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "¿Eliminar este parámetro?",
      description: "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar"
    });
    
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/parametros?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Éxito",
          description: "Parámetro eliminado",
        });
        loadParametros();
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
        description: "Error al eliminar parámetro",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const url = editingId ? `/api/parametros?id=${editingId}` : "/api/parametros";
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
          description: editingId ? "Parámetro actualizado" : "Parámetro creado",
        });
        setShowModal(false);
        resetForm();
        loadParametros();
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
        description: "Error al guardar parámetro",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 2MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      setFormData({ ...formData, Valor: base64 });
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      Parametro: "",
      Valor: "",
    });
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const esParametroLogo = formData.Parametro === "Logo Sistema";

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Parámetros del Sistema</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {parametros.map((parametro) => (
              <div
                key={parametro.Id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{parametro.Parametro}</h3>
                  {parametro.Parametro === "Logo Sistema" && parametro.Valor ? (
                    <div className="mt-2">
                      <img
                        src={parametro.Valor}
                        alt="Logo"
                        className="h-16 object-contain"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 break-all">
                      {parametro.Valor.length > 100
                        ? `${parametro.Valor.substring(0, 100)}...`
                        : parametro.Valor}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(parametro)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {editingId ? "Editar Parámetro" : "Nuevo Parámetro"}
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
                  <Label htmlFor="parametro">Nombre del Parámetro</Label>
                  <Input
                    id="parametro"
                    value={formData.Parametro}
                    onChange={(e) =>
                      setFormData({ ...formData, Parametro: e.target.value })
                    }
                    placeholder="Ej: Nombre Proyecto"
                    required
                    disabled={!!editingId}
                  />
                </div>

                {esParametroLogo ? (
                  <div className="space-y-2">
                    <Label>Logo del Sistema</Label>
                    <div className="space-y-4">
                      {previewUrl && (
                        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-32 object-contain mx-auto"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("logo-file")?.click()}
                        >
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Seleccionar Imagen
                        </Button>
                        {previewUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPreviewUrl("");
                              setFormData({ ...formData, Valor: "" });
                              setSelectedFile(null);
                            }}
                          >
                            Quitar Imagen
                          </Button>
                        )}
                      </div>
                      <input
                        id="logo-file"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <p className="text-xs text-gray-500">
                        Formatos soportados: JPG, PNG, GIF. Tamaño máximo: 2MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor</Label>
                    <Textarea
                      id="valor"
                      value={formData.Valor}
                      onChange={(e) =>
                        setFormData({ ...formData, Valor: e.target.value })
                      }
                      placeholder="Ingrese el valor del parámetro"
                      rows={5}
                      required
                    />
                  </div>
                )}

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
