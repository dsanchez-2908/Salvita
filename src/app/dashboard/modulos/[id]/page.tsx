"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Edit, Trash2, X, Eye, Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Campo {
  Id: number;
  Nombre: string;
  TipoDato: string;
  Largo: number | null;
  ListaId: number | null;
  ListaNombre: string | null;
  Obligatorio: boolean;
  Visible: boolean;
  VisibleEnGrilla: boolean;
  Orden: number;
}

interface Modulo {
  Id: number;
  Nombre: string;
  Tipo: string;
  Icono: string;
}

export default function ModuloDinamicoPage() {
  const params = useParams();
  const router = useRouter();
  const moduloId = params.id as string;
  const { toast } = useToast();

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [registrosFiltrados, setRegistrosFiltrados] = useState<any[]>([]);
  const [valoresListas, setValoresListas] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [archivos, setArchivos] = useState<Record<string, File>>({});
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    loadData();
  }, [moduloId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Cargar datos del módulo
      const response = await fetch(`/api/modulos/${moduloId}/datos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setModulo(data.data.modulo);
        setCampos(data.data.campos);
        setRegistros(data.data.registros);
        setRegistrosFiltrados(data.data.registros);

        // Cargar valores de listas
        const listasIds = data.data.campos
          .filter((c: Campo) => c.TipoDato === "Lista" && c.ListaId)
          .map((c: Campo) => c.ListaId);

        if (listasIds.length > 0) {
          await loadValoresListas([...new Set(listasIds)]);
        }

        // Inicializar formData con valores por defecto
        const initialData: Record<string, any> = {};
        data.data.campos.forEach((campo: Campo) => {
          initialData[campo.Nombre] = "";
        });
        setFormData(initialData);
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo cargar el módulo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast({
        title: "Error",
        description: "Error al cargar datos del módulo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadValoresListas = async (listasIds: number[]) => {
    try {
      const token = localStorage.getItem("token");
      const valores: Record<number, any[]> = {};

      for (const listaId of listasIds) {
        const response = await fetch(`/api/listas/${listaId}/valores`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          valores[listaId] = data.data;
        }
      }

      setValoresListas(valores);
    } catch (error) {
      console.error("Error cargando valores de listas:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obligatorios
    for (const campo of campos) {
      if (campo.Obligatorio && !formData[campo.Nombre]) {
        toast({
          title: "Error",
          description: `El campo "${campo.Nombre}" es obligatorio`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setUploadingFiles(true);
      const token = localStorage.getItem("token");
      
      // Primero, subir los archivos si hay alguno
      const dataToSave = { ...formData };
      
      for (const [nombreCampo, archivo] of Object.entries(archivos)) {
        if (archivo) {
          toast({
            title: "Subiendo archivo...",
            description: `Subiendo ${archivo.name}`,
          });

          const formDataUpload = new FormData();
          formDataUpload.append('file', archivo);
          formDataUpload.append('moduloNombre', modulo?.Nombre || '');

          const uploadResponse = await fetch('/api/documentos/upload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formDataUpload,
          });

          const uploadResult = await uploadResponse.json();
          
          if (uploadResult.success) {
            // Guardar el ID del documento en lugar del nombre
            dataToSave[nombreCampo] = uploadResult.documentId;
          } else {
            throw new Error(`Error al subir ${archivo.name}: ${uploadResult.error}`);
          }
        }
      }

      setUploadingFiles(false);

      // Ahora guardar el registro con los IDs de documentos
      const url = `/api/modulos/${moduloId}/datos`;
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...dataToSave, id: editingId } : dataToSave;

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
          description: editingId ? "Registro actualizado" : "Registro creado",
        });
        setShowForm(false);
        setEditingId(null);
        resetForm();
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.message || "Error al guardar",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Error al guardar el registro",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleEdit = (registro: any) => {
    const editData: Record<string, any> = {};
    campos.forEach((campo) => {
      let value = registro[campo.Nombre];
      
      // Formatear fechas para inputs
      if (campo.TipoDato === "Fecha" && value) {
        value = new Date(value).toISOString().split("T")[0];
      } else if (campo.TipoDato === "FechaHora" && value) {
        value = new Date(value).toISOString().slice(0, 16);
      }
      
      editData[campo.Nombre] = value || "";
    });
    setFormData(editData);
    setEditingId(registro.Id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`¿Está seguro de eliminar este registro?\n\nEsta acción no se puede deshacer.`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/modulos/${moduloId}/datos?registroId=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Éxito",
          description: "Registro eliminado",
        });
        loadData();
      } else {
        toast({
          title: "Error",
          description: data.message || "Error al eliminar",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al eliminar el registro",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    const initialData: Record<string, any> = {};
    campos.forEach((campo) => {
      initialData[campo.Nombre] = "";
    });
    setFormData(initialData);
    setArchivos({});
    setEditingId(null);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    
    if (!term.trim()) {
      setRegistrosFiltrados(registros);
      return;
    }

    const filtered = registros.filter((registro) => {
      return campos.some((campo) => {
        if (!campo.VisibleEnGrilla) return false;
        const value = registro[campo.Nombre];
        if (!value) return false;
        
        // Buscar en listas
        if (campo.TipoDato === "Lista" && campo.ListaId && valoresListas[campo.ListaId]) {
          const valorObj = valoresListas[campo.ListaId].find((v: any) => v.Id === parseInt(value));
          if (valorObj && valorObj.Valor.toLowerCase().includes(term.toLowerCase())) {
            return true;
          }
        }
        
        return String(value).toLowerCase().includes(term.toLowerCase());
      });
    });
    
    setRegistrosFiltrados(filtered);
  };

  const renderInput = (campo: Campo) => {
    const value = formData[campo.Nombre] || "";

    switch (campo.TipoDato) {
      case "Texto":
        return (
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            maxLength={campo.Largo || undefined}
            required={campo.Obligatorio}
          />
        );

      case "Descripcion":
        return (
          <textarea
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            rows={3}
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );

      case "Numero":
        return (
          <input
            type="number"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );

      case "Fecha":
        return (
          <input
            type="date"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );

      case "FechaHora":
        return (
          <input
            type="datetime-local"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );

      case "Lista":
        const valores = campo.ListaId ? valoresListas[campo.ListaId] || [] : [];
        return (
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          >
            <option value="">Seleccionar...</option>
            {valores.map((valor: any) => (
              <option key={valor.Id} value={valor.Id}>
                {valor.Valor}
              </option>
            ))}
          </select>
        );

      case "Archivo":
        return (
          <div className="space-y-2">
            <input
              type="file"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Guardar el archivo en el estado para subirlo después
                  setArchivos({ ...archivos, [campo.Nombre]: file });
                  setFormData({ ...formData, [campo.Nombre]: file.name });
                }
              }}
              required={campo.Obligatorio && !value && !archivos[campo.Nombre]}
            />
            {value && !archivos[campo.Nombre] && (
              <div className="text-sm text-gray-600">
                Archivo actual: {value}
              </div>
            )}
            {archivos[campo.Nombre] && (
              <div className="text-sm text-green-600">
                Nuevo archivo: {archivos[campo.Nombre].name}
              </div>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );
    }
  };

  const renderCellValue = (campo: Campo, registro: any) => {
    const value = registro[campo.Nombre];

    if (value === null || value === undefined) return "-";

    switch (campo.TipoDato) {
      case "Fecha":
        return new Date(value).toLocaleDateString("es-AR");
      case "FechaHora":
        return new Date(value).toLocaleString("es-AR");
      case "Lista":
        // Buscar el valor de la lista
        if (campo.ListaId && valoresListas[campo.ListaId]) {
          const valorObj = valoresListas[campo.ListaId].find((v: any) => v.Id === value);
          return valorObj ? valorObj.Valor : value;
        }
        return value;
      case "Archivo":
        if (value) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");
                  const response = await fetch(`/api/documentos/viewer?documentId=${value}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const data = await response.json();
                  if (data.success) {
                    window.open(data.viewerUrl, '_blank');
                  } else {
                    toast({
                      title: "Error",
                      description: "No se pudo abrir el archivo",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  console.error("Error:", error);
                  toast({
                    title: "Error",
                    description: "Error al abrir el archivo",
                    variant: "destructive",
                  });
                }
              }}
            >
              <FileText className="h-4 w-4 mr-1" />
              Ver
            </Button>
          );
        }
        return "-";
      default:
        return value;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!modulo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">Módulo no encontrado</div>
      </div>
    );
  }

  const camposVisiblesGrilla = campos.filter((c) => c.VisibleEnGrilla);

  // Calcular paginación
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = registrosFiltrados.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(registrosFiltrados.length / recordsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{modulo.Nombre}</h1>
          <p className="text-gray-500 mt-1">Gestión de {modulo.Nombre.toLowerCase()}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={`Buscar en ${modulo.Nombre.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            {registrosFiltrados.length} resultado{registrosFiltrados.length !== 1 ? 's' : ''} encontrado{registrosFiltrados.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingId ? "Editar Registro" : "Nuevo Registro"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                resetForm();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campos
                .filter((c) => c.Visible)
                .map((campo) => (
                  <div key={campo.Id}>
                    <Label htmlFor={campo.Nombre}>
                      {campo.Nombre}
                      {campo.Obligatorio && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderInput(campo)}
                  </div>
                ))}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                disabled={uploadingFiles}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadingFiles}>
                {uploadingFiles 
                  ? "Subiendo archivos..." 
                  : (editingId ? "Actualizar" : "Guardar")}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de registros */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {camposVisiblesGrilla.map((campo) => (
                  <th
                    key={campo.Id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {campo.Nombre}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={camposVisiblesGrilla.length + 1}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    {searchTerm 
                      ? `No se encontraron resultados para "${searchTerm}"`
                      : "No hay registros. Haz clic en \"Nuevo\" para agregar el primero."}
                  </td>
                </tr>
              ) : (
                currentRecords.map((registro) => (
                  <tr key={registro.Id} className="hover:bg-gray-50">
                    {camposVisiblesGrilla.map((campo) => (
                      <td key={campo.Id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderCellValue(campo, registro)}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/dashboard/modulos/${moduloId}/${registro.Id}`)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(registro)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(registro.Id)}
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

      {/* Paginación */}
      {registrosFiltrados.length > recordsPerPage && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-md">
          <div className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{indexOfFirstRecord + 1}</span> a{" "}
            <span className="font-medium">
              {Math.min(indexOfLastRecord, registrosFiltrados.length)}
            </span>{" "}
            de <span className="font-medium">{registrosFiltrados.length}</span> registros
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page;
                if (totalPages <= 7) {
                  page = i + 1;
                } else if (currentPage <= 4) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  page = totalPages - 6 + i;
                } else {
                  page = currentPage - 3 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Resumen */}
      <div className="text-sm text-gray-500">
        Total de registros: {registros.length}
        {searchTerm && ` (${registrosFiltrados.length} filtrado${registrosFiltrados.length !== 1 ? 's' : ''})`}
      </div>
    </div>
  );
}
