"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  User,
  Calendar,
  FileText,
  MessageSquare,
  History as HistoryIcon
} from "lucide-react";

interface Tarea {
  TareaId: number;
  PlantillaTareaId: number;
  PlantillaNombre: string;
  Instrucciones: string;
  TipoAsignacion: string;
  UsuarioAsignadoId?: number;
  UsuarioAsignadoNombre?: string;
  BandejaAsignadaId?: number;
  BandejaAsignadaNombre?: string;
  UsuarioCreacion: string;
  FechaCreacion: string;
  FechaVencimiento?: string;
  Estado: string;
  Observaciones?: string;
  UsuarioTomadaPorId?: number;
  TomoNombre?: string;
  FechaTomada?: string;
  FechaCompletado?: string;
  FechaRechazo?: string;
  ModuloId?: number;
  ModuloNombre?: string;
  ModuloNombreTabla?: string;
}

interface Registro {
  TareaRegistroId: number;
  RegistroId: number;
  ModuloId: number;
  Estado: string;
  ObservacionesRegistro?: string;
  ModuloNombre: string;
  ModuloNombreTabla: string;
}

interface Campo {
  Id: number;
  ModuloId: number;
  Nombre: string;
  NombreColumna: string;
  TipoDato: string;
  ListaId?: number;
  VisibleEnGrilla: boolean;
  Orden: number;
}

interface ValorLista {
  Id: number;
  ListaId: number;
  Valor: string;
  ListaNombre: string;
}

interface HistorialItem {
  HistorialId: number;
  TareaId: number;
  UsuarioId: number;
  UsuarioNombre: string;
  Accion: string;
  Detalle: string;
  FechaHora: string;
}

interface Comentario {
  ComentarioId: number;
  TareaId: number;
  UsuarioId: number;
  UsuarioNombre: string;
  Comentario: string;
  FechaHora: string;
}

