"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Home, 
  Settings, 
  Users, 
  Shield, 
  List, 
  Menu,
  LogOut,
  ChevronDown,
  Folder,
  FileText,
  Calendar,
  File,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";

interface User {
  Id: number;
  Nombre: string;
  Usuario: string;
  Roles: string[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [projectName, setProjectName] = useState("Salvita");
  const [logoUrl, setLogoUrl] = useState("");
  const [modulos, setModulos] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [consultasOpen, setConsultasOpen] = useState(false);
  const [tieneAccesoTrazas, setTieneAccesoTrazas] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
    loadProjectInfo();
    loadModulos(token);
    verificarAccesoTrazas(token);
  }, [router]);

  const loadProjectInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Cargar nombre del proyecto
      const nameResponse = await fetch("/api/parametros?parametro=Nombre%20Proyecto", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const nameData = await nameResponse.json();
      if (nameData.success && nameData.data) {
        setProjectName(nameData.data.Valor);
      }

      // Cargar logo del sistema
      const logoResponse = await fetch("/api/parametros?parametro=Logo%20Sistema", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const logoData = await logoResponse.json();
      if (logoData.success && logoData.data && logoData.data.Valor) {
        setLogoUrl(logoData.data.Valor);
      }
    } catch (error) {
      console.error("Error cargando información del proyecto:", error);
    }
  };

  const loadModulos = async (token: string) => {
    try {
      const response = await fetch("/api/modulos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        // Obtener permisos del usuario
        const userData = localStorage.getItem("user");
        const user = userData ? JSON.parse(userData) : null;
        const isUserAdmin = user?.Roles?.includes("Administrador");
        
        // Filtrar solo módulos principales e independientes
        let modulosPrincipales = data.data.filter(
          (m: any) => m.Tipo === "Principal" || m.Tipo === "Independiente"
        );
        
        // Si no es administrador, filtrar por permisos de Ver
        if (!isUserAdmin && user?.Permisos) {
          const permisosMap = new Map(
            user.Permisos.map((p: any) => [p.ModuloId, p])
          );
          
          modulosPrincipales = modulosPrincipales.filter((modulo: any) => {
            const permiso = permisosMap.get(modulo.Id);
            return permiso && permiso.PermisoVer === 1;
          });
        }
        
        setModulos(modulosPrincipales);
      }
    } catch (error) {
      console.error("Error cargando módulos:", error);
    }
  };

  const verificarAccesoTrazas = async (token: string) => {
    try {
      const response = await fetch("/api/trazas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        setTieneAccesoTrazas(true);
      } else {
        setTieneAccesoTrazas(false);
      }
    } catch (error) {
      console.error("Error verificando acceso a trazas:", error);
      setTieneAccesoTrazas(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  const isAdmin = user.Roles.includes("Administrador");

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 fixed top-0 left-0 right-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-8 object-contain" />
              )}
              <h1 className="text-xl font-bold text-primary">{projectName}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">{user.Nombre}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex pt-14">
          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen ? "w-64" : "w-0"
            } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 overflow-hidden fixed left-0 top-14 bottom-0 flex flex-col`}
          >
            <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            <Link href="/dashboard">
              <Button
                variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Home className="mr-2 h-4 w-4" />
                Inicio
              </Button>
            </Link>

            {/* Menú de Configuración - Solo Administradores */}
            {isAdmin && (
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setConfigOpen(!configOpen)}
                >
                  <div className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      configOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
                {configOpen && (
                  <div className="ml-4 mt-2 space-y-2">
                    <Link href="/dashboard/roles">
                      <Button
                        variant={pathname === "/dashboard/roles" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Roles
                      </Button>
                    </Link>
                    <Link href="/dashboard/usuarios">
                      <Button
                        variant={pathname === "/dashboard/usuarios" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Usuarios
                      </Button>
                    </Link>
                    <Link href="/dashboard/listas">
                      <Button
                        variant={pathname === "/dashboard/listas" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <List className="mr-2 h-4 w-4" />
                        Listas
                      </Button>
                    </Link>
                    <Link href="/dashboard/modulos">
                      <Button
                        variant={pathname === "/dashboard/modulos" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Folder className="mr-2 h-4 w-4" />
                        Módulos
                      </Button>
                    </Link>
                    <Link href="/dashboard/parametros">
                      <Button
                        variant={pathname === "/dashboard/parametros" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Parámetros
                      </Button>
                    </Link>
                    <Link href="/dashboard/dashboard-config">
                      <Button
                        variant={pathname === "/dashboard/dashboard-config" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Menú de Consultas - Visible según permisos */}
            {tieneAccesoTrazas && (
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setConsultasOpen(!consultasOpen)}
                >
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Consultas
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      consultasOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
                {consultasOpen && (
                  <div className="ml-4 mt-2 space-y-2">
                    <Link href="/dashboard/trazas">
                      <Button
                        variant={pathname === "/dashboard/trazas" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Auditoría
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Módulos Dinámicos */}
            {modulos.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Módulos
                </h3>
                {modulos.map((modulo) => {
                  // Mapeo de iconos
                  const IconComponent = 
                    modulo.Icono === "FileText" ? FileText :
                    modulo.Icono === "Users" ? Users :
                    modulo.Icono === "Calendar" ? Calendar :
                    modulo.Icono === "Home" ? Home :
                    modulo.Icono === "Settings" ? Settings :
                    modulo.Icono === "List" ? List :
                    modulo.Icono === "File" ? File :
                    Folder; // Default
                  
                  return (
                    <Link key={modulo.Id} href={`/dashboard/modulos/${modulo.Id}`}>
                      <Button
                        variant={
                          pathname === `/dashboard/modulos/${modulo.Id}` ? "secondary" : "ghost"
                        }
                        className="w-full justify-start"
                      >
                        <IconComponent className="mr-2 h-4 w-4" />
                        {modulo.Nombre}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            )}
            </nav>

            {/* Toggle de Tema al fondo */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Modo oscuro</span>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    theme === "dark" ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === "dark" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main
            className={`flex-1 p-6 transition-all duration-300 ${
              sidebarOpen ? "ml-64" : "ml-0"
            }`}
          >
            {children}
          </main>
        </div>

        <Toaster />
      </div>
    </ConfirmProvider>
  );
}
