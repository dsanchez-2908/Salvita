"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, List, Folder, BarChart3, Table2, Calculator } from "lucide-react";
import { useRouter } from "next/navigation";

interface DashboardConfig {
  Id: number;
  Tipo: "Modulos" | "Tareas";
  // Campos para Widgets de Módulos
  ModuloId?: number;
  ModuloNombre?: string;
  TipoVisualizacion?: "Agrupamiento" | "DetalleFiltrado" | "Totalizado";
  CampoAgrupamiento?: string | null;
  CampoFiltro?: string | null;
  ValorFiltro?: string | null;
  FiltroOperador?: string | null;
  FiltroActivo?: boolean;
  // Campos para Widgets de Tareas
  TareasTipoVisualizacion?: "PendientesPropios" | "PendientesTotales" | null;
  TareasCategoria?: "BandejaPersonal" | "BandejasGrupal" | null;
}

interface WidgetData {
  config: DashboardConfig;
  // Datos para widgets de Módulos
  total?: number;
  filtroAplicado?: string | null;
  agrupados?: Array<{ [key: string]: any; Total: number }>;
  registros?: any[];
  campos?: any[];
  nombreValorFiltro?: string;
  // Datos para widgets de Tareas
  tareasData?: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [configuraciones, setConfiguraciones] = useState<DashboardConfig[]>([]);
  const [widgetsData, setWidgetsData] = useState<WidgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Dashboard por defecto para administradores
  const [stats, setStats] = useState({
    usuarios: 0,
    roles: 0,
    listas: 0,
    modulos: 0,
  });

  useEffect(() => {
    loadUserAndConfig();
  }, []);

  const loadUserAndConfig = async () => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (!token || !userData) {
      router.push("/login");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    const admin = parsedUser.Roles?.includes("Administrador");
    setIsAdmin(admin);

    if (admin) {
      // Dashboard por defecto para administrador
      await loadAdminStats(token);
    } else {
      // Dashboard configurado para el rol del usuario
      await loadUserDashboard(token);
    }

    setLoading(false);
  };

