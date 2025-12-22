"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { usePermisos } from "@/hooks/usePermisos";
import { Plus, Edit, Trash2, X, Eye, Search, ChevronLeft, ChevronRight, FileText, ArrowUpDown, ArrowUp, ArrowDown, Filter, FilterX } from "lucide-react";
import { Label } from "@/components/ui/label";

interface AdvancedFilter {
  id: string;
  campo: string;
  operador: "igual" | "contiene" | "noContiene" | "mayor" | "menor" | "mayorIgual" | "menorIgual" | "entre";
  valor: any;
  valorHasta?: any;
}

interface CampoSistema {
  Nombre: string;
  TipoDato: string;
  Visible: boolean;
}

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
  const confirm = useConfirm();
  const permisos = usePermisos(moduloId);

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
  const [camposSistema] = useState<CampoSistema[]>([
    { Nombre: "FechaCreacion", TipoDato: "FechaHora", Visible: true },
    { Nombre: "UsuarioCreacion", TipoDato: "Texto", Visible: true },
  ]);

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
    const confirmed = await confirm({
      title: "¿Eliminar este registro?",
      description: "Se perderán todos los datos asociados. Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar"
    });
    if (!confirmed) return;

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
    applyFilters(term, advancedFilters);
  };

  const applyFilters = (searchTerm: string, filters: AdvancedFilter[]) => {
    let filtered = [...registros];

    // Aplicar búsqueda simple
    if (searchTerm.trim()) {
      filtered = filtered.filter((registro) => {
        return campos.some((campo) => {
          if (!campo.VisibleEnGrilla) return false;
          const value = registro[campo.Nombre];
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

      const campo = [...campos, ...camposSistema].find(c => c.Nombre === filter.campo);
      if (!campo) return;

      filtered = filtered.filter((registro) => {
        const value = registro[filter.campo];
        
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
        } else if (campo.TipoDato === "Numero") {
          const numValue = parseFloat(value);
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

  const addFilter = () => {
    const newFilter: AdvancedFilter = {
      id: crypto.randomUUID(),
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
    const newFilters = advancedFilters.map(f => 
      f.id === id ? { ...f, ...updates } : f
    );
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

  const getCamposDisponibles = () => {
    // Incluir todos los campos excepto los de tipo Archivo
    const camposUsuario = campos.filter(c => c.TipoDato !== "Archivo");
    return [...camposUsuario, ...camposSistema];
  };

  const handleSort = (columnName: string) => {
    let direction: "asc" | "desc" = "asc";
    
    if (sortColumn === columnName && sortDirection === "asc") {
      direction = "desc";
    }
    
    setSortColumn(columnName);
    setSortDirection(direction);
    
    const sorted = [...registrosFiltrados].sort((a, b) => {
      const aValue = a[columnName];
      const bValue = b[columnName];
      
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
        <div className="flex gap-2">
          {modulo.Tipo === "Principal" && permisos.verAgrupado && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/modulos/${moduloId}/agrupado`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Vista Agrupada
            </Button>
          )}
          {permisos.agregar && (
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
                  const campo = getCamposDisponibles().find(c => c.Nombre === filter.campo);
                  const operadores = campo ? getOperadoresPorTipo(campo.TipoDato) : [];
                  
                  return (
                    <div key={filter.id} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                        {/* Selector de Campo */}
                        <div className="md:col-span-4">
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
                            <optgroup label="Campos del módulo">
                              {campos.filter(c => c.TipoDato !== "Archivo").map((c) => (
                                <option key={c.Id} value={c.Nombre}>
                                  {c.Nombre}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Campos del sistema">
                              {camposSistema.map((c) => (
                                <option key={c.Nombre} value={c.Nombre}>
                                  {c.Nombre}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                        
                        {/* Selector de Operador */}
                        {filter.campo && (
                          <div className="md:col-span-3">
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
                          <div className={filter.operador === "entre" ? "md:col-span-4" : "md:col-span-5"}>
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
                .filter((c) => c.Visible)
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
                          onClick={() => router.push(`/dashboard/modulos/${moduloId}/${registro.Id}`)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {permisos.modificar && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(registro)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {permisos.eliminar && (
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
