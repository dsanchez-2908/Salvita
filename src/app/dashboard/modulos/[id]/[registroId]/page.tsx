"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, X, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Campo {
  Id: number;
  Nombre: string;
  NombreColumna: string;
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
  NombreTabla: string;
  Tipo: string;
  Icono: string;
  ModuloPrincipalId: number | null;
}

interface ModuloSecundario extends Modulo {
  Campos: Campo[];
}

export default function DetalleRegistroPage() {
  const params = useParams();
  const router = useRouter();
  const moduloId = params.id as string;
  const registroId = params.registroId as string;
  const { toast } = useToast();

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [registro, setRegistro] = useState<any>(null);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [modulosSecundarios, setModulosSecundarios] = useState<ModuloSecundario[]>([]);
  const [registrosSecundarios, setRegistrosSecundarios] = useState<Record<number, any[]>>({});
  const [valoresListas, setValoresListas] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  
  // Estado para formularios de módulos secundarios
  const [showSecundarioForm, setShowSecundarioForm] = useState<number | null>(null);
  const [editingSecundarioId, setEditingSecundarioId] = useState<number | null>(null);
  const [secundarioFormData, setSecundarioFormData] = useState<Record<string, any>>({});
  const [archivosSecundarios, setArchivosSecundarios] = useState<Record<string, File>>({});
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    loadData();
  }, [moduloId, registroId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Cargar módulo con sus campos
      const moduloResponse = await fetch(`/api/modulos?id=${moduloId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const moduloData = await moduloResponse.json();
      
      if (moduloData.success) {
        setModulo(moduloData.data);
        setCampos(moduloData.data.Campos || []);
        setModulosSecundarios(moduloData.data.ModulosSecundarios || []);
      }

      // Cargar datos del registro principal
      const datosResponse = await fetch(`/api/modulos/${moduloId}/datos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const datosData = await datosResponse.json();
      
      if (datosData.success) {
        const reg = datosData.data.registros.find((r: any) => r.Id === parseInt(registroId));
        setRegistro(reg);
      }

      // Cargar valores de listas para el módulo principal
      const listasIds = (moduloData.data.Campos || [])
        .filter((c: Campo) => c.TipoDato === "Lista" && c.ListaId)
        .map((c: Campo) => c.ListaId);

      if (listasIds.length > 0) {
        await loadValoresListas([...new Set(listasIds)]);
      }

      // Cargar registros de módulos secundarios
      if (moduloData.data.ModulosSecundarios && moduloData.data.ModulosSecundarios.length > 0) {
        for (const modSec of moduloData.data.ModulosSecundarios) {
          await loadRegistrosSecundarios(modSec.Id);
          
          // Cargar valores de listas para módulo secundario
          const listasSecIds = (modSec.Campos || [])
            .filter((c: Campo) => c.TipoDato === "Lista" && c.ListaId)
            .map((c: Campo) => c.ListaId);
          
          if (listasSecIds.length > 0) {
            await loadValoresListas([...new Set(listasSecIds)]);
          }
        }
      }
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

  const loadValoresListas = async (listasIds: number[]) => {
    try {
      const token = localStorage.getItem("token");
      const valores: Record<number, any[]> = { ...valoresListas };

      for (const listaId of listasIds) {
        if (!valores[listaId]) {
          const response = await fetch(`/api/listas/${listaId}/valores`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (data.success) {
            valores[listaId] = data.data;
          }
        }
      }

      setValoresListas(valores);
    } catch (error) {
      console.error("Error cargando valores de listas:", error);
    }
  };

  const loadRegistrosSecundarios = async (moduloSecId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/modulos/${moduloSecId}/datos?parentId=${registroId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.success) {
        setRegistrosSecundarios(prev => ({
          ...prev,
          [moduloSecId]: data.data.registros,
        }));
      }
    } catch (error) {
      console.error("Error cargando registros secundarios:", error);
    }
  };

  const handleSubmitSecundario = async (e: React.FormEvent, moduloSecId: number) => {
    e.preventDefault();

    const moduloSec = modulosSecundarios.find(m => m.Id === moduloSecId);
    if (!moduloSec) return;

    // Validar campos obligatorios
    for (const campo of moduloSec.Campos) {
      if (campo.Obligatorio && !secundarioFormData[campo.Nombre]) {
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
      const dataToSend = { ...secundarioFormData };
      
      for (const [nombreCampo, archivo] of Object.entries(archivosSecundarios)) {
        if (archivo) {
          toast({
            title: "Subiendo archivo...",
            description: `Subiendo ${archivo.name}`,
          });

          const formDataUpload = new FormData();
          formDataUpload.append('file', archivo);
          formDataUpload.append('moduloNombre', moduloSec.Nombre);

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
            dataToSend[nombreCampo] = uploadResult.documentId;
          } else {
            throw new Error(`Error al subir ${archivo.name}: ${uploadResult.error}`);
          }
        }
      }

      setUploadingFiles(false);
      
      // Agregar el ID del registro principal como FK
      // El nombre de la columna FK es el NombreTabla del módulo principal + _Id
      dataToSend[`${modulo?.NombreTabla}_Id`] = parseInt(registroId);

      console.log('Datos a enviar:', dataToSend);
      console.log('Columna FK:', `${modulo?.NombreTabla}_Id`);

      const url = `/api/modulos/${moduloSecId}/datos`;
      const method = editingSecundarioId ? "PUT" : "POST";
      const body = editingSecundarioId 
        ? { ...dataToSend, id: editingSecundarioId } 
        : dataToSend;

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
          description: editingSecundarioId ? "Registro actualizado" : "Registro creado",
        });
        setShowSecundarioForm(null);
        setEditingSecundarioId(null);
        resetSecundarioForm(moduloSec.Campos);
        await loadRegistrosSecundarios(moduloSecId);
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

  const handleEditSecundario = (moduloSecId: number, registro: any) => {
    const moduloSec = modulosSecundarios.find(m => m.Id === moduloSecId);
    if (!moduloSec) return;

    const editData: Record<string, any> = {};
    moduloSec.Campos.forEach((campo) => {
      let value = registro[campo.Nombre];
      
      if (campo.TipoDato === "Fecha" && value) {
        value = new Date(value).toISOString().split("T")[0];
      } else if (campo.TipoDato === "FechaHora" && value) {
        value = new Date(value).toISOString().slice(0, 16);
      }
      
      editData[campo.Nombre] = value || "";
    });
    
    setSecundarioFormData(editData);
    setEditingSecundarioId(registro.Id);
    setShowSecundarioForm(moduloSecId);
  };

  const handleDeleteSecundario = async (moduloSecId: number, id: number) => {
    const moduloSec = modulosSecundarios.find(m => m.Id === moduloSecId);
    const nombreModulo = moduloSec?.Nombre || 'registro';
    
    if (!confirm(`¿Desea eliminar este ${nombreModulo.toLowerCase()}?\n\nPodrá restaurarlo más tarde si es necesario.`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/modulos/${moduloSecId}/datos?registroId=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Éxito",
          description: "Registro eliminado",
        });
        await loadRegistrosSecundarios(moduloSecId);
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

  const resetSecundarioForm = (campos: Campo[]) => {
    const initialData: Record<string, any> = {};
    campos.forEach((campo) => {
      initialData[campo.Nombre] = "";
    });
    setSecundarioFormData(initialData);
    setArchivosSecundarios({});
    setEditingSecundarioId(null);
  };

  const renderInput = (campo: Campo, value: any, onChange: (name: string, value: any) => void) => {
    switch (campo.TipoDato) {
      case "Texto":
        return (
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
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
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
            required={campo.Obligatorio}
          />
        );

      case "Numero":
        return (
          <input
            type="number"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
            required={campo.Obligatorio}
          />
        );

      case "Fecha":
        return (
          <input
            type="date"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
            required={campo.Obligatorio}
          />
        );

      case "FechaHora":
        return (
          <input
            type="datetime-local"
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
            required={campo.Obligatorio}
          />
        );

      case "Lista":
        const valores = campo.ListaId ? valoresListas[campo.ListaId] || [] : [];
        return (
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            value={value}
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
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
                  setArchivosSecundarios({ ...archivosSecundarios, [campo.Nombre]: file });
                  onChange(campo.Nombre, file.name);
                }
              }}
              required={campo.Obligatorio && !value && !archivosSecundarios[campo.Nombre]}
            />
            {value && !archivosSecundarios[campo.Nombre] && (
              <div className="text-sm text-gray-600">
                Archivo actual: {value}
              </div>
            )}
            {archivosSecundarios[campo.Nombre] && (
              <div className="text-sm text-green-600">
                Nuevo archivo: {archivosSecundarios[campo.Nombre].name}
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
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
            required={campo.Obligatorio}
          />
        );
    }
  };

  const renderCellValue = (campo: Campo, value: any) => {
    if (value === null || value === undefined) return "-";

    switch (campo.TipoDato) {
      case "Fecha":
        return new Date(value).toLocaleDateString("es-AR");
      case "FechaHora":
        return new Date(value).toLocaleString("es-AR");
      case "Lista":
        if (campo.ListaId && valoresListas[campo.ListaId]) {
          const valorNumerico = typeof value === 'string' ? parseInt(value) : value;
          const valorObj = valoresListas[campo.ListaId].find((v: any) => v.Id === valorNumerico);
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

  if (!modulo || !registro) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">Registro no encontrado</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/modulos/${moduloId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {campos.find(c => c.VisibleEnGrilla)?.Nombre 
                ? registro[campos.find(c => c.VisibleEnGrilla)!.Nombre]
                : `Registro #${registroId}`}
            </h1>
            <p className="text-gray-500 mt-1">Detalle de {modulo.Nombre.toLowerCase()}</p>
          </div>
        </div>
      </div>

      {/* Información del registro principal */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campos.map((campo) => (
              <div key={campo.Id}>
                <Label className="text-gray-600">{campo.Nombre}</Label>
                <div className="mt-1 text-gray-900 font-medium">
                  {renderCellValue(campo, registro[campo.Nombre])}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Módulos secundarios */}
      {modulosSecundarios && modulosSecundarios.length > 0 && modulosSecundarios.map((moduloSec) => {
        const registros = registrosSecundarios[moduloSec.Id] || [];
        const camposVisiblesGrilla = (moduloSec.Campos || []).filter((c) => c.VisibleEnGrilla);

        return (
          <Card key={moduloSec.Id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{moduloSec.Nombre}</CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    resetSecundarioForm(moduloSec.Campos);
                    setShowSecundarioForm(moduloSec.Id);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Formulario */}
              {showSecundarioForm === moduloSec.Id && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">
                      {editingSecundarioId ? "Editar" : "Nuevo"} {moduloSec.Nombre.slice(0, -1)}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowSecundarioForm(null);
                        setEditingSecundarioId(null);
                        resetSecundarioForm(moduloSec.Campos);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <form onSubmit={(e) => handleSubmitSecundario(e, moduloSec.Id)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {moduloSec.Campos.filter(c => c.Visible).map((campo) => (
                        <div key={campo.Id}>
                          <Label htmlFor={campo.Nombre}>
                            {campo.Nombre}
                            {campo.Obligatorio && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {renderInput(
                            campo,
                            secundarioFormData[campo.Nombre] || "",
                            (name, value) => setSecundarioFormData({ ...secundarioFormData, [name]: value })
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowSecundarioForm(null);
                          setEditingSecundarioId(null);
                          resetSecundarioForm(moduloSec.Campos);
                        }}
                        disabled={uploadingFiles}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={uploadingFiles}>
                        {uploadingFiles 
                          ? "Subiendo archivos..." 
                          : (editingSecundarioId ? "Actualizar" : "Guardar")}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tabla */}
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
                    {registros.length === 0 ? (
                      <tr>
                        <td
                          colSpan={camposVisiblesGrilla.length + 1}
                          className="px-6 py-4 text-center text-gray-500"
                        >
                          No hay registros. Haz clic en "Agregar" para crear el primero.
                        </td>
                      </tr>
                    ) : (
                      registros.map((reg) => (
                        <tr key={reg.Id} className="hover:bg-gray-50">
                          {camposVisiblesGrilla.map((campo) => (
                            <td key={campo.Id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderCellValue(campo, reg[campo.Nombre])}
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditSecundario(moduloSec.Id, reg)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteSecundario(moduloSec.Id, reg.Id)}
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
              <div className="mt-2 text-sm text-gray-500">
                Total: {registros.length}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
