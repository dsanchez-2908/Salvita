"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, List, Folder, BarChart3, Table2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface DashboardConfig {
  Id: number;
  ModuloId: number;
  ModuloNombre: string;
  TipoVisualizacion: "Agrupamiento" | "DetalleFiltrado";
  CampoAgrupamiento: string | null;
  CampoFiltro: string | null;
  ValorFiltro: string | null;
}

interface WidgetData {
  config: DashboardConfig;
  agrupados?: Array<{ [key: string]: any; Total: number }>;
  registros?: any[];
  campos?: any[];
  nombreValorFiltro?: string;
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
        setConfiguraciones(configData.data);

        // Cargar datos para cada widget
        const widgetsPromises = configData.data.map(async (config: DashboardConfig) => {
          try {
            const dataResponse = await fetch(`/api/dashboard-data?configId=${config.Id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const dataResult = await dataResponse.json();
            
            if (dataResult.success) {
              return dataResult.data as WidgetData;
            }
            return null;
          } catch (error) {
            console.error(`Error cargando datos del widget ${config.Id}:`, error);
            return null;
          }
        });

        const widgetsResults = await Promise.all(widgetsPromises);
        setWidgetsData(widgetsResults.filter(w => w !== null) as WidgetData[]);
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

  const renderWidgetDetalleFiltrado = (widget: WidgetData) => {
    const { config, registros, campos, nombreValorFiltro } = widget;
    
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
                    {campos && campos.slice(0, 5).map((campo: any) => (
                      <th key={campo.Nombre} className="p-2 text-left">
                        {campo.Nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registros.slice(0, 5).map((registro, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      {campos && campos.slice(0, 5).map((campo: any) => (
                        <td key={campo.Nombre} className="p-2">
                          {campo.TipoDato === "Archivo" && registro[campo.Nombre] ? (
                            <button
                              onClick={() => {
                                const token = localStorage.getItem("token");
                                window.open(
                                  `/api/documentos/viewer?docId=${registro[campo.Nombre]}&token=${token}`,
                                  "_blank"
                                );
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                            >
                              Ver
                            </button>
                          ) : (
                            registro[campo.Nombre] || "-"
                          )}
                        </td>
                      ))}
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
        {widgetsData.map((widget) => {
          if (widget.config.TipoVisualizacion === "Agrupamiento") {
            return renderWidgetAgrupamiento(widget);
          } else if (widget.config.TipoVisualizacion === "DetalleFiltrado") {
            return renderWidgetDetalleFiltrado(widget);
          }
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