export default function TareaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tareaId = params?.id as string;
  const modoConsulta = searchParams?.get("modo") === "consulta";
  const { toast } = useToast();

  const [tarea, setTarea] = useState<Tarea | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [camposModulo, setCamposModulo] = useState<Campo[]>([]);
  const [datosRegistros, setDatosRegistros] = useState<any[]>([]);
  const [valoresListas, setValoresListas] = useState<ValorLista[]>([]);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [ultimoComentario, setUltimoComentario] = useState<Comentario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("informacion");

  // Estados para diálogos
  const [showCompletarDialog, setShowCompletarDialog] = useState(false);
  const [showRechazarDialog, setShowRechazarDialog] = useState(false);
  const [showReasignarDialog, setShowReasignarDialog] = useState(false);
  const [comentarioCompletar, setComentarioCompletar] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [procesando, setProcesando] = useState(false);
  
  // Estados para reasignación
  const [tipoReasignacion, setTipoReasignacion] = useState<'Usuario' | 'Bandeja'>('Usuario');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [bandejas, setBandejas] = useState<any[]>([]);
  const [destinatarioSeleccionado, setDestinatarioSeleccionado] = useState<string>("");

  useEffect(() => {
    if (tareaId) {
      cargarTarea();
    }
  }, [tareaId]);

  useEffect(() => {
    if (!tareaId) return;
    
    if (activeTab === "historial") {
      cargarHistorial();
    } else if (activeTab === "comentarios") {
      cargarComentarios();
    }
  }, [activeTab, tareaId]);

  const cargarTarea = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/${tareaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al cargar la tarea");
      }

      const data = await response.json();
      setTarea(data.data.tarea);
      setRegistros(data.data.registros || []);
      setCamposModulo(data.data.camposModulo || []);
      setDatosRegistros(data.data.datosRegistros || []);
      setValoresListas(data.data.valoresListas || []);
      
      // Cargar último comentario
      await cargarUltimoComentario();
    } catch (err: any) {
      setError(err.message);
      console.error("Error al cargar tarea:", err);
    } finally {
      setLoading(false);
    }
  };

  const cargarHistorial = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/${tareaId}/historial`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error("Error al cargar historial");
      }

      const data = await response.json();
      setHistorial(data.data || []);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    }
  };

  const cargarComentarios = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/${tareaId}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error("Error al cargar comentarios");
      }

      const data = await response.json();
      setComentarios(data.data || []);
    } catch (err) {
      console.error("Error al cargar comentarios:", err);
    }
  };

  const cargarUltimoComentario = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/${tareaId}/comentarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        // Los comentarios vienen ordenados por FechaHora DESC, el primero es el más reciente
        setUltimoComentario(data.data[0]);
      }
    } catch (err) {
      console.error("Error al cargar último comentario:", err);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/usuarios?soloHabilitadosParaTareas=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      const usuariosActivos = (data.data || []).filter((u: any) => u.Estado === 'Activo');
      setUsuarios(usuariosActivos);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
    }
  };

  const cargarBandejas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/bandejas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error("Error al cargar bandejas");
      }

      const data = await response.json();
      const bandejasActivas = (data.data || []).filter((b: any) => b.Estado === 'Activa');
      setBandejas(bandejasActivas);
    } catch (err) {
      console.error("Error al cargar bandejas:", err);
    }
  };

  const abrirDialogReasignar = async () => {
    setShowReasignarDialog(true);
    setTipoReasignacion('Usuario');
    setDestinatarioSeleccionado("");
    await Promise.all([cargarUsuarios(), cargarBandejas()]);
  };

  const handleTomarTarea = async () => {
    try {
      setProcesando(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/${tareaId}/tomar`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Error al tomar la tarea");
      }

      toast({
        title: "Éxito",
        description: "Tarea tomada exitosamente",
      });
      await cargarTarea();
      await cargarHistorial();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleCompletarTarea = async () => {
    try {
      setProcesando(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/${tareaId}/completar`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comentario: comentarioCompletar }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Error al completar la tarea");
      }

      toast({
        title: "Éxito",
        description: "Tarea completada exitosamente",
      });
      setShowCompletarDialog(false);
      setComentarioCompletar("");
      await cargarTarea();
      await cargarHistorial();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazarTarea = async () => {
    if (!motivoRechazo.trim()) {
      toast({
        title: "Advertencia",
        description: "Debe ingresar un motivo para rechazar la tarea",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcesando(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/${tareaId}/rechazar`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ motivo: motivoRechazo }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Error al rechazar la tarea");
      }

      toast({
        title: "Éxito",
        description: "Tarea rechazada exitosamente",
      });
      setShowRechazarDialog(false);
      setMotivoRechazo("");
      await cargarTarea();
      await cargarHistorial();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleAgregarComentario = async () => {
    if (!nuevoComentario.trim()) {
      return;
    }

    try {
      setProcesando(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/${tareaId}/comentarios`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comentario: nuevoComentario }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Error al agregar comentario");
      }

      setNuevoComentario("");
      await cargarComentarios();
      await cargarUltimoComentario();
      await cargarHistorial(); // Recargar historial para mostrar el nuevo registro
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleActualizarRegistro = async (tareaRegistroId: number, estado: string, observaciones: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/${tareaId}/registro/${tareaRegistroId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado, observaciones }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Error al actualizar registro");
      }

      // Actualizar el estado local
      setRegistros(prev => prev.map(r => 
        r.TareaRegistroId === tareaRegistroId 
          ? { ...r, Estado: estado, ObservacionesRegistro: observaciones }
          : r
      ));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleReasignar = async () => {
    if (!destinatarioSeleccionado) {
      toast({
        title: "Advertencia",
        description: "Debe seleccionar un destinatario",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcesando(true);
      const token = localStorage.getItem("token");
      
      // Obtener nombre del destinatario
      let destinatarioNombre = "";
      if (tipoReasignacion === 'Usuario') {
        const usuario = usuarios.find(u => u.Id === parseInt(destinatarioSeleccionado));
        destinatarioNombre = usuario?.Nombre || "";
      } else {
        const bandeja = bandejas.find(b => b.Id === parseInt(destinatarioSeleccionado));
        destinatarioNombre = bandeja?.Nombre || "";
      }
      
      const response = await fetch(`/api/tareas/${tareaId}/reasignar`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          tipoAsignacion: tipoReasignacion,
          usuarioId: tipoReasignacion === 'Usuario' ? parseInt(destinatarioSeleccionado) : null,
          bandejaId: tipoReasignacion === 'Bandeja' ? parseInt(destinatarioSeleccionado) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Error al reasignar la tarea");
      }

      toast({
        title: "Éxito",
        description: `Tarea reasignada exitosamente a ${tipoReasignacion}: ${destinatarioNombre}`,
      });
      setShowReasignarDialog(false);
      setDestinatarioSeleccionado("");
      
      // Navegar de vuelta a Mis Tareas después de reasignar
      router.push('/dashboard/mis-tareas');
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const formatearFecha = (fecha: string | undefined) => {
    if (!fecha) return "-";
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      Pendiente: { variant: "secondary" as const, icon: Clock, color: "text-yellow-600" },
      Tomada: { variant: "default" as const, icon: AlertCircle, color: "text-blue-600" },
      Completada: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      Rechazada: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
    };

    const badge = badges[estado as keyof typeof badges] || badges.Pendiente;
    const Icon = badge.icon;

    return (
      <Badge variant={badge.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {estado}
      </Badge>
    );
  };

  const getAccionIcon = (accion: string) => {
    switch (accion) {
      case "Crear":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "Tomar":
        return <User className="h-4 w-4 text-purple-600" />;
      case "Completar":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Rechazar":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "Reasignar":
        return <User className="h-4 w-4 text-orange-600" />;
      default:
        return <HistoryIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tarea...</p>
        </div>
      </div>
    );
  }

  if (error || !tarea) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar la tarea</h3>
              <p className="text-muted-foreground mb-4">{error || "Tarea no encontrada"}</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Tarea #{tarea.TareaId}</h1>
            <p className="text-muted-foreground">{tarea.PlantillaNombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getEstadoBadge(tarea.Estado)}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="informacion">
            <FileText className="mr-2 h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="comentarios">
            <MessageSquare className="mr-2 h-4 w-4" />
            Comentarios
          </TabsTrigger>
          <TabsTrigger value="historial">
            <HistoryIcon className="mr-2 h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Tab: Información */}
        <TabsContent value="informacion" className="space-y-6">
          {/* Grid de 4 cuadrantes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información General */}
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Plantilla</Label>
                  <p className="font-medium">{tarea.PlantillaNombre}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Estado</Label>
                  <div className="mt-1">{getEstadoBadge(tarea.Estado)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Creada por</Label>
                  <p className="font-medium">{tarea.UsuarioCreacion}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha creación</Label>
                  <p className="font-medium">{formatearFecha(tarea.FechaCreacion)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Asignada a</Label>
                  <p className="font-medium">
                    {tarea.TipoAsignacion === "Usuario" 
                      ? tarea.UsuarioAsignadoNombre 
                      : tarea.BandejaAsignadaNombre}
                  </p>
                </div>
                {tarea.FechaVencimiento && (
                  <div>
                    <Label className="text-muted-foreground">Fecha vencimiento</Label>
                    <p className="font-medium">{formatearFecha(tarea.FechaVencimiento)}</p>
                  </div>
                )}
                {tarea.TomoNombre && (
                  <div>
                    <Label className="text-muted-foreground">Tomada por</Label>
                    <p className="font-medium">{tarea.TomoNombre}</p>
                  </div>
                )}
                {tarea.FechaTomada && (
                  <div>
                    <Label className="text-muted-foreground">Fecha toma</Label>
                    <p className="font-medium">{formatearFecha(tarea.FechaTomada)}</p>
                  </div>
                )}
                {tarea.FechaCompletado && (
                  <div>
                    <Label className="text-muted-foreground">Fecha completado</Label>
                    <p className="font-medium">{formatearFecha(tarea.FechaCompletado)}</p>
                  </div>
                )}
                {tarea.FechaRechazo && (
                  <div>
                    <Label className="text-muted-foreground">Fecha rechazo</Label>
                    <p className="font-medium">{formatearFecha(tarea.FechaRechazo)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instrucciones */}
            <Card>
              <CardHeader>
                <CardTitle>Instrucciones</CardTitle>
              </CardHeader>
              <CardContent>
                {tarea.Instrucciones ? (
                  <p className="whitespace-pre-wrap">{tarea.Instrucciones}</p>
                ) : (
                  <p className="text-muted-foreground italic">Sin instrucciones</p>
                )}
              </CardContent>
            </Card>

            {/* Observaciones */}
            <Card>
              <CardHeader>
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                {tarea.Observaciones ? (
                  <p className="whitespace-pre-wrap">{tarea.Observaciones}</p>
                ) : (
                  <p className="text-muted-foreground italic">Sin observaciones</p>
                )}
              </CardContent>
            </Card>

            {/* Último Comentario */}
            <Card>
              <CardHeader>
                <CardTitle>Último Comentario</CardTitle>
              </CardHeader>
              <CardContent>
                {ultimoComentario ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{ultimoComentario.UsuarioNombre}</span>
                      <span className="text-muted-foreground">
                        {formatearFecha(ultimoComentario.FechaHora)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{ultimoComentario.Comentario}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Sin comentarios</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Registros Asociados */}
          {registros.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Registros Asociados{registros[0]?.ModuloNombre ? ` de ${registros[0].ModuloNombre}` : ''} ({registros.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {camposModulo.map((campo) => (
                          <th
                            key={campo.Id}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                          >
                            {campo.Nombre}
                          </th>
                        ))}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Estado Tarea
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Observaciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {registros.map((registro) => {
                        const datosRegistro = datosRegistros.find((d) => d.Id === registro.RegistroId);
                        return (
                          <tr 
                            key={registro.TareaRegistroId}
                            onClick={() => {
                              // Navegar al detalle del registro con parámetro de retorno
                              router.push(`/dashboard/modulos-v2/${registro.ModuloId}/${registro.RegistroId}?returnTo=tarea&returnId=${tareaId}`);
                            }}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          >
                            {camposModulo.map((campo) => {
                              let valor = datosRegistro ? datosRegistro[campo.NombreColumna] : null;
                              
                              // Mostrar valores de lista
                              if (valor && campo.TipoDato === 'Lista' && campo.ListaId) {
                                const valorLista = valoresListas.find(
                                  (v) => v.ListaId === campo.ListaId && v.Id === valor
                                );
                                if (valorLista) {
                                  valor = valorLista.Valor;
                                }
                              }
                              
                              // Formatear fechas
                              if (valor && (campo.TipoDato === 'Fecha' || campo.TipoDato === 'FechaHora')) {
                                const fecha = new Date(valor);
                                if (campo.TipoDato === 'Fecha') {
                                  valor = fecha.toLocaleDateString('es-ES', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric' 
                                  });
                                } else {
                                  valor = fecha.toLocaleString('es-ES', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                }
                              }
                              
                              return (
                                <td
                                  key={campo.Id}
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                >
                                  {valor || '-'}
                                </td>
                              );
                            })}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={registro.Estado}
                                onChange={(e) => handleActualizarRegistro(
                                  registro.TareaRegistroId, 
                                  e.target.value, 
                                  registro.ObservacionesRegistro || ''
                                )}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Completada">Completada</option>
                                <option value="Rechazada">Rechazada</option>
                              </select>
                            </td>
                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                              <Input
                                type="text"
                                value={registro.ObservacionesRegistro || ''}
                                onChange={(e) => setRegistros(prev => prev.map(r => 
                                  r.TareaRegistroId === registro.TareaRegistroId 
                                    ? { ...r, ObservacionesRegistro: e.target.value }
                                    : r
                                ))}
                                onBlur={() => handleActualizarRegistro(
                                  registro.TareaRegistroId, 
                                  registro.Estado, 
                                  registro.ObservacionesRegistro || ''
                                )}
                                placeholder="Observaciones..."
                                className="text-sm"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Comentarios */}
        <TabsContent value="comentarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agregar Comentario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Escribe un comentario..."
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={handleAgregarComentario} 
                disabled={procesando || !nuevoComentario.trim()}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Agregar Comentario
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comentarios</CardTitle>
            </CardHeader>
            <CardContent>
              {comentarios.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay comentarios todavía
                </p>
              ) : (
                <div className="space-y-4">
                  {comentarios.map((comentario) => (
                    <div key={comentario.ComentarioId} className="border-l-4 border-primary pl-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{comentario.UsuarioNombre}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatearFecha(comentario.FechaHora)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comentario.Comentario}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Acciones</CardTitle>
              <CardDescription>
                Registro completo de todas las acciones realizadas sobre esta tarea
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historial.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay historial disponible
                </p>
              ) : (
                <div className="space-y-4">
                  {historial.map((item) => (
                    <div 
                      key={item.HistorialId} 
                      className="flex gap-4 border-l-2 border-primary pl-4 pb-4"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getAccionIcon(item.Accion)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-semibold">{item.Accion}</span>
                            <span className="text-muted-foreground ml-2">
                              por {item.UsuarioNombre}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatearFecha(item.FechaHora)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.Detalle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botones de acción */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            {/* Botón Tomar: solo para bandejas grupales en estado Pendiente (NO en modo consulta) */}
            {!modoConsulta && tarea.Estado === "Pendiente" && tarea.TipoAsignacion === "Bandeja" && (
              <Button onClick={handleTomarTarea} disabled={procesando}>
                <User className="mr-2 h-4 w-4" />
                Tomar Tarea
              </Button>
            )}
            
            {/* Botones Completar/Rechazar: para tareas Tomadas O para tareas de Usuario en Pendiente */}
            {(tarea.Estado === "Tomada" || (tarea.Estado === "Pendiente" && tarea.TipoAsignacion === "Usuario")) && (
              <>
                <Button 
                  onClick={() => setShowCompletarDialog(true)} 
                  disabled={procesando}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completar
                </Button>
                <Button 
                  onClick={() => setShowRechazarDialog(true)} 
                  disabled={procesando}
                  variant="destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
              </>
            )}
            
            {/* Botón Reasignar: disponible si no está Completada o Rechazada */}
            {tarea.Estado !== "Completada" && tarea.Estado !== "Rechazada" && (
              <Button 
                onClick={abrirDialogReasignar} 
                disabled={procesando}
                variant="outline"
              >
                <User className="mr-2 h-4 w-4" />
                Reasignar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Completar Tarea */}
      <Dialog open={showCompletarDialog} onOpenChange={setShowCompletarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Tarea</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas marcar esta tarea como completada?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="comentario-completar">Comentario (opcional)</Label>
              <Textarea
                id="comentario-completar"
                placeholder="Agrega un comentario sobre la completación..."
                value={comentarioCompletar}
                onChange={(e) => setComentarioCompletar(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCompletarDialog(false)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCompletarTarea}
              disabled={procesando}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Completar Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rechazar Tarea */}
      <Dialog open={showRechazarDialog} onOpenChange={setShowRechazarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Tarea</DialogTitle>
            <DialogDescription>
              Indica el motivo por el cual rechazas esta tarea
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="motivo-rechazo">Motivo *</Label>
              <Textarea
                id="motivo-rechazo"
                placeholder="Describe el motivo del rechazo..."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRechazarDialog(false)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleRechazarTarea}
              disabled={procesando || !motivoRechazo.trim()}
              variant="destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reasignar Tarea */}
      <Dialog open={showReasignarDialog} onOpenChange={setShowReasignarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar Tarea</DialogTitle>
            <DialogDescription>
              Selecciona si deseas reasignar a un usuario o a una bandeja grupal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selector de tipo */}
            <div className="space-y-2">
              <Label>Tipo de asignación</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoReasignacion"
                    value="Usuario"
                    checked={tipoReasignacion === 'Usuario'}
                    onChange={(e) => {
                      setTipoReasignacion('Usuario');
                      setDestinatarioSeleccionado("");
                    }}
                    className="w-4 h-4"
                  />
                  <span>Bandeja Personal</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoReasignacion"
                    value="Bandeja"
                    checked={tipoReasignacion === 'Bandeja'}
                    onChange={(e) => {
                      setTipoReasignacion('Bandeja');
                      setDestinatarioSeleccionado("");
                    }}
                    className="w-4 h-4"
                  />
                  <span>Bandeja Grupal</span>
                </label>
              </div>
            </div>

            {/* Selector de destinatario */}
            <div className="space-y-2">
              <Label htmlFor="destinatario">
                {tipoReasignacion === 'Usuario' ? 'Seleccionar Usuario' : 'Seleccionar Bandeja'}
              </Label>
              <select
                id="destinatario"
                value={destinatarioSeleccionado}
                onChange={(e) => setDestinatarioSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">
                  {tipoReasignacion === 'Usuario' ? 'Seleccione un usuario...' : 'Seleccione una bandeja...'}
                </option>
                {tipoReasignacion === 'Usuario' ? (
                  usuarios.map((usuario) => (
                    <option key={usuario.Id} value={usuario.Id}>
                      {usuario.Nombre} ({usuario.Usuario})
                    </option>
                  ))
                ) : (
                  bandejas.map((bandeja) => (
                    <option key={bandeja.Id} value={bandeja.Id}>
                      {bandeja.Nombre}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowReasignarDialog(false);
                setDestinatarioSeleccionado("");
              }}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleReasignar}
              disabled={procesando || !destinatarioSeleccionado}
            >
              <User className="mr-2 h-4 w-4" />
              Reasignar Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
