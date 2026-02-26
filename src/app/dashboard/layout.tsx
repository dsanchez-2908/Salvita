"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import "../chatbot.css";
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
  Sun,
  MessageCircle,
  MessageSquare,
  ClipboardList,
  Inbox,
  BarChart3,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { useTheme } from "@/hooks/useTheme";
import { BotonCrearTarea } from "@/components/BotonCrearTarea";
import dynamic from 'next/dynamic';

const Chatbot = dynamic(() => import('@/components/Chatbot'), { ssr: false });

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
  const [tareasOpen, setTareasOpen] = useState(false);
  const [bandejasOpen, setBandejasOpen] = useState(false);
  const [tieneAccesoTrazas, setTieneAccesoTrazas] = useState(false);
  const [bandejas, setBandejas] = useState<any[]>([]);
  const [chatbotUrl, setChatbotUrl] = useState("");
  const [showChatbot, setShowChatbot] = useState(false);
  const [permisosTareas, setPermisosTareas] = useState({
    HabilitarTareas: false,
    PuedeCrearTareas: false,
    PuedeAdministracionTareas: false,
    AdministracionBandejas: false,
    PuedeConsultarTareas: false,
    PuedeVerMonitorTareas: false,
  });
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
    loadBandejas(token);
    loadPermisosTareas(token);

    // Escuchar evento de actualización de módulos
    const handleModulosUpdate = () => {
      const token = localStorage.getItem("token");
      if (token) {
        loadModulos(token);
      }
    };

    window.addEventListener('modulosUpdated', handleModulosUpdate);

    return () => {
      window.removeEventListener('modulosUpdated', handleModulosUpdate);
    };
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
      const logoResponse = await fetch("/api/parametros?parametro=Logo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const logoData = await logoResponse.json();
      if (logoData.success && logoData.data && logoData.data.Valor) {
        setLogoUrl(logoData.data.Valor);
      }

      // Cargar URL del chatbot
      const chatbotResponse = await fetch("/api/parametros?parametro=URL%20chatbot", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const chatbotData = await chatbotResponse.json();
      if (chatbotData.success && chatbotData.data && chatbotData.data.Valor) {
        setChatbotUrl(chatbotData.data.Valor);
      }
    } catch (error) {
      console.error("Error cargando información del proyecto:", error);
    }
  };

  const loadModulos = async (token: string) => {
    try {
      // Cargar solo módulos V2
      const responseV2 = await fetch("/api/modulos-v2?soloMenu=true", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const dataV2 = await responseV2.json();
      
      if (dataV2.success) {
        // Todos los módulos son V2, agregar flag para consistencia
        const modulosV2Menu = dataV2.data.map((m: any) => ({ ...m, isV2: true }));
        setModulos(modulosV2Menu);
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

  const loadBandejas = async (token: string) => {
    try {
      const response = await fetch("/api/bandejas/usuario", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await response.json();
      if (data.success) {
        // Las bandejas ya vienen filtradas por usuario desde el backend
        setBandejas(data.data);
      }
    } catch (error) {
      console.error("Error cargando bandejas:", error);
    }
  };

  const loadPermisosTareas = async (token: string) => {
    try {
      const response = await fetch("/api/permisos-tareas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await response.json();
      if (data.success) {
        setPermisosTareas(data.data);
      }
    } catch (error) {
      console.error("Error cargando permisos de tareas:", error);
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
            <div className="flex items-center space-x-3">
              <BotonCrearTarea />
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
                    <Link href="/dashboard/modulos-v2">
                      <Button
                        variant={pathname === "/dashboard/modulos-v2" ? "secondary" : "ghost"}
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
                    <Link href="/dashboard/parametros-av">
                      <Button
                        variant={pathname === "/dashboard/parametros-av" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Parámetros AV
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

            {/* Separador */}
            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

            {/* Menú de Tareas - Visible si tiene al menos un permiso activo */}
            {(isAdmin || (permisosTareas.HabilitarTareas && (
              permisosTareas.PuedeAdministracionTareas ||
              permisosTareas.AdministracionBandejas ||
              permisosTareas.PuedeConsultarTareas ||
              permisosTareas.PuedeVerMonitorTareas
            ))) && (
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setTareasOpen(!tareasOpen)}
                >
                  <div className="flex items-center">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Tareas
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      tareasOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
                {tareasOpen && (
                  <div className="ml-4 mt-2 space-y-2">
                    {(isAdmin || permisosTareas.PuedeAdministracionTareas) && (
                      <Link href="/dashboard/plantillas-tareas">
                        <Button
                          variant={pathname === "/dashboard/plantillas-tareas" ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          size="sm"
                        >
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Administración de Tareas
                        </Button>
                      </Link>
                    )}
                    {(isAdmin || permisosTareas.AdministracionBandejas) && (
                      <Link href="/dashboard/bandejas">
                        <Button
                          variant={pathname === "/dashboard/bandejas" ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          size="sm"
                        >
                          <Inbox className="mr-2 h-4 w-4" />
                          Administración de Bandejas
                        </Button>
                      </Link>
                    )}
                    {(isAdmin || permisosTareas.PuedeVerMonitorTareas) && (
                      <Link href="/dashboard/monitor-tareas">
                        <Button
                          variant={pathname === "/dashboard/monitor-tareas" ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          size="sm"
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Monitor de Tareas
                        </Button>
                      </Link>
                    )}
                    {(isAdmin || permisosTareas.PuedeConsultarTareas) && (
                      <Link href="/dashboard/consulta-tareas">
                        <Button
                          variant={pathname === "/dashboard/consulta-tareas" ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          size="sm"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          Consulta de Tareas
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Menú de Bandejas - Visible solo si HabilitarTareas está activo */}
            {(isAdmin || permisosTareas.HabilitarTareas) && (
              <div>
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setBandejasOpen(!bandejasOpen)}
                >
                  <div className="flex items-center">
                    <Inbox className="mr-2 h-4 w-4" />
                    Mis Bandejas
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      bandejasOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
                {bandejasOpen && (
                  <div className="ml-4 mt-2 space-y-2">
                    {/* Bandeja Personal - Siempre visible */}
                    <Link href="/dashboard/bandeja-personal">
                      <Button
                        variant={pathname === "/dashboard/bandeja-personal" ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        size="sm"
                      >
                        <Inbox className="mr-2 h-4 w-4" />
                        📥 Bandeja Personal
                      </Button>
                    </Link>
                    
                    {/* Bandejas Grupales del usuario */}
                    {bandejas.map((bandeja) => (
                      <Link key={bandeja.BandejaId} href={`/dashboard/bandeja/${bandeja.BandejaId}`}>
                        <Button
                          variant={pathname === `/dashboard/bandeja/${bandeja.BandejaId}` ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          size="sm"
                        >
                          <Inbox className="mr-2 h-4 w-4" />
                          📦 {bandeja.NombreBandeja}
                        </Button>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Separador */}
            <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>

            {/* Módulos Dinámicos */}
            {modulos.length > 0 && (
              <div>
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
                  
                  // Determinar la ruta según si es V2 o V1
                  const moduloPath = modulo.isV2 
                    ? `/dashboard/modulos-v2/${modulo.Id}` 
                    : `/dashboard/modulos/${modulo.Id}`;
                  
                  return (
                    <Link key={modulo.Id} href={moduloPath}>
                      <Button
                        variant={pathname === moduloPath ? "secondary" : "ghost"}
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

            {/* Botón de Chatbot y Toggle de Tema al fondo */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              {/* Botón de Chatbot */}
              {chatbotUrl && (
                <button
                  onClick={() => setShowChatbot(!showChatbot)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Asistente Virtual</span>
                </button>
              )}

              {/* Toggle de Tema */}
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

        {/* Chatbot Modal */}
        {showChatbot && chatbotUrl && (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowChatbot(false)}
            />
            <div className="fixed bottom-4 right-4 w-[500px] h-[650px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Asistente Virtual</h3>
                </div>
                <button
                  onClick={() => setShowChatbot(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <Chatbot webhookUrl={chatbotUrl} />
              </div>
            </div>
          </>
        )}

        <Toaster />
      </div>
    </ConfirmProvider>
  );
}
