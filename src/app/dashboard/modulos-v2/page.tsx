"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, Trash2, Save, X, Edit, AlertCircle, Eye, GripVertical,
  FileText, Users, Calendar, Home, Settings, List as ListIcon, 
  Folder, File, Package, Briefcase, Heart, Star, Shield, Link as LinkIcon, Sliders
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type TipoDato = "Texto" | "Descripcion" | "Numero" | "Decimal" | "Fecha" | "FechaHora" | "Lista" | "Archivo" | "IDInterno";

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

interface ModuloV2 {
  Id: number;
  Nombre: string;
  NombreTabla: string;
  MostrarEnMenu: boolean;
  Icono: string;
  Orden: number;
  Estado: string;
  ModulosRelacionados?: ModuloRelacion[];  // Relaciones tipo "Hijo" - para crear registros
  ModulosParaAsociar?: ModuloRelacion[];    // Relaciones tipo "Asociar" - para asociar registros existentes
}

type TipoRelacionModulo = 'Hijo' | 'Asociar';

interface ModuloRelacion {
  Id: number;
  ModuloPadreId: number;
  ModuloHijoId: number;
  TipoRelacion: TipoRelacionModulo;
  Orden: number;
  ModuloHijo?: {
    Id: number;
    Nombre: string;
    MostrarEnMenu: boolean;
    Icono: string;
  };
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

export default function ModulosV2Page() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [modulos, setModulos] = useState<ModuloV2[]>([]);
  const [modulosDisponibles, setModulosDisponibles] = useState<ModuloV2[]>([]); // Para selector de relaciones
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [editingModuloId, setEditingModuloId] = useState<number | null>(null);
  const [camposExistentes, setCamposExistentes] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    Nombre: "",
    MostrarEnMenu: true,
    Icono: "FileText",
    Orden: 1,
    ModulosRelacionados: [] as number[],      // Módulos hijos para crear registros
    ModulosParaAsociar: [] as number[],       // Módulos para asociar registros existentes
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
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // Obtener módulos V2
      const responseModulos = await fetch("/api/modulos-v2", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (responseModulos.ok) {
        const data = await responseModulos.json();
        const modulosBase = data.data || [];
        
        // Cargar relaciones para cada módulo
        const modulosConRelaciones = await Promise.all(
          modulosBase.map(async (modulo: ModuloV2) => {
            const responseDetalle = await fetch(`/api/modulos-v2?id=${modulo.Id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (responseDetalle.ok) {
              const detalleData = await responseDetalle.json();
              return detalleData.data;
            }
            return modulo;
          })
        );
        
        setModulos(modulosConRelaciones);
        setModulosDisponibles(modulosConRelaciones);
      }

      // Obtener listas
      const responseListas = await fetch("/api/listas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (responseListas.ok) {
        const dataListas = await responseListas.json();
        setListas(dataListas.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (modulo: ModuloV2) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/modulos-v2?id=${modulo.Id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const moduloCompleto = data.data;

        console.log('handleEdit - Módulo recibido:', moduloCompleto.Nombre);
        console.log('handleEdit - ModulosRelacionados:', moduloCompleto.ModulosRelacionados);
        console.log('handleEdit - Filtrando tipo Hijo:', 
          moduloCompleto.ModulosRelacionados?.filter((r: ModuloRelacion) => r.TipoRelacion === 'Hijo')
        );

        setFormData({
          Nombre: moduloCompleto.Nombre,
          MostrarEnMenu: moduloCompleto.MostrarEnMenu,
          Icono: moduloCompleto.Icono || "FileText",
          Orden: moduloCompleto.Orden,
          ModulosRelacionados: moduloCompleto.ModulosRelacionados
            ?.filter((r: ModuloRelacion) => r.TipoRelacion === 'Hijo')
            ?.map((r: ModuloRelacion) => r.ModuloHijoId) || [],
          ModulosParaAsociar: moduloCompleto.ModulosRelacionados
            ?.filter((r: ModuloRelacion) => r.TipoRelacion === 'Asociar')
            ?.map((r: ModuloRelacion) => r.ModuloHijoId) || [],
        });

        console.log('handleEdit - formData.ModulosRelacionados:', 
          moduloCompleto.ModulosRelacionados
            ?.filter((r: ModuloRelacion) => r.TipoRelacion === 'Hijo')
            ?.map((r: ModuloRelacion) => r.ModuloHijoId) || []
        );

        const camposData = moduloCompleto.Campos?.map((campo: any) => ({
          tempId: crypto.randomUUID(),
          Nombre: campo.Nombre,
          TipoDato: campo.TipoDato,
          Largo: campo.Largo,
          ListaId: campo.ListaId,
          Orden: campo.Orden,
          Visible: campo.Visible,
          VisibleEnGrilla: campo.VisibleEnGrilla,
          Obligatorio: campo.Obligatorio,
        })) || [];

        setCampos(camposData);
        setCamposExistentes(new Set(camposData.map((c: Campo) => c.Nombre)));
        setEditingModuloId(modulo.Id);
        setShowForm(true);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el módulo",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (modulo: ModuloV2) => {
    const confirmed = await confirm({
      title: "¿Eliminar módulo?",
      description: `Se eliminará el módulo "${modulo.Nombre}" y toda su información. Esta acción no se puede deshacer.`,
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/modulos-v2?id=${modulo.Id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Módulo eliminado correctamente",
        });
        fetchData();
        
        // Si el módulo se mostraba en el menú, notificar al layout para actualizar
        if (modulo.MostrarEnMenu) {
          window.dispatchEvent(new CustomEvent('modulosUpdated'));
        }
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "No se pudo eliminar el módulo",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.Nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del módulo es requerido",
        variant: "destructive",
      });
      return;
    }

    const camposValidos = campos.filter(c => c.Nombre.trim() !== "");
    if (camposValidos.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un campo",
        variant: "destructive",
      });
      return;
    }

    // Validar que no haya nombres de campos duplicados
    const nombresCampos = camposValidos.map(c => c.Nombre.toLowerCase());
    const duplicados = nombresCampos.filter((n, i) => nombresCampos.indexOf(n) !== i);
    if (duplicados.length > 0) {
      toast({
        title: "Error",
        description: `Hay campos duplicados: ${duplicados.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const requestData = {
      Nombre: formData.Nombre,
      MostrarEnMenu: formData.MostrarEnMenu,
      Icono: formData.Icono,
      Orden: formData.Orden,
      Campos: camposValidos.map(campo => ({
        Nombre: campo.Nombre,
        TipoDato: campo.TipoDato,
        Largo: campo.TipoDato === "Texto" ? campo.Largo : null,
        ListaId: campo.TipoDato === "Lista" ? campo.ListaId : null,
        Orden: campo.Orden,
        Visible: campo.Visible,
        VisibleEnGrilla: campo.VisibleEnGrilla,
        Obligatorio: campo.Obligatorio,
      })),
      ModulosRelacionados: formData.ModulosRelacionados,
      ModulosParaAsociar: formData.ModulosParaAsociar,
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        editingModuloId ? `/api/modulos-v2?id=${editingModuloId}` : "/api/modulos-v2",
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
        
        // Actualizar el menú si:
        // 1. El módulo se muestra en el menú principal, O
        // 2. Hay módulos relacionados (porque podría ser un hijo de otro módulo en el menú)
        if (formData.MostrarEnMenu || formData.ModulosRelacionados.length > 0) {
          window.dispatchEvent(new CustomEvent('modulosUpdated'));
        }
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
      MostrarEnMenu: true,
      Icono: "FileText",
      Orden: modulos.length + 1,
      ModulosRelacionados: [],
      ModulosParaAsociar: [],
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

  const updateCampo = (index: number, field: keyof Campo, value: any) => {
    const newCampos = [...campos];
    newCampos[index] = { ...newCampos[index], [field]: value };
    setCampos(newCampos);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(campos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      Orden: index + 1,
    }));

    setCampos(updatedItems);
  };

  const getIconComponent = (iconName: string) => {
    const iconData = ICONOS.find((i) => i.name === iconName);
    return iconData ? iconData.icon : FileText;
  };

  const toggleModuloRelacion = (moduloId: number) => {
    setFormData(prev => ({
      ...prev,
      ModulosRelacionados: prev.ModulosRelacionados.includes(moduloId)
        ? prev.ModulosRelacionados.filter(id => id !== moduloId)
        : [...prev.ModulosRelacionados, moduloId]
    }));
  };

  const toggleModuloAsociacion = (moduloId: number) => {
    setFormData(prev => ({
      ...prev,
      ModulosParaAsociar: prev.ModulosParaAsociar.includes(moduloId)
        ? prev.ModulosParaAsociar.filter(id => id !== moduloId)
        : [...prev.ModulosParaAsociar, moduloId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Módulos</h1>
          <p className="text-sm text-gray-600 mt-1">
            Sistema de módulos con relaciones múltiples
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Módulo
        </Button>
      </div>

      {!showForm ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-white">Módulos Configurados ({modulos.length})</CardTitle>
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
                {/* Módulos que se muestran en menú */}
                {modulos
                  .filter(m => m.MostrarEnMenu)
                  .sort((a, b) => a.Orden - b.Orden)
                  .map((modulo) => {
                    const IconComponent = getIconComponent(modulo.Icono);
                    return (
                      <div key={modulo.Id} className="space-y-3">
                        {/* Módulo Principal */}
                        <Card className="hover:shadow-md transition-shadow dark:border-gray-600 border-2 border-blue-300 dark:border-blue-700 dark:bg-gray-700">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                  <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-base dark:text-white">
                                    {modulo.Nombre}
                                  </h3>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Tabla: {modulo.NombreTabla} · Orden {modulo.Orden}
                                  </p>
                                  {modulo.ModulosRelacionados && modulo.ModulosRelacionados.length > 0 && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <LinkIcon className="w-3 h-3 text-gray-400" />
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {modulo.ModulosRelacionados.length} módulo(s) relacionado(s)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.location.href = `/dashboard/modulos-v2/${modulo.Id}/configurar-vista`}
                                  title="Configurar Vista"
                                >
                                  <Sliders className="h-4 w-4 text-purple-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(modulo)}
                                >
                                  <Edit className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(modulo)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Módulos Relacionados (Hijos) */}
                        {modulo.ModulosRelacionados && modulo.ModulosRelacionados.length > 0 && (
                          <div className="ml-12 space-y-2">
                            {modulo.ModulosRelacionados.map((relacion) => {
                              const HijoIconComponent = getIconComponent(relacion.ModuloHijo?.Icono || 'FileText');
                              const esAsociacion = relacion.TipoRelacion === 'Asociar';
                              
                              return (
                                <Card 
                                  key={relacion.Id} 
                                  className={`hover:shadow-md transition-shadow dark:border-gray-600 border dark:bg-gray-750 border-l-4 ${
                                    esAsociacion 
                                      ? 'border-l-green-500 dark:border-l-green-600 bg-green-50 dark:bg-green-950/20' 
                                      : 'border-l-blue-400 dark:border-l-blue-600'
                                  }`}
                                >
                                  <CardContent className="pt-3 pb-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${
                                          esAsociacion 
                                            ? 'bg-green-100 dark:bg-green-900/30' 
                                            : 'bg-gray-100 dark:bg-gray-800'
                                        }`}>
                                          <HijoIconComponent className={`h-4 w-4 ${
                                            esAsociacion 
                                              ? 'text-green-600 dark:text-green-400' 
                                              : 'text-gray-600 dark:text-gray-400'
                                          }`} />
                                        </div>
                                        <div>
                                          <h4 className="font-medium text-sm dark:text-white">
                                            {relacion.ModuloHijo?.Nombre}
                                          </h4>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {esAsociacion 
                                              ? `Relacionado con registros de ${modulo.Nombre}` 
                                              : `Relacionado con ${modulo.Nombre}`}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const hijoModulo = modulos.find(m => m.Id === relacion.ModuloHijoId);
                                            if (hijoModulo) handleEdit(hijoModulo);
                                          }}
                                        >
                                          <Edit className="h-3 w-3 text-blue-500" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const hijoModulo = modulos.find(m => m.Id === relacion.ModuloHijoId);
                                            if (hijoModulo) handleDelete(hijoModulo);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                
                {/* Módulos huérfanos: MostrarEnMenu=false y no son hijos de nadie */}
                {(() => {
                  const todosLosHijos = new Set(
                    modulos.flatMap(m => 
                      (m.ModulosRelacionados || []).map(r => r.ModuloHijoId)
                    )
                  );
                  const huerfanos = modulos.filter(
                    m => !m.MostrarEnMenu && !todosLosHijos.has(m.Id)
                  );
                  
                  if (huerfanos.length > 0) {
                    return (
                      <div className="mt-6 pt-6 border-t-2 border-yellow-300 dark:border-yellow-700">
                        <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-3 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Módulos sin Relación (no aparecen en menú ni son hijos)
                        </h3>
                        <div className="space-y-3">
                          {huerfanos.map((modulo) => {
                            const IconComponent = getIconComponent(modulo.Icono);
                            return (
                              <Card 
                                key={modulo.Id} 
                                className="hover:shadow-md transition-shadow dark:border-gray-600 border dark:bg-gray-750 border-l-4 border-l-yellow-400 dark:border-l-yellow-600"
                              >
                                <CardContent className="pt-4 pb-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                        <IconComponent className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-sm dark:text-white">
                                          {modulo.Nombre}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          Tabla: {modulo.NombreTabla}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit(modulo)}
                                      >
                                        <Edit className="h-4 w-4 text-blue-500" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(modulo)}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card className="mb-4 shadow-lg border-gray-200 dark:border-gray-700 dark:bg-gray-800">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500 dark:bg-blue-600 text-white p-2 rounded-lg">
                    {(() => {
                      const IconComponent = getIconComponent(formData.Icono);
                      return <IconComponent className="h-6 w-6" />;
                    })()}
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
                <Button
                  type="button"
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
            </CardHeader>
            <CardContent className="pt-6">
              {/* Información básica */}
              <Card className="border-2 dark:border-gray-700 dark:bg-gray-800 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg dark:text-white">Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nombre" className="text-sm font-medium dark:text-gray-300">
                        Nombre del Módulo <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="nombre"
                        value={formData.Nombre}
                        onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                        placeholder="Ej: Clientes, Proyectos, etc."
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="orden" className="text-sm font-medium dark:text-gray-300">Orden en Menú</Label>
                      <Input
                        id="orden"
                        type="number"
                        value={formData.Orden}
                        onChange={(e) => setFormData({ ...formData, Orden: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="flex items-center space-x-2 text-sm dark:text-gray-300">
                        <input
                          type="checkbox"
                          id="mostrarEnMenu"
                          checked={formData.MostrarEnMenu}
                          onChange={(e) => setFormData({ ...formData, MostrarEnMenu: e.target.checked })}
                          className="rounded"
                        />
                        <span>Mostrar en menú principal</span>
                      </label>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <Label className="text-sm font-medium dark:text-gray-300">Icono</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full mt-1 justify-start dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                        onClick={() => setShowIconSelector(!showIconSelector)}
                      >
                        {(() => {
                          const IconComponent = getIconComponent(formData.Icono);
                          return <IconComponent className="h-4 w-4 mr-2" />;
                        })()}
                        {ICONOS.find((i) => i.name === formData.Icono)?.label || "Seleccionar icono"}
                      </Button>
                      
                      {showIconSelector && (
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
                  </div>

                  {/* Módulos Relacionados */}
                  <div className="pt-4 border-t dark:border-gray-700">
                    <Label className="text-sm font-medium dark:text-gray-300">Módulos Relacionados</Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Selecciona los módulos que aparecerán dentro de este módulo
                    </p>
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2 dark:bg-gray-700 dark:border-gray-600">
                      {modulosDisponibles
                        .filter(m => !editingModuloId || m.Id !== editingModuloId)
                        .map((modulo) => {
                          const IconComponent = getIconComponent(modulo.Icono);
                          const isSelected = formData.ModulosRelacionados.includes(modulo.Id);
                          
                          return (
                            <div
                              key={modulo.Id}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                isSelected ? "bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700" : "border border-transparent"
                              }`}
                              onClick={() => toggleModuloRelacion(modulo.Id)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4"
                              />
                              <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              <div className="flex-1">
                                <div className="font-medium text-sm dark:text-white">{modulo.Nombre}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                  {modulo.MostrarEnMenu ? (
                                    <span className="text-green-600 dark:text-green-400">● Aparece en menú</span>
                                  ) : (
                                    <span className="text-gray-400">○ No en menú</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {formData.ModulosRelacionados.length > 0 && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                        {formData.ModulosRelacionados.length} módulo(s) seleccionado(s)
                      </p>
                    )}
                  </div>

                  {/* Módulos a Relacionar sus Registros */}
                  <div className="pt-4 border-t dark:border-gray-700">
                    <Label className="text-sm font-medium dark:text-gray-300">
                      Módulos a relacionar sus registros
                    </Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Selecciona los módulos cuyos registros existentes podrán asociarse a este módulo
                    </p>
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2 dark:bg-gray-700 dark:border-gray-600">
                      {modulosDisponibles
                        .filter(m => !editingModuloId || m.Id !== editingModuloId)
                        .map((modulo) => {
                          const IconComponent = getIconComponent(modulo.Icono);
                          const isSelected = formData.ModulosParaAsociar.includes(modulo.Id);
                          
                          return (
                            <div
                              key={modulo.Id}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 ${
                                isSelected ? "bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700" : "border border-transparent"
                              }`}
                              onClick={() => toggleModuloAsociacion(modulo.Id)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4"
                              />
                              <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              <div className="flex-1">
                                <div className="font-medium text-sm dark:text-white">{modulo.Nombre}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                  <LinkIcon className="w-3 h-3" />
                                  <span>Se podrán asociar registros existentes</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {formData.ModulosParaAsociar.length > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        {formData.ModulosParaAsociar.length} módulo(s) para asociar registros
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Campos */}
              <Card className="mb-4 border-2 dark:border-gray-700 dark:bg-gray-800">
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
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                      {campos.map((campo, index) => (
                        <Draggable key={campo.tempId} draggableId={campo.tempId} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border-2 rounded-lg p-4 transition-shadow ${
                                snapshot.isDragging 
                                  ? "shadow-lg border-blue-400 dark:border-blue-500" 
                                  : editingModuloId !== null && camposExistentes.has(campo.Nombre)
                                    ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10"
                                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                              }`}
                            >
                              {editingModuloId !== null && camposExistentes.has(campo.Nombre) && (
                                <div className="mb-2 text-xs text-green-700 dark:text-green-400 font-medium">
                                  ✓ Campo existente - Solo se puede editar: largo (texto), obligatorio, visible en grilla
                                </div>
                              )}
                              <div className="grid grid-cols-12 gap-3 items-start">
                                <div {...provided.dragHandleProps} className="col-span-1 flex items-center justify-center pt-8 cursor-move">
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
                                      disabled={!!(editingModuloId && camposExistentes.has(campo.Nombre))}
                                      required
                                    />
                                  </div>

                                  <div className="col-span-12 md:col-span-2">
                                    <Label className="text-xs dark:text-gray-300">Tipo <span className="text-red-500">*</span></Label>
                                    <select
                                      value={campo.TipoDato}
                                      onChange={(e) => updateCampo(index, "TipoDato", e.target.value as TipoDato)}
                                      className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={!!(editingModuloId && camposExistentes.has(campo.Nombre))}
                                    >
                                      <option value="IDInterno">ID Interno</option>
                                      <option value="Texto">Texto</option>
                                      <option value="Descripcion">Descripción</option>
                                      <option value="Numero">Número</option>
                                      <option value="Decimal">Decimal</option>
                                      <option value="Fecha">Fecha</option>
                                      <option value="FechaHora">Fecha y Hora</option>
                                      <option value="Lista">Lista</option>
                                      <option value="Archivo">Archivo</option>
                                    </select>
                                  </div>

                                  <div className="col-span-12 md:col-span-2">
                                    {campo.TipoDato === "Texto" && (
                                      <>
                                        <Label className="text-xs dark:text-gray-300">Largo</Label>
                                        <Input
                                          type="number"
                                          value={campo.Largo || 100}
                                          onChange={(e) => updateCampo(index, "Largo", parseInt(e.target.value) || 100)}
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
                                          value={campo.ListaId || ""}
                                          onChange={(e) => updateCampo(index, "ListaId", parseInt(e.target.value) || null)}
                                          className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
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
                                        onChange={(e) => updateCampo(index, "VisibleEnGrilla", e.target.checked)}
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

              {/* Botones de acción */}
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
                  <Save className="mr-2 h-4 w-4" /> 
                  {editingModuloId ? "Actualizar Módulo" : "Crear Módulo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
