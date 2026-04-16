"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Trash2, X, Calendar, User, Users } from "lucide-react";

interface RegistroTemporal {
  Id: number;
  ModuloId: number;
  RegistroId: number;
  ModuloNombre: string;
  ModuloNombreTabla: string;
  [key: string]: any;
}

interface Campo {
  Id: number;
  Nombre: string;
  NombreColumna: string;
  TipoDato: string;
  VisibleEnGrilla: boolean;
  ListaId: number | null;
  ListaNombre: string | null;
}

interface ValorLista {
  Id: number;
  Valor: string;
  ListaId: number;
}

interface Plantilla {
  Id: number;
  Nombre: string;
  Instrucciones: string;
}

interface Bandeja {
  BandejaId: number;
  NombreBandeja: string;
}

interface Usuario {
  Id: number;
  Nombre: string;
  Usuario: string;
}

export default function CrearTareaPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [registrosTemporales, setRegistrosTemporales] = useState<RegistroTemporal[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [bandejas, setBandejas] = useState<Bandeja[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [camposModulo, setCamposModulo] = useState<Campo[]>([]);
  const [datosRegistros, setDatosRegistros] = useState<any[]>([]);
  const [valoresListas, setValoresListas] = useState<ValorLista[]>([]);
  const [nombreModulo, setNombreModulo] = useState<string>("");
  
  const [plantillaId, setPlantillaId] = useState<number | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [tipoAsignacion, setTipoAsignacion] = useState<"Usuario" | "Bandeja">("Bandeja");
  const [usuarioAsignadoId, setUsuarioAsignadoId] = useState<number | null>(null);
  const [bandejaAsignadaId, setBandejaAsignadaId] = useState<number | null>(null);
  const [multipleTareas, setMultipleTareas] = useState(false); // false = una tarea por registro, true = una tarea con todos los registros
  
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    await Promise.all([
      cargarRegistrosTemporales(),
      cargarPlantillas(),
      cargarBandejas(),
      cargarUsuarios(),
    ]);
    setLoading(false);
  };

  const cargarRegistrosTemporales = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tareas/temporal", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      console.log("cargarRegistrosTemporales - data:", data);
      
      if (data.success && data.data.length > 0) {
        setRegistrosTemporales(data.data);
        
        // Guardar nombre del módulo
        setNombreModulo(data.data[0].ModuloNombre);
        
        // Cargar campos del módulo
        const moduloId = data.data[0].ModuloId;
        const nombreTabla = data.data[0].ModuloNombreTabla;
        console.log("Cargando campos para moduloId:", moduloId);
        console.log("Cargando datos para tabla:", nombreTabla);
        console.log("RegistroIds:", data.data.map((r: any) => r.RegistroId));
        
        await cargarCamposModulo(moduloId);
        if (token) {
          await cargarDatosRegistros(nombreTabla, data.data.map((r: any) => r.RegistroId), token);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const cargarCamposModulo = async (moduloId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/modulos-v2/${moduloId}/campos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      console.log("cargarCamposModulo - data:", data);
      
      if (data.success) {
        const camposVisibles = data.data.filter((c: Campo) => c.VisibleEnGrilla);
        console.log("cargarCamposModulo - camposVisibles:", camposVisibles);
        setCamposModulo(camposVisibles);
        
        // Cargar valores de listas para campos tipo Lista
        const listasIds = camposVisibles
          .filter((c: Campo) => c.TipoDato === 'Lista' && c.ListaId)
          .map((c: Campo) => c.ListaId);
        
        if (listasIds.length > 0 && token) {
          await cargarValoresListas([...new Set(listasIds)] as number[], token);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const cargarValoresListas = async (listasIds: number[], token: string) => {
    try {
      const response = await fetch(`/api/listas/valores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listasIds }),
      });

      const data = await response.json();
      if (data.success) {
        setValoresListas(data.data);
      }
    } catch (error) {
      console.error("Error cargando valores de listas:", error);
    }
  };

  const cargarDatosRegistros = async (nombreTabla: string, registroIds: number[], token: string) => {
    try {
      console.log("cargarDatosRegistros - Enviando:", { nombreTabla, registroIds });
      
      const response = await fetch(`/api/modulos-v2/datos-directos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          NombreTabla: nombreTabla,
          RegistroIds: registroIds,
        }),
      });

      const data = await response.json();
      console.log("cargarDatosRegistros - Respuesta:", data);
      
      if (data.success) {
        console.log("cargarDatosRegistros - Seteando datosRegistros:", data.data);
        setDatosRegistros(data.data);
      } else {
        console.error("cargarDatosRegistros - Error en respuesta:", data.error);
      }
    } catch (error) {
      console.error("cargarDatosRegistros - Error:", error);
    }
  };

  const cargarPlantillas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/plantillas-tareas?soloActivas=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setPlantillas(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const cargarBandejas = async () => {
    try {
      const token = localStorage.getItem("token");
      // Usar soloActivas=true para obtener TODAS las bandejas activas (no solo las del usuario)
      const response = await fetch("/api/bandejas?soloActivas=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setBandejas(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/usuarios?soloHabilitadosParaTareas=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setUsuarios(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const eliminarRegistro = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/tareas/temporal?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setRegistrosTemporales((prev) => prev.filter((r) => r.Id !== id));
        toast({
          title: "Éxito",
          description: "Registro eliminado de la selección",
        });
        
        // Disparar evento para actualizar contador
        window.dispatchEvent(new CustomEvent("registrosTemporalesActualizados"));
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al eliminar registro",
        variant: "destructive",
      });
    }
  };

  const eliminarTodos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tareas/temporal?limpiar=true", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setRegistrosTemporales([]);
        toast({
          title: "Éxito",
          description: "Todos los registros han sido eliminados",
        });
        
        // Disparar evento para actualizar contador
        window.dispatchEvent(new CustomEvent("registrosTemporalesActualizados"));
        
        // Volver al dashboard
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al eliminar registros",
        variant: "destructive",
      });
    }
  };

  const crearTarea = async (iniciar: boolean = false) => {
    // Validaciones
    if (!plantillaId) {
      toast({
        title: "Error",
        description: "Selecciona una plantilla de tarea",
        variant: "destructive",
      });
      return;
    }

    if (tipoAsignacion === "Usuario" && !usuarioAsignadoId) {
      toast({
        title: "Error",
        description: "Selecciona un usuario",
        variant: "destructive",
      });
      return;
    }

    if (tipoAsignacion === "Bandeja" && !bandejaAsignadaId) {
      toast({
        title: "Error",
        description: "Selecciona una bandeja",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreando(true);
      const token = localStorage.getItem("token");

      // Determinar si crear múltiples tareas individuales
      const crearMultiplesIndividuales = !multipleTareas && registrosTemporales.length > 1;

      if (crearMultiplesIndividuales) {
        // MODO: Una tarea por cada registro
        const payload = {
          PlantillaId: plantillaId,
          Observaciones: observaciones,
          FechaVencimiento: fechaVencimiento || null,
          TipoAsignacion: tipoAsignacion,
          UsuarioAsignadoId: tipoAsignacion === "Usuario" ? usuarioAsignadoId : null,
          BandejaAsignadaId: tipoAsignacion === "Bandeja" ? bandejaAsignadaId : null,
          IniciarInmediatamente: iniciar,
          CrearTareasPorRegistro: true, // Flag para el API
        };

        const response = await fetch("/api/tareas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          const cantidadCreadas = data.tareasCreadas || registrosTemporales.length;
          toast({
            title: "Éxito",
            description: `${cantidadCreadas} tareas creadas exitosamente`,
          });

          // Limpiar registros temporales
          await fetch("/api/tareas/temporal?limpiar=true", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          // Disparar evento para actualizar contador
          window.dispatchEvent(new CustomEvent("registrosTemporalesActualizados"));

          // Redirigir al dashboard
          router.push("/dashboard");
        } else {
          toast({
            title: "Error",
            description: data.error || "Error al crear las tareas",
            variant: "destructive",
          });
        }
      } else {
        // MODO: Una sola tarea con todos los registros (comportamiento original)
        const payload = {
          PlantillaId: plantillaId,
          Observaciones: observaciones,
          FechaVencimiento: fechaVencimiento || null,
          TipoAsignacion: tipoAsignacion,
          UsuarioAsignadoId: tipoAsignacion === "Usuario" ? usuarioAsignadoId : null,
          BandejaAsignadaId: tipoAsignacion === "Bandeja" ? bandejaAsignadaId : null,
          IniciarInmediatamente: iniciar,
          CrearTareasPorRegistro: false,
        };

        const response = await fetch("/api/tareas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: "Éxito",
            description: iniciar 
              ? "Tarea creada e iniciada exitosamente" 
              : "Tarea creada exitosamente",
          });

          // Limpiar registros temporales
          await fetch("/api/tareas/temporal?limpiar=true", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });

          // Disparar evento para actualizar contador
          window.dispatchEvent(new CustomEvent("registrosTemporalesActualizados"));

          // Redirigir al dashboard
          router.push("/dashboard");
        } else {
          toast({
            title: "Error",
            description: data.error || "Error al crear la tarea",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Error al crear la(s) tarea(s)",
        variant: "destructive",
      });
    } finally {
      setCreando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  // Permitir crear tareas sin registros - ya no retornamos temprano

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Crear Nueva Tarea
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {registrosTemporales.length} registro{registrosTemporales.length !== 1 ? "s" : ""} seleccionado{registrosTemporales.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Registros Seleccionados */}
      {registrosTemporales.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Registros Incluidos{nombreModulo ? ` de ${nombreModulo}` : ''} ({registrosTemporales.length})
            </h2>
            <Button
              variant="destructive"
              size="sm"
              onClick={eliminarTodos}
            >
              <X className="h-4 w-4 mr-2" />
              Quitar Todo
            </Button>
          </div>
          
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {registrosTemporales.map((registroTemp) => {
                  const datosRegistro = datosRegistros.find((d) => d.Id === registroTemp.RegistroId);
                  console.log(`Registro ${registroTemp.RegistroId}:`, {
                    registroTemp,
                    datosRegistro,
                    datosRegistrosCompleto: datosRegistros,
                  });
                  return (
                    <tr key={registroTemp.Id}>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarRegistro(registroTemp.Id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formulario de Tarea */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Detalles de la Tarea
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plantilla */}
          <div>
            <Label htmlFor="plantilla" className="text-gray-700 dark:text-gray-300">
              Plantilla de Tarea <span className="text-red-500">*</span>
            </Label>
            <select
              id="plantilla"
              value={plantillaId || ""}
              onChange={(e) => setPlantillaId(parseInt(e.target.value) || null)}
              className="w-full mt-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Seleccionar plantilla...</option>
              {plantillas.map((p) => (
                <option key={p.Id} value={p.Id}>
                  {p.Nombre}
                </option>
              ))}
            </select>
            {plantillaId && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {plantillas.find((p) => p.Id === plantillaId)?.Instrucciones}
              </p>
            )}
          </div>

          {/* Fecha de Vencimiento */}
          <div>
            <Label htmlFor="fechaVencimiento" className="text-gray-700 dark:text-gray-300">
              <Calendar className="inline h-4 w-4 mr-1" />
              Fecha de Vencimiento
            </Label>
            <Input
              id="fechaVencimiento"
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Tipo de Asignación */}
          <div>
            <Label className="text-gray-700 dark:text-gray-300">
              Asignar a <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="Bandeja"
                  checked={tipoAsignacion === "Bandeja"}
                  onChange={(e) => setTipoAsignacion(e.target.value as "Bandeja")}
                  className="w-4 h-4 text-blue-600"
                />
                <Users className="h-4 w-4" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Bandeja</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="Usuario"
                  checked={tipoAsignacion === "Usuario"}
                  onChange={(e) => setTipoAsignacion(e.target.value as "Usuario")}
                  className="w-4 h-4 text-blue-600"
                />
                <User className="h-4 w-4" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Usuario</span>
              </label>
            </div>
          </div>

          {/* Selector de Bandeja o Usuario */}
          <div>
            <Label className="text-gray-700 dark:text-gray-300">
              {tipoAsignacion === "Bandeja" ? "Bandeja" : "Usuario"} <span className="text-red-500">*</span>
            </Label>
            {tipoAsignacion === "Bandeja" ? (
              <select
                value={bandejaAsignadaId || ""}
                onChange={(e) => setBandejaAsignadaId(parseInt(e.target.value) || null)}
                className="w-full mt-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Seleccionar bandeja...</option>
                {bandejas.map((b) => (
                  <option key={b.BandejaId} value={b.BandejaId}>
                    {b.NombreBandeja}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={usuarioAsignadoId || ""}
                onChange={(e) => setUsuarioAsignadoId(parseInt(e.target.value) || null)}
                className="w-full mt-1 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Seleccionar usuario...</option>
                {usuarios.map((u) => (
                  <option key={u.Id} value={u.Id}>
                    {u.Nombre} ({u.Usuario})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Observaciones */}
          <div className="md:col-span-2">
            <Label htmlFor="observaciones" className="text-gray-700 dark:text-gray-300">
              Observaciones
            </Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Agrega información adicional sobre esta tarea..."
              rows={4}
              className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Checkbox Múltiples Tareas (solo visible si hay registros) */}
          {registrosTemporales.length > 1 && (
            <div className="md:col-span-2">
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="multipleTareas"
                  checked={multipleTareas}
                  onChange={(e) => setMultipleTareas(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <Label htmlFor="multipleTareas" className="text-gray-900 dark:text-white font-semibold cursor-pointer">
                    Múltiples Tareas
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {multipleTareas ? (
                      <>
                        <strong>Activado:</strong> Se creará UNA SOLA tarea con todos los {registrosTemporales.length} registros.
                      </>
                    ) : (
                      <>
                        <strong>Desactivado:</strong> Se crearán {registrosTemporales.length} tareas independientes, una por cada registro.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            disabled={creando}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => crearTarea(false)}
            disabled={creando}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Crear Tarea
          </Button>
        </div>
      </div>
    </div>
  );
}
