"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { ArrowLeft, Plus, Edit, Trash2, X, FileText, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight, Eye, Layers } from "lucide-react";
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
  MostrarEnMenu: boolean;
}

interface ModuloSecundario extends Modulo {
  Campos: Campo[];
}

interface ModuloAsociacion extends Modulo {
  Campos: Campo[];
  TipoRelacion: 'Asociar';
}

export default function DetalleRegistroV2Page() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduloId = params.id as string;
  const registroId = params.registroId as string;
  const { toast } = useToast();
  const confirm = useConfirm();

  // Parámetros de retorno para navegación
  const returnTo = searchParams.get('returnTo');
  const returnId = searchParams.get('returnId');

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [registro, setRegistro] = useState<any>(null);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [modulosSecundarios, setModulosSecundarios] = useState<ModuloSecundario[]>([]);
  const [modulosParaAsociar, setModulosParaAsociar] = useState<ModuloAsociacion[]>([]); // Nuevo: módulos para asociar registros
  const [registrosSecundarios, setRegistrosSecundarios] = useState<Record<number, any[]>>({});
  const [registrosAsociados, setRegistrosAsociados] = useState<Record<number, any[]>>({}); // Nuevo: registros asociados
  const [registrosSecundariosFiltrados, setRegistrosSecundariosFiltrados] = useState<Record<number, any[]>>({});
  const [registrosAsociadosFiltrados, setRegistrosAsociadosFiltrados] = useState<Record<number, any[]>>({}); // Nuevo
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [searchTermsAsociados, setSearchTermsAsociados] = useState<Record<number, string>>({}); // Nuevo
  const [valoresListas, setValoresListas] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  
  // Modal de asociación
  const [showAsociarModal, setShowAsociarModal] = useState<number | null>(null);
  const [busquedaAsociar, setBusquedaAsociar] = useState('');
  const [registrosDisponibles, setRegistrosDisponibles] = useState<any[]>([]);
  const [loadingDisponibles, setLoadingDisponibles] = useState(false);
  
  // Estado para controlar módulos secundarios expandidos/colapsados
  const [expandedModulos, setExpandedModulos] = useState<Record<number, boolean>>({});
  const [sortColumns, setSortColumns] = useState<Record<number, string | null>>({});
  const [sortDirections, setSortDirections] = useState<Record<number, "asc" | "desc">>({});
  
  // Estado para paginación de módulos secundarios
  const [currentPages, setCurrentPages] = useState<Record<number, number>>({});
  const [recordsPerPages, setRecordsPerPages] = useState<Record<number, number>>({});
  
  // Estado para formularios de módulos secundarios
  const [showSecundarioForm, setShowSecundarioForm] = useState<number | null>(null);
  const [editingSecundarioId, setEditingSecundarioId] = useState<number | null>(null);
  const [secundarioFormData, setSecundarioFormData] = useState<Record<string, any>>({});
  const [archivosSecundarios, setArchivosSecundarios] = useState<Record<string, File>>({});
  const [uploadingFiles, setUploadingFiles] = useState(false);  
  // Estado para visualización de detalle
  const [viewingSecundario, setViewingSecundario] = useState<{ moduloId: number; registro: any } | null>(null);
  
  // Estado para relaciones inversas (donde este registro está asociado)
  const [showRelacionesInversas, setShowRelacionesInversas] = useState(false);
  const [relacionesInversas, setRelacionesInversas] = useState<any[]>([]);
  const [loadingRelacionesInversas, setLoadingRelacionesInversas] = useState(false);
  
  // Estado para permisos del usuario
  const [permisos, setPermisos] = useState<any>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  
  // Estado para configuración de vista
  const [tituloPersonalizado, setTituloPersonalizado] = useState<string | null>(null);
  const [numeroColumnas, setNumeroColumnas] = useState(2);

  useEffect(() => {
    loadData();
  }, [moduloId, registroId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Cargar permisos del usuario
      const { permisos: permisosUsuario, esAdmin: esAdminUsuario } = await loadPermisos();

      // Cargar módulo con sus campos - ENDPOINT V2
      const moduloResponse = await fetch(`/api/modulos-v2?id=${moduloId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const moduloData = await moduloResponse.json();
      
      if (moduloData.success) {
        setModulo(moduloData.data);
        setCampos(moduloData.data.Campos || []);
        
        // La API ya filtró los módulos según permisos del usuario
        // No necesitamos filtrar nuevamente aquí
        setModulosSecundarios(moduloData.data.ModulosSecundarios || []);
        setModulosParaAsociar(moduloData.data.ModulosParaAsociar || []);
      }

      // Variable para el registro actual
      let registroActual = null;

      // Cargar datos del registro principal - ENDPOINT V2
      const datosResponse = await fetch(`/api/modulos-v2/${moduloId}/datos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const datosData = await datosResponse.json();
      
      if (datosData.success) {
        registroActual = datosData.data.registros.find((r: any) => r.Id === parseInt(registroId));
        setRegistro(registroActual);
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

      // Cargar registros asociados de módulos para asociar
      if (moduloData.data.ModulosParaAsociar && moduloData.data.ModulosParaAsociar.length > 0) {
        for (const modAsoc of moduloData.data.ModulosParaAsociar) {
          await loadRegistrosAsociados(modAsoc.Id);
          
          // Cargar valores de listas para módulo asociado
          const listasAsocIds = (modAsoc.Campos || [])
            .filter((c: Campo) => c.TipoDato === "Lista" && c.ListaId)
            .map((c: Campo) => c.ListaId);
          
          if (listasAsocIds.length > 0) {
            await loadValoresListas([...new Set(listasAsocIds)]);
          }
        }
      }

      // IMPORTANTE: Cargar configuración de vista AL FINAL, después de tener todos los datos
      // Esto asegura que los valores de listas estén disponibles para generar el título
      if (moduloData.data.MostrarEnMenu && registroActual) {
        await loadViewConfig(registroActual, moduloData.data.Campos || []);
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
      const valoresNuevos: Record<number, any[]> = {};

      for (const listaId of listasIds) {
        const response = await fetch(`/api/listas/${listaId}/valores`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) {
          valoresNuevos[listaId] = data.data;
        }
      }

      setValoresListas(prev => ({ ...prev, ...valoresNuevos }));
    } catch (error) {
      console.error("Error cargando valores de listas:", error);
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
        return { permisos: data.data.permisos, esAdmin: data.data.esAdmin };
      }
      return { permisos: null, esAdmin: false };
    } catch (error) {
      console.error("Error cargando permisos:", error);
      return { permisos: null, esAdmin: false };
    }
  };

  const loadViewConfig = async (registroActual: any, camposData: Campo[]) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/module-view-config?moduloId=${moduloId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Si hay error de servidor (tabla no existe, etc.), simplemente usar valores por defecto
      if (!response.ok) {
        console.log("Configuración de vista no disponible, usando valores por defecto");
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Aplicar número de columnas
        if (data.data.NumeroColumnas) {
          setNumeroColumnas(data.data.NumeroColumnas);
        }
        
        // Generar título personalizado usando los campos pasados como parámetro
        if (data.data.ConfigTitulo && data.data.ConfigTitulo.campos.length > 0 && registroActual) {
          const titulo = generarTituloPersonalizadoConCampos(
            data.data.ConfigTitulo.campos,
            data.data.ConfigTitulo.separador || " ",
            registroActual,
            camposData
          );
          
          setTituloPersonalizado(titulo);
        }
      }
    } catch (error) {
      console.log("Configuración de vista no disponible:", error);
      // No mostrar error al usuario, usar valores por defecto
    }
  };

  const generarTituloPersonalizado = (camposTitulo: string[], separador: string, registroData: any): string => {
    return generarTituloPersonalizadoConCampos(camposTitulo, separador, registroData, campos);
  };

  const generarTituloPersonalizadoConCampos = (camposTitulo: string[], separador: string, registroData: any, camposData: Campo[]): string => {
    const valores = camposTitulo.map(nombreCampo => {
      const campo = camposData.find(c => c.Nombre === nombreCampo);
      if (!campo) {
        return "";
      }
      
      const valor = registroData[campo.NombreColumna];
      if (!valor) {
        return "";
      }
      
      // Formatear según el tipo de dato
      switch (campo.TipoDato) {
        case "Fecha":
          return new Date(valor).toLocaleDateString("es-AR");
        case "FechaHora":
          return new Date(valor).toLocaleString("es-AR");
        case "Lista":
          if (campo.ListaId && valoresListas[campo.ListaId]) {
            const valorNumerico = typeof valor === 'string' ? parseInt(valor) : valor;
            const valorObj = valoresListas[campo.ListaId].find((v: any) => v.Id === valorNumerico);
            return valorObj ? valorObj.Valor : valor;
          }
          return valor;
        default:
          return valor;
      }
    }).filter(v => v); // Filtrar valores vacíos
    
    return valores.join(separador);
  };

  const tienePermiso = (moduloId: number, tipoPermiso: 'ver' | 'agregar' | 'modificar' | 'eliminar' | 'verAgrupado' | 'verRelacionado', moduloPadreId?: number): boolean => {
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
      case 'verAgrupado': return permiso.permisoVerAgrupado;
      case 'verRelacionado': return permiso.permisoVerRelacionado;
      default: return false;
    }
  };

  const loadRelacionesInversas = async () => {
    try {
      setLoadingRelacionesInversas(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/modulos-v2/${moduloId}/datos/${registroId}/relaciones-inversas`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.success) {
        setRelacionesInversas(data.data || []);
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al cargar relaciones",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error cargando relaciones inversas:", error);
      toast({
        title: "Error",
        description: "Error al cargar relaciones",
        variant: "destructive",
      });
    } finally {
      setLoadingRelacionesInversas(false);
    }
  };

  const loadRegistrosSecundarios = async (moduloSecId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/modulos-v2/${moduloSecId}/datos?parentId=${registroId}&parentModuloId=${moduloId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.success) {
        setRegistrosSecundarios(prev => ({
          ...prev,
          [moduloSecId]: data.data.registros,
        }));
        setRegistrosSecundariosFiltrados(prev => ({
          ...prev,
          [moduloSecId]: data.data.registros,
        }));
      }
    } catch (error) {
      console.error("Error cargando registros secundarios:", error);
    }
  };

  // ============================================
  // FUNCIONES PARA ASOCIACIÓN DE REGISTROS
  // ============================================

  const loadRegistrosAsociados = async (moduloAsocId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/modulos-v2/${moduloId}/datos/${registroId}/asociaciones?moduloAsociadoId=${moduloAsocId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.success) {
        setRegistrosAsociados(prev => ({
          ...prev,
          [moduloAsocId]: data.data.registros,
        }));
        setRegistrosAsociadosFiltrados(prev => ({
          ...prev,
          [moduloAsocId]: data.data.registros,
        }));
      }
    } catch (error) {
      console.error("Error cargando registros asociados:", error);
    }
  };

  const loadRegistrosDisponibles = async (moduloAsocId: number, busqueda: string) => {
    try {
      setLoadingDisponibles(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/modulos-v2/${moduloAsocId}/datos/disponibles?busqueda=${encodeURIComponent(busqueda)}&registroPadreId=${registroId}&moduloPadreId=${moduloId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      
      if (data.success) {
        setRegistrosDisponibles(data.data.registros);
      }
    } catch (error) {
      console.error("Error cargando registros disponibles:", error);
      toast({
        title: "Error",
        description: "Error al buscar registros",
        variant: "destructive",
      });
    } finally {
      setLoadingDisponibles(false);
    }
  };

  const handleAsociarRegistro = async (moduloAsocId: number, registroAsociadoId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/modulos-v2/${moduloId}/datos/${registroId}/asociaciones`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            moduloAsociadoId: moduloAsocId,
            registroAsociadoId,
          }),
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Éxito",
          description: "Registro asociado correctamente",
        });
        // Recargar registros asociados
        await loadRegistrosAsociados(moduloAsocId);
        // Cerrar modal y recargar disponibles
        setShowAsociarModal(null);
        setBusquedaAsociar('');
        setRegistrosDisponibles([]);
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al asociar registro",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error asociando registro:", error);
      toast({
        title: "Error",
        description: "Error al asociar registro",
        variant: "destructive",
      });
    }
  };

  const handleDesasociarRegistro = async (moduloAsocId: number, relacionId: number) => {
    const confirmed = await confirm({
      title: "¿Desasociar registro?",
      description: "Esta acción eliminará la asociación entre estos registros.",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/modulos-v2/${moduloId}/datos/${registroId}/asociaciones?relacionId=${relacionId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Éxito",
          description: "Registro desasociado correctamente",
        });
        // Recargar registros asociados
        await loadRegistrosAsociados(moduloAsocId);
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al desasociar registro",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error desasociando registro:", error);
      toast({
        title: "Error",
        description: "Error al desasociar registro",
        variant: "destructive",
      });
    }
  };

  const handleSearchAsociados = (moduloAsocId: number, term: string, campos: Campo[], registros: any[]) => {
    setSearchTermsAsociados(prev => ({ ...prev, [moduloAsocId]: term }));
    
    if (!term.trim()) {
      setRegistrosAsociadosFiltrados(prev => ({
        ...prev,
        [moduloAsocId]: registros,
      }));
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
        
        return value.toString().toLowerCase().includes(term.toLowerCase());
      });
    });

    setRegistrosAsociadosFiltrados(prev => ({
      ...prev,
      [moduloAsocId]: filtered,
    }));
  };

  // ============================================
  // FIN FUNCIONES ASOCIACIÓN
  // ============================================

  const handleSearchSecundario = (moduloSecId: number, term: string, campos: Campo[], registros: any[]) => {
    setSearchTerms(prev => ({ ...prev, [moduloSecId]: term }));
    setCurrentPages(prev => ({ ...prev, [moduloSecId]: 1 }));
    
    if (!term.trim()) {
      setRegistrosSecundariosFiltrados(prev => ({
        ...prev,
        [moduloSecId]: registros,
      }));
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
    
    setRegistrosSecundariosFiltrados(prev => ({
      ...prev,
      [moduloSecId]: filtered,
    }));
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

      // Para PUT incluir el ID en la URL, para POST solo la ruta base
      const url = editingSecundarioId 
        ? `/api/modulos-v2/${moduloSecId}/datos/${editingSecundarioId}`
        : `/api/modulos-v2/${moduloSecId}/datos`;
      const method = editingSecundarioId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
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
      let value = registro[campo.NombreColumna];
      
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

  const handleViewSecundario = (moduloSecId: number, registro: any) => {
    setViewingSecundario({ moduloId: moduloSecId, registro });
  };

  const handleDeleteSecundario = async (moduloSecId: number, id: number) => {
    const moduloSec = modulosSecundarios.find(m => m.Id === moduloSecId);
    const nombreModulo = moduloSec?.Nombre || 'registro';
    
    const confirmed = await confirm({
      title: `¿Eliminar este ${nombreModulo.toLowerCase()}?`,
      description: "Se perderán todos los datos asociados. Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      cancelText: "Cancelar"
    });
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/modulos-v2/${moduloSecId}/datos?registroId=${id}`, {
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

  const toggleModuloSecundario = (moduloId: number) => {
    setExpandedModulos((prev) => ({
      ...prev,
      [moduloId]: !prev[moduloId],
    }));
  };

  const handleSortSecundario = (moduloId: number, columnName: string, registros: any[]) => {
    let direction: "asc" | "desc" = "asc";
    
    if (sortColumns[moduloId] === columnName && sortDirections[moduloId] === "asc") {
      direction = "desc";
    }
    
    setSortColumns((prev) => ({ ...prev, [moduloId]: columnName }));
    setSortDirections((prev) => ({ ...prev, [moduloId]: direction }));
    
    const sorted = [...registros].sort((a, b) => {
      const aValue = a[columnName];
      const bValue = b[columnName];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
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
    
    setRegistrosSecundariosFiltrados((prev) => ({
      ...prev,
      [moduloId]: sorted,
    }));
  };

  const renderInput = (campo: Campo, value: any, onChange: (name: string, value: any) => void) => {
    switch (campo.TipoDato) {
      case "Texto":
        return (
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
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
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
            required={campo.Obligatorio}
          />
        );

      case "Numero":
        return (
          <input
            type="number"
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
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
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
            required={campo.Obligatorio}
          />
        );

      case "Fecha":
        return (
          <input
            type="date"
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
            required={campo.Obligatorio}
          />
        );

      case "FechaHora":
        return (
          <input
            type="datetime-local"
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={value}
            onChange={(e) => onChange(campo.Nombre, e.target.value)}
            required={campo.Obligatorio}
          />
        );

      case "Lista":
        const valores = campo.ListaId ? valoresListas[campo.ListaId] || [] : [];
        return (
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              className="w-full border border-gray-300 rounded-md px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Archivo actual: {value}
              </div>
            )}
            {archivosSecundarios[campo.Nombre] && (
              <div className="text-sm text-green-600 dark:text-green-400">
                Nuevo archivo: {archivosSecundarios[campo.Nombre].name}
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
        <div className="text-lg dark:text-white">Cargando...</div>
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
            onClick={() => {
              // Si viene de una tarea, regresar a ella
              if (returnTo === 'tarea' && returnId) {
                router.push(`/dashboard/tarea/${returnId}`);
              } else {
                router.back();
              }
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {tituloPersonalizado || (
                campos.find(c => c.VisibleEnGrilla)?.NombreColumna 
                  ? registro[campos.find(c => c.VisibleEnGrilla)!.NombreColumna]
                  : `Registro #${registroId}`
              )}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Detalle de {modulo.Nombre.toLowerCase()}</p>
            {registro && (
              <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                {registro.FechaCreacion && (
                  <span>
                    <strong>Creado:</strong> {new Date(registro.FechaCreacion).toLocaleString('es-AR')}
                  </span>
                )}
                {registro.UsuarioCreacion && (
                  <span>
                    <strong>Por:</strong> {registro.UsuarioCreacion}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {modulosSecundarios.length > 0 && tienePermiso(parseInt(moduloId), 'verAgrupado') && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/modulos-v2/${moduloId}/${registroId}/agrupado`)}
            >
              <Layers className="mr-2 h-4 w-4" />
              Vista Agrupada
            </Button>
          )}
          {tienePermiso(parseInt(moduloId), 'verRelacionado') && (
            <Button
              variant="outline"
              onClick={() => {
                loadRelacionesInversas();
                setShowRelacionesInversas(true);
              }}
            >
              <Layers className="mr-2 h-4 w-4" />
              Ver Relaciones
            </Button>
          )}
        </div>
      </div>

      {/* Información del registro principal */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Información General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-4 ${
            numeroColumnas === 1 ? "grid-cols-1" :
            numeroColumnas === 2 ? "grid-cols-1 md:grid-cols-2" :
            numeroColumnas === 3 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}>
            {campos.map((campo) => (
              <div key={campo.Id}>
                <Label className="text-gray-600 dark:text-gray-400">{campo.Nombre}</Label>
                <div className="mt-1 text-gray-900 dark:text-gray-100 font-medium">
                  {renderCellValue(campo, registro[campo.NombreColumna])}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Módulos secundarios */}
      {modulosSecundarios && modulosSecundarios.length > 0 && modulosSecundarios.map((moduloSec) => {
        const registros = registrosSecundarios[moduloSec.Id] || [];
        const registrosFiltrados = registrosSecundariosFiltrados[moduloSec.Id] || registros;
        const searchTerm = searchTerms[moduloSec.Id] || "";
        const camposVisiblesGrilla = (moduloSec.Campos || []).filter((c) => c.VisibleEnGrilla);
        const isExpanded = expandedModulos[moduloSec.Id] || false;
        
        // Paginación
        const currentPage = currentPages[moduloSec.Id] || 1;
        const recordsPerPage = recordsPerPages[moduloSec.Id] || 15;
        const indexOfLastRecord = currentPage * recordsPerPage;
        const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
        const currentRecords = registrosFiltrados.slice(indexOfFirstRecord, indexOfLastRecord);
        const totalPages = Math.ceil(registrosFiltrados.length / recordsPerPage);

        return (
          <Card key={moduloSec.Id} className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => toggleModuloSecundario(moduloSec.Id)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ChevronDown 
                    className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                  <CardTitle className="dark:text-white">{moduloSec.Nombre}</CardTitle>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({registros.length})
                  </span>
                </div>
                {isExpanded && tienePermiso(moduloSec.Id, 'agregar', parseInt(moduloId)) && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetSecundarioForm(moduloSec.Campos);
                      setShowSecundarioForm(moduloSec.Id);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                )}
              </div>
            </CardHeader>
            {isExpanded && (
            <CardContent>
              {/* Barra de búsqueda */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    placeholder={`Buscar en ${moduloSec.Nombre.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => handleSearchSecundario(moduloSec.Id, e.target.value, moduloSec.Campos, registros)}
                    className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
                {searchTerm && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {registrosFiltrados.length} resultado{registrosFiltrados.length !== 1 ? 's' : ''} encontrado{registrosFiltrados.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Formulario */}
              {showSecundarioForm === moduloSec.Id && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold dark:text-white">
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
                          <Label htmlFor={campo.Nombre} className="dark:text-gray-300">
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
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {camposVisiblesGrilla.map((campo) => (
                        <th
                          key={campo.Id}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => handleSortSecundario(moduloSec.Id, campo.NombreColumna, registrosFiltrados)}
                        >
                          <div className="flex items-center gap-2">
                            <span>{campo.Nombre}</span>
                            {sortColumns[moduloSec.Id] === campo.NombreColumna ? (
                              sortDirections[moduloSec.Id] === "asc" ? (
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
                            : "No hay registros. Haz clic en \"Agregar\" para crear el primero."}
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((reg) => (
                        <tr key={reg.Id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          {camposVisiblesGrilla.map((campo) => (
                            <td key={campo.Id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {renderCellValue(campo, reg[campo.NombreColumna])}
                            </td>
                          ))}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewSecundario(moduloSec.Id, reg)}
                                title="Ver detalle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {tienePermiso(moduloSec.Id, 'modificar', parseInt(moduloId)) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditSecundario(moduloSec.Id, reg)}
                                  title="Editar"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {tienePermiso(moduloSec.Id, 'eliminar', parseInt(moduloId)) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSecundario(moduloSec.Id, reg.Id)}
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
              
              {/* Paginación y contador */}
              {registrosFiltrados.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        <label className="mr-2">Registros por página:</label>
                        <select
                          value={recordsPerPage}
                          onChange={(e) => {
                            setRecordsPerPages(prev => ({ ...prev, [moduloSec.Id]: Number(e.target.value) }));
                            setCurrentPages(prev => ({ ...prev, [moduloSec.Id]: 1 }));
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
                        {searchTerm && ` (filtrados de ${registros.length})`}
                      </div>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPages(prev => ({ ...prev, [moduloSec.Id]: currentPage - 1 }))}
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
                                onClick={() => setCurrentPages(prev => ({ ...prev, [moduloSec.Id]: page }))}
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
                          onClick={() => setCurrentPages(prev => ({ ...prev, [moduloSec.Id]: currentPage + 1 }))}
                          disabled={currentPage === totalPages}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            )}
          </Card>
        );
      })}

      {/* Módulos para Asociar Registros */}
      {modulosParaAsociar && modulosParaAsociar.length > 0 && modulosParaAsociar.map((moduloAsoc) => {
        const registros = registrosAsociados[moduloAsoc.Id] || [];
        const registrosFiltrados = registrosAsociadosFiltrados[moduloAsoc.Id] || registros;
        const searchTerm = searchTermsAsociados[moduloAsoc.Id] || "";
        const camposVisiblesGrilla = (moduloAsoc.Campos || []).filter((c) => c.VisibleEnGrilla);
        const isExpanded = expandedModulos[moduloAsoc.Id] || false;
        
        return (
          <Card key={moduloAsoc.Id} className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-l-green-500">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => setExpandedModulos(prev => ({ ...prev, [moduloAsoc.Id]: !isExpanded }))}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronDown 
                    className={`h-5 w-5 transition-transform text-green-600 dark:text-green-400 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                  <CardTitle className="dark:text-white flex items-center gap-2">
                    {moduloAsoc.Nombre}
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                      Asociación de registros
                    </span>
                  </CardTitle>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({registros.length})
                  </span>
                </div>
                {isExpanded && tienePermiso(moduloAsoc.Id, 'agregar', parseInt(moduloId)) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAsociarModal(moduloAsoc.Id);
                      setBusquedaAsociar('');
                      setRegistrosDisponibles([]);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Asociar Registro
                  </Button>
                )}
              </div>
            </CardHeader>
            {isExpanded && (
            <CardContent>
              {/* Barra de búsqueda */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    placeholder={`Buscar en ${moduloAsoc.Nombre.toLowerCase()}...`}
                    value={searchTerm}
                    onChange={(e) => handleSearchAsociados(moduloAsoc.Id, e.target.value, moduloAsoc.Campos, registros)}
                    className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
                {searchTerm && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {registrosFiltrados.length} resultado{registrosFiltrados.length !== 1 ? 's' : ''} encontrado{registrosFiltrados.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Tabla de registros asociados */}
              {registrosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No hay registros asociados</p>
                  {tienePermiso(moduloAsoc.Id, 'agregar', parseInt(moduloId)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400"
                      onClick={() => {
                        setShowAsociarModal(moduloAsoc.Id);
                        setBusquedaAsociar('');
                        setRegistrosDisponibles([]);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Asociar primer registro
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          {camposVisiblesGrilla.map((campo) => (
                            <th
                              key={campo.Id}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                            >
                              {campo.Nombre}
                            </th>
                          ))}
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {registrosFiltrados.map((registro, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            {camposVisiblesGrilla.map((campo) => (
                              <td key={campo.Id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                {renderCellValue(campo, registro[campo.NombreColumna])}
                              </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/dashboard/modulos-v2/${moduloAsoc.Id}/${registro.Id}`)}
                                  title="Ver detalle"
                                >
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                                {tienePermiso(moduloAsoc.Id, 'eliminar', parseInt(moduloId)) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDesasociarRegistro(moduloAsoc.Id, registro.RelacionId)}
                                    title="Quitar asociación"
                                  >
                                    <X className="h-4 w-4 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
            )}
          </Card>
        );
      })}

      {/* Modal de asociación de registros */}
      {showAsociarModal !== null && (() => {
        const moduloAsoc = modulosParaAsociar.find(m => m.Id === showAsociarModal);
        if (!moduloAsoc) return null;

        const camposVisiblesGrilla = (moduloAsoc.Campos || []).filter((c) => c.VisibleEnGrilla);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-bold dark:text-white">Asociar {moduloAsoc.Nombre}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Busca y selecciona un registro para asociar
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowAsociarModal(null);
                    setBusquedaAsociar('');
                    setRegistrosDisponibles([]);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Búsqueda */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        type="text"
                        placeholder={`Buscar ${moduloAsoc.Nombre.toLowerCase()}...`}
                        value={busquedaAsociar}
                        onChange={(e) => setBusquedaAsociar(e.target.value)}
                        className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <Button
                      onClick={() => loadRegistrosDisponibles(moduloAsoc.Id, busquedaAsociar)}
                      disabled={loadingDisponibles}
                    >
                      {loadingDisponibles ? 'Buscando...' : 'Buscar'}
                    </Button>
                  </div>
                </div>

                {/* Resultados */}
                {registrosDisponibles.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Search className="mx-auto h-12 w-12 mb-4 text-gray-300 dark:text-gray-600" />
                    <p>Utiliza el buscador para encontrar registros</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            {camposVisiblesGrilla.map((campo) => (
                              <th
                                key={campo.Id}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                              >
                                {campo.Nombre}
                              </th>
                            ))}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {registrosDisponibles.map((registro) => (
                            <tr key={registro.Id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              {camposVisiblesGrilla.map((campo) => (
                                <td key={campo.Id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {renderCellValue(campo, registro[campo.NombreColumna])}
                                </td>
                              ))}
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-500 text-green-600 hover:bg-green-50 dark:border-green-600 dark:text-green-400"
                                  onClick={() => handleAsociarRegistro(moduloAsoc.Id, registro.Id)}
                                >
                                  Asociar
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {registrosDisponibles.length > 0 && (
                      <div className="bg-gray-100 dark:bg-gray-800 px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {registrosDisponibles.length} registro{registrosDisponibles.length !== 1 ? 's' : ''} disponible{registrosDisponibles.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de visualización de detalle */}
      {viewingSecundario && (() => {
        const moduloSec = modulosSecundarios.find(m => m.Id === viewingSecundario.moduloId);
        if (!moduloSec) return null;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                <div>
                  <h3 className="text-xl font-semibold dark:text-white">
                    Detalle de {moduloSec.Nombre.slice(0, -1) || moduloSec.Nombre}
                  </h3>
                  {viewingSecundario.registro && (
                    <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {viewingSecundario.registro.FechaCreacion && (
                        <span>
                          <strong>Creado:</strong> {new Date(viewingSecundario.registro.FechaCreacion).toLocaleString('es-AR')}
                        </span>
                      )}
                      {viewingSecundario.registro.UsuarioCreacion && (
                        <span>
                          <strong>Por:</strong> {viewingSecundario.registro.UsuarioCreacion}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingSecundario(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moduloSec.Campos.map((campo) => (
                    <div key={campo.Id} className="space-y-1">
                      <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {campo.Nombre}
                      </Label>
                      <div className="text-base text-gray-900 dark:text-gray-100 font-medium">
                        {renderCellValue(campo, viewingSecundario.registro[campo.NombreColumna])}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 p-6 border-t dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setViewingSecundario(null)}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    handleEditSecundario(viewingSecundario.moduloId, viewingSecundario.registro);
                    setViewingSecundario(null);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Relaciones Inversas */}
      {showRelacionesInversas && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-2xl font-bold dark:text-white">Relaciones del Registro</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRelacionesInversas(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingRelacionesInversas ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-lg dark:text-white">Cargando relaciones...</div>
                </div>
              ) : relacionesInversas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                      No hay relaciones registradas
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Este registro no está asociado a ningún módulo
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {relacionesInversas.map((relacion: any) => (
                    <Card key={relacion.moduloId} className="dark:bg-gray-900 dark:border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-lg dark:text-white flex items-center gap-2">
                          <div className="w-1 h-6 bg-purple-500 rounded"></div>
                          {relacion.moduloNombre}
                          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                            ({relacion.registros.length} registro{relacion.registros.length !== 1 ? 's' : ''})
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {relacion.registros.length > 0 ? (
                          <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-100 dark:bg-gray-800">
                                  <tr>
                                    {relacion.campos.map((campo: Campo) => (
                                      <th
                                        key={campo.Id}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                                      >
                                        {campo.Nombre}
                                      </th>
                                    ))}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                      Fecha Asociación
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                      Acción
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {relacion.registros.map((registro: any) => (
                                    <tr key={registro.Id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                      {relacion.campos.map((campo: Campo) => (
                                        <td key={campo.Id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                          {renderCellValue(campo, registro[campo.NombreColumna])}
                                        </td>
                                      ))}
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                        {registro.FechaAsociacion 
                                          ? new Date(registro.FechaAsociacion).toLocaleString('es-AR')
                                          : '-'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setShowRelacionesInversas(false);
                                            router.push(`/dashboard/modulos-v2/${relacion.moduloId}/${registro.Id}`);
                                          }}
                                        >
                                          <Eye className="h-4 w-4 mr-1" />
                                          Ver Detalle
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                            No hay registros asociados de este módulo
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-6 border-t dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowRelacionesInversas(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
