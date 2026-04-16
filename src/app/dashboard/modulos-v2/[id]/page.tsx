"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Edit, Trash2, X, Eye, Search, ChevronLeft, ChevronRight, FileText, ArrowUpDown, ArrowUp, ArrowDown, Filter, FilterX, CheckSquare, Square } from "lucide-react";
import { Label } from "@/components/ui/label";

interface AdvancedFilter {
  id: string;
  moduloId: number; // ID del módulo (padre o hijo) al que pertenece el campo
  moduloNombre: string; // Nombre del módulo para mostrar
  campo: string;
  operador: "igual" | "contiene" | "noContiene" | "mayor" | "menor" | "mayorIgual" | "menorIgual" | "entre";
  valor: any;
  valorHasta?: any;
}

interface ModuloHijo {
  Id: number;
  Nombre: string;
  NombreTabla: string;
  Campos: Campo[];
}

interface CampoSistema {
  Nombre: string;
  TipoDato: string;
  Visible: boolean;
  ListaId?: number;
  ListaNombre?: string;
}

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
  MostrarEnMenu: boolean;
}

export default function ModuloDinamicoV2Page() {
  const params = useParams();
  const router = useRouter();
  const moduloId = params.id as string;
  const { toast } = useToast();
  const confirm = useConfirm();

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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [recordsPerPage, setRecordsPerPage] = useState(15);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
  const [initialFiltersApplied, setInitialFiltersApplied] = useState(false);
  const [camposSistema] = useState<CampoSistema[]>([
    { Nombre: "FechaCreacion", TipoDato: "FechaHora", Visible: true },
    { Nombre: "UsuarioCreacion", TipoDato: "Texto", Visible: true },
  ]);
  
  // Estado para permisos del usuario
  const [permisos, setPermisos] = useState<any>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [permisosTareas, setPermisosTareas] = useState({
    HabilitarTareas: false,
    PuedeCrearTareas: false,
  });

  // Estado para selección de registros para tareas
  const [registrosSeleccionados, setRegistrosSeleccionados] = useState<number[]>([]);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);

  // Estado para módulos hijos con permisos
  const [modulosHijos, setModulosHijos] = useState<ModuloHijo[]>([]);

  useEffect(() => {
    loadData();
    loadPermisosTareas();
  }, [moduloId]);

  // Limpiar selección cuando cambia el filtrado
  useEffect(() => {
    setRegistrosSeleccionados([]);
    setTodosSeleccionados(false);
  }, [registrosFiltrados]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Cargar permisos del usuario
      await loadPermisos();

      // Cargar datos del módulo - ENDPOINT V2
      const response = await fetch(`/api/modulos-v2/${moduloId}/datos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setModulo(data.data.modulo);
        setCampos(data.data.campos);
        setRegistros(data.data.registros);
        setRegistrosFiltrados(data.data.registros);

        // Cargar valores de listas
        const listasIds: number[] = data.data.campos
          .filter((c: Campo) => c.TipoDato === "Lista" && c.ListaId)
          .map((c: Campo) => c.ListaId!);

        if (listasIds.length > 0) {
          await loadValoresListas([...new Set(listasIds)]);
        }

        // Inicializar formData con valores por defecto
        const initialData: Record<string, any> = {};
        data.data.campos.forEach((campo: Campo) => {
          initialData[campo.Nombre] = "";
        });
        setFormData(initialData);

        // Cargar y aplicar configuración de vista (filtros iniciales)
        if (data.data.modulo.MostrarEnMenu && !initialFiltersApplied) {
          await loadAndApplyViewConfig(data.data.registros, data.data.campos);
        }

        // Cargar módulos hijos con permisos
        await loadModulosHijos();
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

  const loadPermisos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/me/permisos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setPermisos(data.data.permisos);
        setEsAdmin(data.data.esAdmin);
      }
    } catch (error) {
      console.error("Error cargando permisos:", error);
    }
  };

  const loadModulosHijos = async () => {
    try {
      const token = localStorage.getItem("token");
      // Obtener módulos relacionados con sus campos
      const response = await fetch(`/api/modulos-v2?id=${moduloId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success && data.data.ModulosSecundarios) {
        // Extraer solo módulos hijos (tipo "Hijo" en la relación)
        const hijos: ModuloHijo[] = data.data.ModulosSecundarios.map((m: any) => ({
          Id: m.Id,
          Nombre: m.Nombre,
          NombreTabla: m.NombreTabla,
          Campos: m.Campos || [],
        }));
        setModulosHijos(hijos);

        // Cargar valores de listas para los módulos hijos
        const listasIdsHijos: number[] = [];
        hijos.forEach((hijo: ModuloHijo) => {
          hijo.Campos.forEach((campo: Campo) => {
            if (campo.TipoDato === "Lista" && campo.ListaId) {
              listasIdsHijos.push(campo.ListaId);
            }
          });
        });

        if (listasIdsHijos.length > 0) {
          await loadValoresListas([...new Set(listasIdsHijos)]);
        }
      }
    } catch (error) {
      console.error("Error cargando módulos hijos:", error);
    }
  };

  const loadPermisosTareas = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      // Administrador siempre tiene permiso
      if (user.Roles?.includes("Administrador")) {
        setPermisosTareas({
          HabilitarTareas: true,
          PuedeCrearTareas: true,
        });
        return;
      }

      const response = await fetch("/api/permisos-tareas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setPermisosTareas({
          HabilitarTareas: data.data.HabilitarTareas,
          PuedeCrearTareas: data.data.PuedeCrearTareas,
        });
      }
    } catch (error) {
      console.error("Error cargando permisos de tareas:", error);
    }
  };

  const tienePermiso = (moduloId: number, tipoPermiso: 'ver' | 'agregar' | 'modificar' | 'eliminar', moduloPadreId?: number): boolean => {
    // Administradores tienen todos los permisos
    if (esAdmin) return true;
    
    if (!permisos) return false;
    
    // Buscar permiso específico
    const permiso = permisos.find((p: any) => 
      p.moduloId === moduloId && 
      (moduloPadreId === undefined || p.moduloPadreId === moduloPadreId)
    );
    
    if (!permiso) return false;
    
    switch (tipoPermiso) {
      case 'ver': return permiso.permisoVer;
      case 'agregar': return permiso.permisoAgregar;
      case 'modificar': return permiso.permisoModificar;
      case 'eliminar': return permiso.permisoEliminar;
      default: return false;
    }
  };

  const loadAndApplyViewConfig = async (registrosData: any[], camposData: Campo[]) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/module-view-config?moduloId=${moduloId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Si hay error de servidor (tabla no existe, etc.), simplemente continuar sin configuración
      if (!response.ok) {
        console.log("Configuración de vista no disponible, usando valores por defecto");
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data?.FiltrosIniciales && data.data.FiltrosIniciales.length > 0) {
        // Convertir filtros iniciales al formato de filtros avanzados
        const filtrosConvertidos = data.data.FiltrosIniciales.map((filtro: any) => ({
          id: `filtro-${Date.now()}-${Math.random()}`,
          moduloId: parseInt(moduloId), // Todos los filtros iniciales son del módulo padre
          moduloNombre: modulo?.Nombre || "",
          campo: filtro.campo,
          operador: filtro.operador === "=" ? "igual" : 
                    filtro.operador === "contiene" ? "contiene" :
                    filtro.operador === "noContiene" ? "noContiene" :
                    filtro.operador === ">" ? "mayor" :
                    filtro.operador === "<" ? "menor" :
                    filtro.operador === ">=" ? "mayorIgual" :
                    filtro.operador === "<=" ? "menorIgual" : "igual",
          valor: filtro.valor,
        }));
        
        setAdvancedFilters(filtrosConvertidos);
        setInitialFiltersApplied(true);
        setShowAdvancedSearch(true);
        
        // IMPORTANTE: Aplicar los filtros a la grilla usando los registros y campos pasados como parámetro
        await applyFiltersWithData("", filtrosConvertidos, registrosData, camposData);
        
        toast({
          title: "Filtros aplicados",
          description: `Se aplicaron ${filtrosConvertidos.length} filtro(s) inicial(es). Puedes modificarlos o quitarlos.`,
        });
      }
    } catch (error) {
      console.log("Configuración de vista no disponible:", error);
      // No mostrar error al usuario, solo continuar sin filtros iniciales
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

      // Guardar el registro - ENDPOINT V2
      const url = `/api/modulos-v2/${moduloId}/datos${editingId ? `/${editingId}` : ""}`;
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSave),
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
      let value = registro[campo.NombreColumna];
      
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
    const confirmed = await confirm({
      title: "¿Eliminar este registro?",
      description: "Se perderán todos los datos asociados. Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar"
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      // ENDPOINT V2
      const response = await fetch(`/api/modulos-v2/${moduloId}/datos/${id}`, {
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

  // Funciones para manejo de selección de registros
  const toggleSeleccionRegistro = (registroId: number) => {
    setRegistrosSeleccionados((prev) =>
      prev.includes(registroId)
        ? prev.filter((id) => id !== registroId)
        : [...prev, registroId]
    );
  };

  const toggleSeleccionTodos = () => {
    if (todosSeleccionados) {
      setRegistrosSeleccionados([]);
      setTodosSeleccionados(false);
    } else {
      const idsActuales = currentRecords.map((r) => r.Id);
      setRegistrosSeleccionados(idsActuales);
      setTodosSeleccionados(true);
    }
  };

  const agregarParaTarea = async () => {
    if (registrosSeleccionados.length === 0) {
      toast({
        title: "Aviso",
        description: "Selecciona al menos un registro",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tareas/temporal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ModuloId: parseInt(moduloId),
          RegistroIds: registrosSeleccionados,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Éxito",
          description: data.message || "Registros agregados para tarea",
        });
        
        // Limpiar selección
        setRegistrosSeleccionados([]);
        setTodosSeleccionados(false);

        // Disparar evento personalizado para actualizar contador
        window.dispatchEvent(new CustomEvent("registrosTemporalesActualizados"));
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al agregar registros",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al agregar registros para tarea",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    applyFilters(term, advancedFilters);
  };

  const applyFiltersWithData = async (searchTerm: string, filters: AdvancedFilter[], registrosData: any[], camposData: Campo[]) => {
    // Para filtros iniciales (que siempre son del módulo padre), aplicar lógica simple
    let filtered = [...registrosData];

    // Aplicar búsqueda simple
    if (searchTerm.trim()) {
      filtered = filtered.filter((registro) => {
        return camposData.some((campo) => {
          if (!campo.VisibleEnGrilla) return false;
          const value = registro[campo.NombreColumna];
          if (!value) return false;
          
          // Buscar en listas
          if (campo.TipoDato === "Lista" && campo.ListaId && valoresListas[campo.ListaId]) {
            const valorObj = valoresListas[campo.ListaId].find((v: any) => v.Id === parseInt(value));
            if (valorObj && valorObj.Valor.toLowerCase().includes(searchTerm.toLowerCase())) {
              return true;
            }
          }
          
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }

    // Aplicar filtros avanzados
    filters.forEach((filter) => {
      if (!filter.campo || !filter.operador) return;

      const campo = [...camposData, ...camposSistema].find(c => c.Nombre === filter.campo);
      if (!campo) return;

      filtered = filtered.filter((registro) => {
        // Para campos de usuario usar NombreColumna, para campos de sistema usar Nombre
        const campoUsuario = camposData.find(c => c.Nombre === filter.campo);
        const value = campoUsuario ? registro[campoUsuario.NombreColumna] : registro[filter.campo];
        
        if (campo.TipoDato === "Fecha" || campo.TipoDato === "FechaHora") {
          const recordDate = value ? new Date(value) : null;
          if (!recordDate) return false;
          
          switch (filter.operador) {
            case "igual":
              if (!filter.valor) return true;
              const targetDate = new Date(filter.valor);
              return recordDate.toDateString() === targetDate.toDateString();
            case "mayor":
              if (!filter.valor) return true;
              return recordDate > new Date(filter.valor);
            case "menor":
              if (!filter.valor) return true;
              return recordDate < new Date(filter.valor);
            case "mayorIgual":
              if (!filter.valor) return true;
              return recordDate >= new Date(filter.valor);
            case "menorIgual":
              if (!filter.valor) return true;
              return recordDate <= new Date(filter.valor);
            case "entre":
              if (!filter.valor || !filter.valorHasta) return true;
              const fromDate = new Date(filter.valor);
              const toDate = new Date(filter.valorHasta);
              toDate.setHours(23, 59, 59, 999);
              return recordDate >= fromDate && recordDate <= toDate;
            default:
              return true;
          }
        } else if (campo.TipoDato === "Numero" || campo.TipoDato === "IDInterno") {
          // Para IDInterno, el valor es registro.Id
          const numValue = campo.TipoDato === "IDInterno" ? registro.Id : parseFloat(value);
          if (isNaN(numValue)) return false;
          
          switch (filter.operador) {
            case "igual":
              return numValue === parseFloat(filter.valor);
            case "mayor":
              return numValue > parseFloat(filter.valor);
            case "menor":
              return numValue < parseFloat(filter.valor);
            case "mayorIgual":
              return numValue >= parseFloat(filter.valor);
            case "menorIgual":
              return numValue <= parseFloat(filter.valor);
            case "entre":
              return numValue >= parseFloat(filter.valor) && numValue <= parseFloat(filter.valorHasta);
            default:
              return true;
          }
        } else if (campo.TipoDato === "Lista") {
          if (filter.operador === "igual") {
            return value == filter.valor;
          }
          return true;
        } else {
          // Texto, Descripcion
          const strValue = String(value || "").toLowerCase();
          const filterValue = String(filter.valor || "").toLowerCase();
          
          switch (filter.operador) {
            case "igual":
              return strValue === filterValue;
            case "contiene":
              return strValue.includes(filterValue);
            case "noContiene":
              return !strValue.includes(filterValue);
            default:
              return true;
          }
        }
      });
    });
    
    setRegistrosFiltrados(filtered);
  };

  const applyFilters = async (searchTerm: string, filters: AdvancedFilter[]) => {
    // Verificar si hay filtros de módulos hijos
    const tieneFiltrosHijos = filters.some(f => f.moduloId !== modulo?.Id);
    
    // Si hay filtros de módulos hijos, usar el endpoint de búsqueda avanzada
    if (tieneFiltrosHijos || (filters.length > 0 && filters.some(f => f.campo && f.valor))) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/modulos-v2/${moduloId}/busqueda-avanzada`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filters: filters.filter(f => f.campo && f.valor),
            searchTerm: searchTerm
          })
        });

        const data = await response.json();
        if (data.success) {
          setRegistrosFiltrados(data.data.registros);
          return;
        } else {
          toast({
            title: "Error",
            description: data.error || "Error al aplicar filtros",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error aplicando filtros:", error);
        toast({
          title: "Error",
          description: "Error al aplicar filtros",
          variant: "destructive",
        });
      }
      return;
    }

    // Lógica de filtrado en cliente (solo para módulo padre sin filtros avanzados)
    let filtered = [...registros];

    // Aplicar búsqueda simple
    if (searchTerm.trim()) {
      filtered = filtered.filter((registro) => {
        return campos.some((campo) => {
          if (!campo.VisibleEnGrilla) return false;
          const value = registro[campo.NombreColumna];
          if (!value) return false;
          
          // Buscar en listas
          if (campo.TipoDato === "Lista" && campo.ListaId && valoresListas[campo.ListaId]) {
            const valorObj = valoresListas[campo.ListaId].find((v: any) => v.Id === parseInt(value));
            if (valorObj && valorObj.Valor.toLowerCase().includes(searchTerm.toLowerCase())) {
              return true;
            }
          }
          
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
    }

    setRegistrosFiltrados(filtered);
  };

  const addFilter = () => {
    if (!modulo) return;
    
    const newFilter: AdvancedFilter = {
      id: crypto.randomUUID(),
      moduloId: modulo.Id,
      moduloNombre: modulo.Nombre,
      campo: "",
      operador: "igual",
      valor: "",
    };
    setAdvancedFilters([...advancedFilters, newFilter]);
  };

  const removeFilter = (id: string) => {
    const newFilters = advancedFilters.filter(f => f.id !== id);
    setAdvancedFilters(newFilters);
    setCurrentPage(1);
    applyFilters(searchTerm, newFilters);
  };

  const updateFilter = (id: string, updates: Partial<AdvancedFilter>) => {
    const newFilters = advancedFilters.map(f => {
      if (f.id === id) {
        const updatedFilter = { ...f, ...updates };
        // Si cambia el módulo, resetear campo y valor
        if (updates.moduloId !== undefined && updates.moduloId !== f.moduloId) {
          updatedFilter.campo = "";
          updatedFilter.valor = "";
          updatedFilter.valorHasta = undefined;
        }
        // Si cambia el campo, resetear valor
        if (updates.campo !== undefined && updates.campo !== f.campo) {
          updatedFilter.valor = "";
          updatedFilter.valorHasta = undefined;
        }
        return updatedFilter;
      }
      return f;
    });
    setAdvancedFilters(newFilters);
    setCurrentPage(1);
    applyFilters(searchTerm, newFilters);
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters([]);
    setCurrentPage(1);
    applyFilters(searchTerm, []);
  };

  const hasActiveFilters = () => {
    return advancedFilters.some(f => f.campo && f.valor);
  };

  const getOperadoresPorTipo = (tipoDato: string) => {
    switch (tipoDato) {
      case "Fecha":
      case "FechaHora":
        return [
          { value: "igual", label: "Igual a" },
          { value: "mayor", label: "Después de" },
          { value: "menor", label: "Antes de" },
          { value: "mayorIgual", label: "Desde" },
          { value: "menorIgual", label: "Hasta" },
          { value: "entre", label: "Entre" },
        ];
      case "Numero":
      case "IDInterno":
        return [
          { value: "igual", label: "Igual a" },
          { value: "mayor", label: "Mayor que" },
          { value: "menor", label: "Menor que" },
          { value: "mayorIgual", label: "Mayor o igual a" },
          { value: "menorIgual", label: "Menor o igual a" },
          { value: "entre", label: "Entre" },
        ];
      case "Lista":
        return [
          { value: "igual", label: "Igual a" },
        ];
      default: // Texto, Descripcion
        return [
          { value: "igual", label: "Igual a" },
          { value: "contiene", label: "Contiene" },
          { value: "noContiene", label: "No contiene" },
        ];
    }
  };

  const getModulosDisponibles = () => {
    if (!modulo) return [];
    
    const modulos: { id: number; nombre: string }[] = [
      { id: modulo.Id, nombre: modulo.Nombre }
    ];
    
    modulosHijos.forEach(hijo => {
      modulos.push({ id: hijo.Id, nombre: hijo.Nombre });
    });
    
    return modulos;
  };

  const getCamposDisponibles = (moduloId?: number) => {
    // Si no se especifica módulo, usar el módulo padre
    const targetModuloId = moduloId || modulo?.Id;
    
    if (!targetModuloId) return [];
    
    // Si es el módulo padre
    if (targetModuloId === modulo?.Id) {
      const camposUsuario = campos.filter(c => c.TipoDato !== "Archivo");
      const todosCampos = [...camposUsuario, ...camposSistema];
      
      // Eliminar duplicados por nombre (mantener primera ocurrencia)
      const camposUnicos = todosCampos.filter((campo, index, self) =>
        index === self.findIndex((c) => c.Nombre === campo.Nombre)
      );
      
      return camposUnicos;
    }
    
    // Si es un módulo hijo
    const moduloHijo = modulosHijos.find(m => m.Id === targetModuloId);
    if (moduloHijo) {
      return moduloHijo.Campos.filter(c => c.TipoDato !== "Archivo");
    }
    
    return [];
  };

  const handleSort = (columnName: string) => {
    let direction: "asc" | "desc" = "asc";
    
    if (sortColumn === columnName && sortDirection === "asc") {
      direction = "desc";
    }
    
    setSortColumn(columnName);
    setSortDirection(direction);
    
    // Encontrar el campo para usar NombreColumna
    const campo = campos.find(c => c.Nombre === columnName);
    const columnaKey = campo ? campo.NombreColumna : columnName;
    
    const sorted = [...registrosFiltrados].sort((a, b) => {
      const aValue = a[columnaKey];
      const bValue = b[columnaKey];
      
      // Manejar valores nulos
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      // Comparar valores
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (direction === "asc") {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
    
    setRegistrosFiltrados(sorted);
  };

  const renderInput = (campo: Campo) => {
    const value = formData[campo.Nombre] || "";

    switch (campo.TipoDato) {
      case "Texto":
        return (
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            maxLength={campo.Largo || undefined}
            required={campo.Obligatorio}
          />
        );

      case "Descripcion":
        return (
          <textarea
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );

      case "Decimal":
        return (
          <input
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );

      case "Fecha":
        return (
          <input
            type="date"
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );

      case "FechaHora":
        return (
          <input
            type="datetime-local"
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );

      case "Lista":
        const valores = campo.ListaId ? valoresListas[campo.ListaId] || [] : [];
        return (
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Archivo actual: {value}
              </div>
            )}
            {archivos[campo.Nombre] && (
              <div className="text-sm text-green-600 dark:text-green-400">
                Nuevo archivo: {archivos[campo.Nombre].name}
              </div>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => setFormData({ ...formData, [campo.Nombre]: e.target.value })}
            required={campo.Obligatorio}
          />
        );
    }
  };

  const renderCellValue = (campo: Campo, registro: any) => {
    const value = registro[campo.NombreColumna];

    if (value === null || value === undefined || value === "") return "-";

    switch (campo.TipoDato) {
      case "IDInterno":
        // Para IDInterno, NombreColumna es 'Id', mostrar el valor del Id del registro
        return registro.Id || "-";
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
              Ver Archivo
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
        <div className="text-lg dark:text-white">Cargando...</div>
      </div>
    );
  }

  if (!modulo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500 dark:text-red-400">Módulo no encontrado</div>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{modulo.Nombre}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de {modulo.Nombre.toLowerCase()}</p>
        </div>
        {tienePermiso(parseInt(moduloId), 'agregar') && (
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo
          </Button>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md dark:shadow-gray-900/50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder={`Buscar en ${modulo.Nombre.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>
          <Button
            variant={showAdvancedSearch ? "default" : "outline"}
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Búsqueda Avanzada
          </Button>
          {hasActiveFilters() && (
            <Button
              variant="ghost"
              onClick={clearAdvancedFilters}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400"
            >
              <FilterX className="h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>
        {(searchTerm || hasActiveFilters()) && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {registrosFiltrados.length} resultado{registrosFiltrados.length !== 1 ? 's' : ''} encontrado{registrosFiltrados.length !== 1 ? 's' : ''}
            {hasActiveFilters() && ` (con filtros avanzados)`}
          </div>
        )}
        
        {/* Panel de búsqueda avanzada */}
        {showAdvancedSearch && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtros Avanzados</h3>
              <Button
                size="sm"
                onClick={addFilter}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Filtro
              </Button>
            </div>
            
            {advancedFilters.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay filtros agregados</p>
                <p className="text-xs mt-1">Haz clic en "Agregar Filtro" para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {advancedFilters.map((filter, index) => {
                  const campo = getCamposDisponibles(filter.moduloId).find(c => c.Nombre === filter.campo);
                  const operadores = campo ? getOperadoresPorTipo(campo.TipoDato) : [];
                  const modulosDisponibles = getModulosDisponibles();
                  
                  return (
                    <div key={filter.id} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                        {/* Selector de Módulo */}
                        <div className="md:col-span-3">
                          <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Módulo</Label>
                          <select
                            value={filter.moduloId}
                            onChange={(e) => {
                              const selectedModuloId = parseInt(e.target.value);
                              const selectedModulo = modulosDisponibles.find(m => m.id === selectedModuloId);
                              updateFilter(filter.id, { 
                                moduloId: selectedModuloId,
                                moduloNombre: selectedModulo?.nombre || "",
                                campo: "",
                                operador: "igual",
                                valor: "",
                                valorHasta: undefined
                              });
                            }}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 dark:bg-gray-600 dark:text-white"
                          >
                            {modulosDisponibles.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selector de Campo */}
                        <div className="md:col-span-3">
                          <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Campo</Label>
                          <select
                            value={filter.campo}
                            onChange={(e) => {
                              updateFilter(filter.id, { 
                                campo: e.target.value,
                                operador: "igual",
                                valor: "",
                                valorHasta: undefined
                              });
                            }}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 dark:bg-gray-600 dark:text-white"
                          >
                            <option value="">Seleccionar campo...</option>
                            {getCamposDisponibles(filter.moduloId).map((c) => (
                              <option key={c.Nombre} value={c.Nombre}>
                                {c.Nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Selector de Operador */}
                        {filter.campo && (
                          <div className="md:col-span-2">
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Condición</Label>
                            <select
                              value={filter.operador}
                              onChange={(e) => updateFilter(filter.id, { operador: e.target.value as any })}
                              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 dark:bg-gray-600 dark:text-white"
                            >
                              {operadores.map((op) => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        {/* Campo(s) de Valor */}
                        {filter.campo && campo && (
                          <div className={filter.operador === "entre" ? "md:col-span-3" : "md:col-span-4"}>
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1">Valor</Label>
                            <div className="flex gap-2">
                              {/* Valor principal o "desde" para operador "entre" */}
                              {campo.TipoDato === "Lista" ? (
                                <select
                                  value={filter.valor || ""}
                                  onChange={(e) => updateFilter(filter.id, { valor: e.target.value })}
                                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 dark:bg-gray-600 dark:text-white"
                                >
                                  <option value="">Seleccionar...</option>
                                  {campo.ListaId && valoresListas[campo.ListaId]?.map((valor: any) => (
                                    <option key={valor.Id} value={valor.Id}>
                                      {valor.Valor}
                                    </option>
                                  ))}
                                </select>
                              ) : (campo.TipoDato === "Fecha" || campo.TipoDato === "FechaHora") ? (
                                <>
                                  <Input
                                    type="date"
                                    value={filter.valor || ""}
                                    onChange={(e) => updateFilter(filter.id, { valor: e.target.value })}
                                    className="text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                    placeholder={filter.operador === "entre" ? "Desde" : "Fecha"}
                                  />
                                  {filter.operador === "entre" && (
                                    <Input
                                      type="date"
                                      value={filter.valorHasta || ""}
                                      onChange={(e) => updateFilter(filter.id, { valorHasta: e.target.value })}
                                      className="text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                      placeholder="Hasta"
                                    />
                                  )}
                                </>
                              ) : campo.TipoDato === "Numero" ? (
                                <>
                                  <Input
                                    type="number"
                                    value={filter.valor || ""}
                                    onChange={(e) => updateFilter(filter.id, { valor: e.target.value })}
                                    className="text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                    placeholder={filter.operador === "entre" ? "Desde" : "Valor"}
                                  />
                                  {filter.operador === "entre" && (
                                    <Input
                                      type="number"
                                      value={filter.valorHasta || ""}
                                      onChange={(e) => updateFilter(filter.id, { valorHasta: e.target.value })}
                                      className="text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                      placeholder="Hasta"
                                    />
                                  )}
                                </>
                              ) : (
                                <Input
                                  type="text"
                                  value={filter.valor || ""}
                                  onChange={(e) => updateFilter(filter.id, { valor: e.target.value })}
                                  className="text-sm dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                  placeholder="Valor..."
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Botón Eliminar */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilter(filter.id)}
                        className="mt-5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md dark:shadow-gray-900/50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white">
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
                .filter((c) => c.Visible && c.TipoDato !== "IDInterno")
                .map((campo) => (
                  <div key={campo.Id}>
                    <Label htmlFor={campo.Nombre} className="dark:text-gray-300">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {/* Columna de selección - Solo visible si puede crear tareas */}
                {permisosTareas.HabilitarTareas && permisosTareas.PuedeCrearTareas && (
                  <th className="px-4 py-3 text-center">
                    <button
                      onClick={toggleSeleccionTodos}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      type="button"
                      title={todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
                    >
                      {todosSeleccionados ? (
                        <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </th>
                )}
                {camposVisiblesGrilla.map((campo) => (
                  <th
                    key={campo.Id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort(campo.Nombre)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{campo.Nombre}</span>
                      {sortColumn === campo.Nombre ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {registrosFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan={camposVisiblesGrilla.length + 1}
                    className="px-6 py-4 text-center text-gray-500 dark:text-gray-400"
                  >
                    {searchTerm 
                      ? `No se encontraron resultados para "${searchTerm}"`
                      : "No hay registros. Haz clic en \"Nuevo\" para agregar el primero."}
                  </td>
                </tr>
              ) : (
                currentRecords.map((registro) => (
                  <tr key={registro.Id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    {/* Columna de selección - Solo visible si puede crear tareas */}
                    {permisosTareas.HabilitarTareas && permisosTareas.PuedeCrearTareas && (
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => toggleSeleccionRegistro(registro.Id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          type="button"
                        >
                          {registrosSeleccionados.includes(registro.Id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                    )}
                    {camposVisiblesGrilla.map((campo) => (
                      <td key={campo.Id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {renderCellValue(campo, registro)}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/dashboard/modulos-v2/${moduloId}/${registro.Id}`)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {tienePermiso(parseInt(moduloId), 'modificar') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(registro)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {tienePermiso(parseInt(moduloId), 'eliminar') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(registro.Id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Botón Agregar para Tarea */}
        {registrosSeleccionados.length > 0 && permisosTareas.HabilitarTareas && permisosTareas.PuedeCrearTareas && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">{registrosSeleccionados.length}</span> registro{registrosSeleccionados.length !== 1 ? "s" : ""} seleccionado{registrosSeleccionados.length !== 1 ? "s" : ""}
              </span>
              <Button
                onClick={agregarParaTarea}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar para Tarea
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Paginación */}
      {registrosFiltrados.length > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-md dark:shadow-gray-900/50">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <label className="mr-2">Registros por página:</label>
              <select
                value={recordsPerPage}
                onChange={(e) => {
                  setRecordsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 dark:bg-gray-700 dark:text-white"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
            Mostrando <span className="font-medium">{indexOfFirstRecord + 1}</span> a{" "}
            <span className="font-medium">
              {Math.min(indexOfLastRecord, registrosFiltrados.length)}
            </span>{" "}
            de <span className="font-medium">{registrosFiltrados.length}</span> registros
            </div>
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
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Total de registros: {registros.length}
        {searchTerm && ` (${registrosFiltrados.length} filtrado${registrosFiltrados.length !== 1 ? 's' : ''})`}
      </div>
    </div>
  );
}
