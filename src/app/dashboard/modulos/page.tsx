"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, Trash2, Save, X, Edit, AlertCircle, Eye, GripVertical,
  FileText, Users, Calendar, Home, Settings, List as ListIcon, 
  Folder, File, Package, Briefcase, Heart, Star, Shield
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type TipoDato = "Texto" | "Descripcion" | "Numero" | "Fecha" | "FechaHora" | "Lista" | "Archivo";
type TipoModulo = "Principal" | "Secundario";

interface Campo {
  tempId: string;
  Nombre: string;
  TipoDato: TipoDato;
  Largo: number | null;
  ListaId: number | null;
  Orden: number;
  Visible: boolean;
  VisibleEnGrilla: boolean;
  Obligatorio: boolean;
}

interface Modulo {
  Id?: number;
  ModuloId?: number;
  Nombre: string;
  NombreTabla: string;
  Tipo: TipoModulo;
  Icono: string;
  Orden: number;
  Activo: boolean;
  ModuloPrincipalId: number | null;
}

interface Lista {
  Id: number;
  Nombre: string;
}

const ICONOS = [
  { name: "FileText", icon: FileText, label: "Documento" },
  { name: "Users", icon: Users, label: "Usuarios" },
  { name: "Calendar", icon: Calendar, label: "Calendario" },
  { name: "Home", icon: Home, label: "Casa" },
  { name: "Settings", icon: Settings, label: "Configuración" },
  { name: "List", icon: ListIcon, label: "Lista" },
  { name: "Folder", icon: Folder, label: "Carpeta" },
  { name: "File", icon: File, label: "Archivo" },
  { name: "Package", icon: Package, label: "Paquete" },
  { name: "Briefcase", icon: Briefcase, label: "Maletín" },
  { name: "Heart", icon: Heart, label: "Corazón" },
  { name: "Star", icon: Star, label: "Estrella" },
  { name: "Shield", icon: Shield, label: "Escudo" },
];