  const loadAdminStats = async (token: string) => {
    try {
      const [usuariosRes, rolesRes, listasRes, modulosRes] = await Promise.all([
        fetch("/api/usuarios", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/roles", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/listas", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/modulos", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [usuarios, roles, listas, modulos] = await Promise.all([
        usuariosRes.json(),
        rolesRes.json(),
        listasRes.json(),
        modulosRes.json(),
      ]);

      setStats({
        usuarios: usuarios.success ? usuarios.data.length : 0,
        roles: roles.success ? roles.data.length : 0,
        listas: listas.success ? listas.data.length : 0,
        modulos: modulos.success ? modulos.data.length : 0,
      });
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  };

  const loadUserDashboard = async (token: string) => {
    try {
      // Cargar configuración del dashboard
      const configResponse = await fetch("/api/dashboard-config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const configData = await configResponse.json();

      if (configData.success && configData.data.length > 0) {
        console.log("📊 Configuraciones cargadas:", configData.data);
        setConfiguraciones(configData.data);

        // Cargar datos para cada widget
        const widgetsPromises = configData.data.map(async (config: DashboardConfig) => {
          try {
            console.log(`🔄 Cargando widget Tipo=${config.Tipo}, Id=${config.Id}`);
            
            // Widgets de Módulos
            if (config.Tipo === "Modulos" || !config.Tipo) {
              const dataResponse = await fetch(`/api/dashboard-data?configId=${config.Id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const dataResult = await dataResponse.json();
              
              console.log(`✅ Widget Módulo ${config.Id}:`, dataResult.success);
              
              if (dataResult.success) {
                return dataResult.data as WidgetData;
              }
            }
            // Widgets de Tareas
            else if (config.Tipo === "Tareas") {
              const url = `/api/dashboard-task-data?tipoVisualizacion=${config.TareasTipoVisualizacion}&categoria=${config.TareasCategoria}`;
              console.log(`📋 Cargando tareas desde: ${url}`);
              
              const dataResponse = await fetch(url, { 
                headers: { Authorization: `Bearer ${token}` } 
              });
              const dataResult = await dataResponse.json();
              
              console.log(`✅ Widget Tareas ${config.Id}:`, dataResult);
              
              if (dataResult.success) {
                return {
                  config,
                  tareasData: dataResult.data,
                } as WidgetData;
              } else {
                console.error(`❌ Error en widget Tareas ${config.Id}:`, dataResult.error);
              }
            }
            return null;
          } catch (error) {
            console.error(`❌ Error cargando datos del widget ${config.Id}:`, error);
            return null;
          }
        });

        const widgetsResults = await Promise.all(widgetsPromises);
        const validWidgets = widgetsResults.filter(w => w !== null) as WidgetData[];
        console.log(`📦 Total widgets cargados: ${validWidgets.length} de ${widgetsResults.length}`);
        console.log("📦 Widgets válidos:", validWidgets);
        setWidgetsData(validWidgets);
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    }
  };

  const renderWidgetAgrupamiento = (widget: WidgetData) => {
    const { config, agrupados } = widget;
    
    return (
      <Card key={config.Id}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{config.ModuloNombre}</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Agrupado por {config.CampoAgrupamiento}
          </p>
        </CardHeader>
        <CardContent>
          {agrupados && agrupados.length > 0 ? (
            <div className="space-y-2">
              {agrupados.map((item, index) => {
                const valor = item[config.CampoAgrupamiento!] || "Sin valor";
                return (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="font-medium">{valor}</span>
                    <span className="text-2xl font-bold text-blue-600">{item.Total}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderWidgetTotalizado = (widget: WidgetData) => {
    const { config, total, filtroAplicado } = widget;
    
    return (
      <Card key={config.Id}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">{config.ModuloNombre}</CardTitle>
          </div>
          {filtroAplicado && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Filtrado: {filtroAplicado}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-5xl font-bold text-purple-600">{total || 0}</p>
              <p className="text-sm text-gray-500 mt-2">
                {filtroAplicado ? "registros filtrados" : "registros totales"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderWidgetDetalleFiltrado = (widget: WidgetData) => {
    const { config, registros, campos, nombreValorFiltro } = widget;
    
    // Filtrar solo campos visibles en grilla
    const camposVisibles = campos ? campos.filter((c: any) => c.VisibleEnGrilla) : [];
    
    return (
      <Card key={config.Id} className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">{config.ModuloNombre}</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Filtrado: {config.CampoFiltro} = {nombreValorFiltro || config.ValorFiltro}
          </p>
        </CardHeader>
        <CardContent>
          {registros && registros.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    {camposVisibles.map((campo: any) => (
                      <th key={campo.Nombre} className="p-2 text-left">
                        {campo.Nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registros.slice(0, 5).map((registro, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      {camposVisibles.map((campo: any) => {
                        const valor = registro[campo.Nombre];
                        
                        // Renderizar según tipo de dato
                        let contenido;
                        if (campo.TipoDato === "Archivo" && valor) {
                          contenido = (
                            <button
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem("token");
                                  const response = await fetch(
                                    `/api/documentos/viewer?documentId=${valor}&token=${token}`
                                  );
                                  const data = await response.json();
                                  if (data.success && data.viewerUrl) {
                                    window.open(data.viewerUrl, "_blank");
                                  } else {
                                    console.error("Error obteniendo URL del visor:", data.error);
                                  }
                                } catch (error) {
                                  console.error("Error:", error);
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            >
                              Ver
                            </button>
                          );
                        } else if ((campo.TipoDato === "Fecha" || campo.TipoDato === "FechaHora") && valor) {
                          // Formatear fecha
                          const fecha = new Date(valor);
                          if (campo.TipoDato === "Fecha") {
                            contenido = fecha.toLocaleDateString('es-AR');
                          } else {
                            contenido = fecha.toLocaleString('es-AR', { 
                              dateStyle: 'short', 
                              timeStyle: 'short' 
                            });
                          }
                        } else {
                          contenido = valor || "-";
                        }
                        
                        return (
                          <td key={campo.Nombre} className="p-2">
                            {contenido}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Renderizar widgets de Tareas
  const renderWidgetTareasPendientesPropiosBandejaPersonal = (widget: WidgetData) => {
    const data = widget.tareasData || {};
    
    return (
      <Card key={widget.config.Id}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">Mis Tareas Pendientes</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Bandeja Personal
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded">
              <span className="font-medium">Pendientes</span>
              <span className="text-3xl font-bold text-orange-600">{data.TotalPendientes || 0}</span>
            </div>
            {data.TotalVencidas > 0 && (
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
                <span className="font-medium text-red-700">Vencidas</span>
                <span className="text-3xl font-bold text-red-600">{data.TotalVencidas}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderWidgetTareasPendientesPropiosBandejasGrupal = (widget: WidgetData) => {
    const data = widget.tareasData || {};
    
    return (
      <Card key={widget.config.Id}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Tareas en Mis Bandejas</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Todas las bandejas grupales
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <span className="font-medium">Total Pendientes</span>
              <span className="text-2xl font-bold text-blue-600">{data.TotalPendientes || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <span className="font-medium">Tomadas por mí</span>
              <span className="text-2xl font-bold text-green-600">{data.TomadasPorMi || 0}</span>
            </div>
            {data.TotalVencidas > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
                <span className="font-medium text-red-700">Vencidas</span>
                <span className="text-2xl font-bold text-red-600">{data.TotalVencidas}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderWidgetTareasPendientesTotalesBandejaPersonal = (widget: WidgetData) => {
    const data = widget.tareasData || [];
    
    return (
      <Card key={widget.config.Id} className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Tareas Pendientes por Usuario</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Bandejas personales
          </p>
        </CardHeader>
        <CardContent>
          {data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="p-2 text-left">Usuario</th>
                    <th className="p-2 text-left">Nombre</th>
                    <th className="p-2 text-center">Pendientes</th>
                    <th className="p-2 text-center">Vencidas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((row: any, index: number) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="p-2">{row.Usuario}</td>
                      <td className="p-2">{row.NombreCompleto}</td>
                      <td className="p-2 text-center">
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full font-semibold">
                          {row.TotalPendientes}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {row.TotalVencidas > 0 ? (
                          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full font-semibold">
                            {row.TotalVencidas}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderWidgetTareasPendientesTotalesBandejasGrupal = (widget: WidgetData) => {
    const data = widget.tareasData || [];
    
    return (
      <Card key={widget.config.Id} className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-lg">Tareas Pendientes por Bandeja</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Bandejas grupales
          </p>
        </CardHeader>
        <CardContent>
          {data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="p-2 text-left">Bandeja</th>
                    <th className="p-2 text-center">Pendientes</th>
                    <th className="p-2 text-center">Tomadas</th>
                    <th className="p-2 text-center">Vencidas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((row: any, index: number) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="p-2 font-medium">{row.BandejaNombre}</td>
                      <td className="p-2 text-center">
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-semibold">
                          {row.TotalPendientes}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-semibold">
                          {row.TotalTomadas}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {row.TotalVencidas > 0 ? (
                          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full font-semibold">
                            {row.TotalVencidas}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No hay datos disponibles</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Dashboard de administrador (por defecto)
  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Bienvenido al sistema de gestión Salvita</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.usuarios}</div>
              <p className="text-xs text-muted-foreground">
                Usuarios registrados en el sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Roles</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.roles}</div>
              <p className="text-xs text-muted-foreground">
                Roles configurados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Listas</CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.listas}</div>
              <p className="text-xs text-muted-foreground">
                Listas creadas
              </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.modulos}</div>
            <p className="text-xs text-muted-foreground">
              Módulos configurados
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sistema de gestión parametrizable para geriátrico Salvita.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Utiliza el menú lateral para acceder a las diferentes funcionalidades.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Dashboard configurado para el usuario
return (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-400 mt-1">
        Bienvenido, {user?.Nombre}
      </p>
    </div>

    {widgetsData.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgetsData.map((widget, idx) => {
          console.log(`🎨 Renderizando widget ${idx}:`, widget.config.Tipo, widget);
          
          // Widgets de Módulos
          if (widget.config.Tipo === "Modulos" || !widget.config.Tipo) {
            if (widget.config.TipoVisualizacion === "Agrupamiento") {
              return renderWidgetAgrupamiento(widget);
            } else if (widget.config.TipoVisualizacion === "DetalleFiltrado") {
              return renderWidgetDetalleFiltrado(widget);
            } else if (widget.config.TipoVisualizacion === "Totalizado") {
              return renderWidgetTotalizado(widget);
            }
          }
          // Widgets de Tareas
          else if (widget.config.Tipo === "Tareas") {
            console.log(`🎨 Widget de Tareas detectado: ${widget.config.TareasTipoVisualizacion} - ${widget.config.TareasCategoria}`);
            
            if (widget.config.TareasTipoVisualizacion === "PendientesPropios" && widget.config.TareasCategoria === "BandejaPersonal") {
              return renderWidgetTareasPendientesPropiosBandejaPersonal(widget);
            } else if (widget.config.TareasTipoVisualizacion === "PendientesPropios" && widget.config.TareasCategoria === "BandejasGrupal") {
              return renderWidgetTareasPendientesPropiosBandejasGrupal(widget);
            } else if (widget.config.TareasTipoVisualizacion === "PendientesTotales" && widget.config.TareasCategoria === "BandejaPersonal") {
              return renderWidgetTareasPendientesTotalesBandejaPersonal(widget);
            } else if (widget.config.TareasTipoVisualizacion === "PendientesTotales" && widget.config.TareasCategoria === "BandejasGrupal") {
              return renderWidgetTareasPendientesTotalesBandejasGrupal(widget);
            }
          }
          
          console.log(`⚠️ Widget ${idx} no coincide con ninguna condición de renderizado`);
          return null;
        })}
      </div>
    ) : (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            No hay widgets configurados para su rol
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Contacte al administrador para configurar su dashboard
          </p>
        </CardContent>
      </Card>
    )}
  </div>
);
}