export default function ModulosPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [editingModuloId, setEditingModuloId] = useState<number | null>(null);
  const [camposExistentes, setCamposExistentes] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    Nombre: "",
    Tipo: "Principal" as TipoModulo,
    ModuloPrincipalId: null as number | null,
    Icono: "FileText",
    Orden: 1,
  });

  const [campos, setCampos] = useState<Campo[]>([
    {
      tempId: crypto.randomUUID(),
      Nombre: "",
      TipoDato: "Texto",
      Largo: 100,
      ListaId: null,
      Orden: 1,
      Visible: true,
      VisibleEnGrilla: true,
      Obligatorio: false,
    },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const [resModulos, resListas] = await Promise.all([
        fetch("/api/modulos", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/listas", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (resModulos.ok) {
        const dataModulos = await resModulos.json();
        setModulos(dataModulos.data || []);
      }

      if (resListas.ok) {
        const dataListas = await resListas.json();
        setListas(dataListas.data || []);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(campos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Actualizar el orden
    const updatedItems = items.map((item, index) => ({
      ...item,
      Orden: index + 1,
    }));

    setCampos(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.Nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del módulo es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (campos.length === 0 || !campos[0].Nombre) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un campo",
        variant: "destructive",
      });
      return;
    }

    for (let i = 0; i < campos.length; i++) {
      if (!campos[i].Nombre.trim()) {
        toast({
          title: "Error",
          description: `El campo ${i + 1} debe tener un nombre`,
          variant: "destructive",
        });
        return;
      }
      if (campos[i].TipoDato === "Lista" && !campos[i].ListaId) {
        toast({
          title: "Error",
          description: `El campo "${campos[i].Nombre}" requiere seleccionar una lista`,
          variant: "destructive",
        });
        return;
      }
    }

    const requestData = {
      Nombre: formData.Nombre,
      Tipo: formData.Tipo,
      ModuloPrincipalId: formData.ModuloPrincipalId,
      Icono: formData.Icono,
      Orden: formData.Orden,
      Campos: campos.map(({ tempId, ...campo }) => campo),
    };

    console.log("Datos a enviar:", requestData);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        editingModuloId ? `/api/modulos?id=${editingModuloId}` : "/api/modulos",
        {
          method: editingModuloId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      if (response.ok) {
        toast({
          title: "Éxito",
          description: editingModuloId ? "Módulo actualizado correctamente" : "Módulo creado correctamente",
        });
        setShowForm(false);
        resetForm();
        fetchData();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || (editingModuloId ? "No se pudo actualizar el módulo" : "No se pudo crear el módulo"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: editingModuloId ? "Error al actualizar el módulo" : "Error al crear el módulo",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      Nombre: "",
      Tipo: "Principal",
      ModuloPrincipalId: null,
      Icono: "FileText",
      Orden: modulos.length + 1,
    });
    setCampos([
      {
        tempId: crypto.randomUUID(),
        Nombre: "",
        TipoDato: "Texto",
        Largo: 100,
        ListaId: null,
        Orden: 1,
        Visible: true,
        VisibleEnGrilla: true,
        Obligatorio: false,
      },
    ]);
    setShowPreview(false);
    setEditingModuloId(null);
    setCamposExistentes(new Set());
  };

  const addCampo = () => {
    setCampos([
      ...campos,
      {
        tempId: crypto.randomUUID(),
        Nombre: "",
        TipoDato: "Texto",
        Largo: 100,
        ListaId: null,
        Orden: campos.length + 1,
        Visible: true,
        VisibleEnGrilla: true,
        Obligatorio: false,
      },
    ]);
  };

  const removeCampo = (index: number) => {
    const campo = campos[index];
    // No permitir eliminar campos existentes en modo edición
    if (editingModuloId && camposExistentes.has(campo.Nombre)) {
      toast({
        title: "No permitido",
        description: "No se pueden eliminar campos existentes para evitar pérdida de datos",
        variant: "destructive",
      });
      return;
    }
    if (campos.length > 1) {
      setCampos(campos.filter((_, i) => i !== index));
    }
  };

  const updateCampo = (index: number, field: string, value: any) => {
    const newCampos = [...campos];
    
    if (field === "TipoDato") {
      if (value === "Texto") {
        newCampos[index] = { ...newCampos[index], TipoDato: value, Largo: 100, ListaId: null };
      } else if (value === "Lista") {
        newCampos[index] = { ...newCampos[index], TipoDato: value, Largo: null, ListaId: null };
      } else {
        newCampos[index] = { ...newCampos[index], TipoDato: value, Largo: null, ListaId: null };
      }
    } else {
      newCampos[index] = { ...newCampos[index], [field]: value };
    }
    
    setCampos(newCampos);
  };

  const handleEditModulo = async (moduloId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/modulos?id=${moduloId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const modulo = result.data;
        
        // Cargar datos del módulo en el formulario
        setFormData({
          Nombre: modulo.Nombre,
          Tipo: modulo.Tipo,
          ModuloPrincipalId: modulo.ModuloPrincipalId,
          Icono: modulo.Icono || "FileText",
          Orden: modulo.Orden,
        });

        // Cargar campos del módulo
        if (modulo.Campos && modulo.Campos.length > 0) {
          const nombresCampos = new Set(modulo.Campos.map((c: any) => c.Nombre));
          setCamposExistentes(nombresCampos);
          setCampos(
            modulo.Campos.map((campo: any) => ({
              tempId: crypto.randomUUID(),
              Nombre: campo.Nombre,
              TipoDato: campo.TipoDato,
              Largo: campo.Largo || 100,
              ListaId: campo.ListaId,
              Orden: campo.Orden,
              Visible: campo.Visible,
              VisibleEnGrilla: campo.VisibleEnGrilla,
              Obligatorio: campo.Obligatorio,
            }))
          );
        }

        setEditingModuloId(moduloId);
        setShowForm(true);
        setShowPreview(false);
      } else {
        toast({
          title: "Error",
          description: "No se pudo cargar el módulo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al cargar el módulo",
        variant: "destructive",
      });
    }
  };

  const handleDeleteModulo = async (moduloId: number) => {
    const confirmed = await confirm({
      title: "¿Eliminar este módulo?",
      description: "Se perderán todos los datos y configuraciones asociadas. Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar"
    });
    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/modulos?id=${moduloId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Módulo eliminado correctamente",
        });
        fetchData();
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || error.message || "No se pudo eliminar el módulo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al eliminar el módulo",
        variant: "destructive",
      });
    }
  };

  const tiposDato: TipoDato[] = ["Texto", "Descripcion", "Numero", "Fecha", "FechaHora", "Lista", "Archivo"];
  const tiposModulo: TipoModulo[] = ["Principal", "Secundario"];

  const SelectedIcon = ICONOS.find(i => i.name === formData.Icono)?.icon || FileText;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Administración de Módulos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Crea y gestiona los módulos dinámicos del sistema</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Módulo
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="shadow-lg border-gray-200 dark:border-gray-700 dark:bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 dark:bg-blue-600 text-white p-2 rounded-lg">
                  <SelectedIcon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">
                    {editingModuloId ? "Editar Módulo" : "Crear Nuevo Módulo"}
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Define la estructura y campos del módulo
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? "Ocultar" : "Vista Previa"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario Principal */}
              <div className={`${showPreview ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Información del Módulo */}
                  <Card className="border-2 dark:border-gray-700 dark:bg-gray-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg dark:text-white">Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                          <Label htmlFor="nombre" className="text-sm font-medium dark:text-gray-300">
                            Nombre del Módulo <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="nombre"
                            value={formData.Nombre}
                            onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                            placeholder="ej: Residentes, Empleados..."
                            className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                            required
                          />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                          <Label htmlFor="tipo" className="text-sm font-medium dark:text-gray-300">Tipo de Módulo</Label>
                          <select
                            id="tipo"
                            className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            value={formData.Tipo}
                            onChange={(e) =>
                              setFormData({ ...formData, Tipo: e.target.value as TipoModulo })
                            }
                            disabled={!!editingModuloId}
                          >
                            {tiposModulo.map((tipo) => (
                              <option key={tipo} value={tipo}>
                                {tipo}
                              </option>
                            ))}
                          </select>
                        </div>

                        {formData.Tipo === "Secundario" && (
                          <div className="col-span-2">
                            <Label htmlFor="moduloPadre" className="text-sm font-medium dark:text-gray-300">
                              Módulo Padre <span className="text-red-500">*</span>
                              {editingModuloId && <span className="text-xs text-blue-500 ml-2">(Editable)</span>}
                            </Label>
                            <select
                              id="moduloPadre"
                              className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              value={formData.ModuloPrincipalId?.toString() || ""}
                              onChange={(e) => {
                                const newValue = e.target.value ? parseInt(e.target.value) : null;
                                console.log("Seleccionando módulo padre:", newValue, "valor del evento:", e.target.value);
                                setFormData({
                                  ...formData,
                                  ModuloPrincipalId: newValue,
                                });
                              }}
                              required
                            >
                              <option value="">Seleccionar...</option>
                              {modulos
                                .filter((m) => m.Tipo === "Principal")
                                .map((m) => (
                                  <option key={m.Id || m.ModuloId} value={m.Id || m.ModuloId}>
                                    {m.Nombre}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}

                        <div className="col-span-2 md:col-span-1">
                          <Label className="text-sm font-medium dark:text-gray-300">Icono</Label>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full mt-1 justify-start dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setShowIconSelector(!showIconSelector)}
                            disabled={!!editingModuloId}
                          >
                            <SelectedIcon className="h-4 w-4 mr-2" />
                            {ICONOS.find(i => i.name === formData.Icono)?.label || formData.Icono}
                          </Button>
                          
                          {showIconSelector && !editingModuloId && (
                            <div className="absolute z-10 mt-2 p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg grid grid-cols-4 gap-2">
                              {ICONOS.map(({ name, icon: Icon, label }) => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, Icono: name });
                                    setShowIconSelector(false);
                                  }}
                                  className={`p-3 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700 border-2 transition-colors ${
                                    formData.Icono === name ? 'border-blue-500 bg-blue-50 dark:bg-gray-700' : 'border-gray-200 dark:border-gray-600'
                                  }`}
                                  title={label}
                                >
                                  <Icon className="h-6 w-6 mx-auto dark:text-gray-300" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="col-span-2 md:col-span-1">
                          <Label htmlFor="orden" className="text-sm font-medium dark:text-gray-300">Orden en Menú</Label>
                          <Input
                            id="orden"
                            type="number"
                            value={formData.Orden}
                            onChange={(e) =>
                              setFormData({ ...formData, Orden: parseInt(e.target.value) || 1 })
                            }
                            min="1"
                            className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Campos */}
                  <Card className="border-2 dark:border-gray-700 dark:bg-gray-800">
                    <CardHeader className="pb-3">
                      <div>
                        <CardTitle className="text-lg dark:text-white">Campos del Módulo</CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Arrastra para reordenar</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="campos">
                          {(provided) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              className="space-y-3"
                            >
                              {campos.map((campo, index) => (
                                <Draggable key={campo.tempId} draggableId={campo.tempId} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`bg-white dark:bg-gray-700 border-2 rounded-lg p-4 transition-shadow ${
                                        snapshot.isDragging ? 'shadow-lg border-blue-400 dark:border-blue-500' : 
                                        editingModuloId !== null && camposExistentes.has(campo.Nombre) ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10' :
                                        'border-gray-200 dark:border-gray-600'
                                      }`}
                                    >
                                      {editingModuloId !== null && camposExistentes.has(campo.Nombre) && (
                                        <div className="mb-2 text-xs text-green-700 dark:text-green-400 font-medium">
                                          ✓ Campo existente - Solo se puede editar: largo (texto), obligatorio, visible
                                        </div>
                                      )}
                                      <div className="grid grid-cols-12 gap-3 items-start">
                                        <div 
                                          {...provided.dragHandleProps}
                                          className="col-span-1 flex items-center justify-center pt-8 cursor-move"
                                        >
                                          <GripVertical className="h-5 w-5 text-gray-400" />
                                        </div>

                                        <div className="col-span-11 grid grid-cols-12 gap-3">
                                          <div className="col-span-12 md:col-span-3">
                                            <Label className="text-xs dark:text-gray-300">Nombre <span className="text-red-500">*</span></Label>
                                            <Input
                                              value={campo.Nombre}
                                              onChange={(e) => updateCampo(index, "Nombre", e.target.value)}
                                              placeholder="Nombre del campo"
                                              className="mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-white dark:placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                              disabled={editingModuloId !== null && camposExistentes.has(campo.Nombre)}
                                              required
                                            />
                                          </div>

                                          <div className="col-span-12 md:col-span-2">
                                            <Label className="text-xs dark:text-gray-300">Tipo <span className="text-red-500">*</span></Label>
                                            <select
                                              className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                              value={campo.TipoDato}
                                              onChange={(e) => updateCampo(index, "TipoDato", e.target.value)}
                                              disabled={editingModuloId !== null && camposExistentes.has(campo.Nombre)}
                                            >
                                              {tiposDato.map((tipo) => (
                                                <option key={tipo} value={tipo}>
                                                  {tipo}
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          <div className="col-span-12 md:col-span-2">
                                            {campo.TipoDato === "Texto" && (
                                              <>
                                                <Label className="text-xs dark:text-gray-300">Largo</Label>
                                                <Input
                                                  type="number"
                                                  value={campo.Largo || 100}
                                                  onChange={(e) =>
                                                    updateCampo(index, "Largo", parseInt(e.target.value) || 100)
                                                  }
                                                  min="1"
                                                  max="8000"
                                                  className="mt-1 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                />
                                              </>
                                            )}
                                            {campo.TipoDato === "Lista" && (
                                              <>
                                                <Label className="text-xs dark:text-gray-300">Lista <span className="text-red-500">*</span></Label>
                                                <select
                                                  className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                  value={campo.ListaId || ""}
                                                  onChange={(e) => {
                                                    const value = e.target.value ? parseInt(e.target.value, 10) : null;
                                                    updateCampo(index, "ListaId", value);
                                                  }}
                                                  required
                                                >
                                                  <option value="">Seleccionar...</option>
                                                  {listas.map((lista) => (
                                                    <option key={lista.Id} value={lista.Id}>
                                                      {lista.Nombre}
                                                    </option>
                                                  ))}
                                                </select>
                                              </>
                                            )}
                                          </div>

                                          <div className="col-span-12 md:col-span-4 space-y-1 pt-5">
                                            <label className="flex items-center space-x-2 text-xs dark:text-gray-300">
                                              <input
                                                type="checkbox"
                                                checked={campo.Obligatorio}
                                                onChange={(e) => updateCampo(index, "Obligatorio", e.target.checked)}
                                                className="rounded"
                                              />
                                              <span>Obligatorio</span>
                                            </label>
                                            <label className="flex items-center space-x-2 text-xs dark:text-gray-300">
                                              <input
                                                type="checkbox"
                                                checked={campo.VisibleEnGrilla}
                                                onChange={(e) =>
                                                  updateCampo(index, "VisibleEnGrilla", e.target.checked)
                                                }
                                                className="rounded"
                                              />
                                              <span>Visible en grilla</span>
                                            </label>
                                          </div>

                                          <div className="col-span-12 md:col-span-1 flex items-start justify-center pt-5">
                                            {campos.length > 1 && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeCampo(index)}
                                                disabled={editingModuloId !== null && camposExistentes.has(campo.Nombre)}
                                                title={editingModuloId !== null && camposExistentes.has(campo.Nombre) ? "No se pueden eliminar campos existentes" : "Eliminar campo"}
                                              >
                                                <Trash2 className={`h-4 w-4 ${editingModuloId !== null && camposExistentes.has(campo.Nombre) ? 'text-gray-400' : 'text-red-500'}`} />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                      
                      <div className="mt-4 flex justify-center">
                        <Button type="button" onClick={addCampo} variant="outline" className="w-full max-w-md">
                          <Plus className="mr-2 h-4 w-4" /> Agregar Campo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end space-x-3 pt-4">
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
                    <Button type="submit" size="lg">
                      <Save className="mr-2 h-4 w-4" /> {editingModuloId ? "Actualizar Módulo" : "Crear Módulo"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Vista Previa */}
              {showPreview && (
                <div className="lg:col-span-1">
                  <Card className="border-2 border-blue-200 dark:border-blue-800 dark:bg-gray-800 sticky top-6">
                    <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                      <CardTitle className="text-lg flex items-center dark:text-white">
                        <Eye className="h-5 w-5 mr-2" />
                        Vista Previa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Módulo</p>
                          <div className="flex items-center space-x-2">
                            <SelectedIcon className="h-5 w-5 text-blue-500" />
                            <span className="font-medium dark:text-white">{formData.Nombre || "Sin nombre"}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tipo: {formData.Tipo}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Campos ({campos.length})</p>
                          <div className="space-y-2">
                            {campos.map((campo, index) => (
                              <div key={campo.tempId} className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium dark:text-white">{campo.Nombre || `Campo ${index + 1}`}</span>
                                  <span className="text-gray-500 dark:text-gray-400">{campo.TipoDato}</span>
                                </div>
                                <div className="flex gap-2 mt-1">
                                  {campo.Obligatorio && (
                                    <span className="bg-red-100 text-red-700 px-1 rounded">Obligatorio</span>
                                  )}
                                  {campo.VisibleEnGrilla && (
                                    <span className="bg-blue-100 text-blue-700 px-1 rounded">En grilla</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tabla generada</p>
                          <p className="text-xs font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-300 p-2 rounded">
                            TD_MODULO_{formData.Nombre.toUpperCase().replace(/ /g, '_') || 'EJEMPLO'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Módulos */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Módulos Existentes ({modulos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {modulos.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <AlertCircle className="mx-auto h-16 w-16 mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">No hay módulos creados</p>
              <p className="text-sm mt-2">Haz clic en "Nuevo Módulo" para crear el primero</p>
            </div>
          ) : (
            <div className="space-y-6">
              {modulos
                .filter(m => m.Tipo === "Principal")
                .sort((a, b) => a.Orden - b.Orden)
                .map((moduloPrincipal) => {
                  const modulosSecundarios = modulos
                    .filter(m => m.Tipo === "Secundario" && m.ModuloPrincipalId === moduloPrincipal.Id)
                    .sort((a, b) => a.Orden - b.Orden);
                  
                  return (
                    <div key={moduloPrincipal.Id} className="space-y-3">
                      {/* Módulo Principal */}
                      <div className="flex items-start gap-3">
                        <ModuloCard modulo={moduloPrincipal} isPrincipal={true} />
                        
                        {/* Módulos Secundarios */}
                        {modulosSecundarios.length > 0 && (
                          <div className="flex-1 space-y-3">
                            {modulosSecundarios.map((moduloSecundario) => (
                              <ModuloCard key={moduloSecundario.Id} modulo={moduloSecundario} isPrincipal={false} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              
              {/* Módulos Secundarios sin Padre Asignado */}
              {modulos.filter(m => m.Tipo === "Secundario" && !m.ModuloPrincipalId).length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-yellow-300 dark:border-yellow-700">
                  <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-3 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Módulos Secundarios sin Padre Asignado
                  </h3>
                  <div className="space-y-3">
                    {modulos
                      .filter(m => m.Tipo === "Secundario" && !m.ModuloPrincipalId)
                      .map((modulo) => (
                        <ModuloCard key={modulo.Id} modulo={modulo} isPrincipal={false} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  function ModuloCard({ modulo, isPrincipal }: { modulo: Modulo; isPrincipal: boolean }) {
    const IconComponent = ICONOS.find(i => i.name === modulo.Icono)?.icon || FileText;
    
    return (
      <Card className={`hover:shadow-md transition-shadow dark:border-gray-600 ${
        isPrincipal 
          ? 'dark:bg-gray-700 border-2 border-blue-300 dark:border-blue-700 min-w-[300px]' 
          : 'dark:bg-gray-750 border dark:border-gray-600'
      }`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                isPrincipal 
                  ? 'bg-blue-100 dark:bg-blue-900/30' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <IconComponent className={`h-5 w-5 ${
                  isPrincipal 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div>
                <h3 className={`font-semibold dark:text-white ${isPrincipal ? 'text-base' : 'text-sm'}`}>
                  {modulo.Nombre}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {modulo.Tipo} {isPrincipal && `· Orden ${modulo.Orden}`}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditModulo(modulo.Id!)}
              >
                <Edit className="h-4 w-4 text-blue-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteModulo(modulo.Id!)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
}
