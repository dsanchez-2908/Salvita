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
  File
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";

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
  const [modulos, setModulos] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
    loadProjectName();
    loadModulos(token);
  }, [router]);

  const loadProjectName = async () => {
    try {
      const response = await fetch("/api/parametros?parametro=Nombre%20Proyecto", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success && data.data) {
        setProjectName(data.data.Valor);
      }
    } catch (error) {
      console.error("Error cargando nombre del proyecto:", error);
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
        // Filtrar solo módulos principales e independientes
        const modulosPrincipales = data.data.filter(
          (m: any) => m.Tipo === "Principal" || m.Tipo === "Independiente"
        );
        setModulos(modulosPrincipales);
      }
    } catch (error) {
      console.error("Error cargando módulos:", error);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-primary">{projectName}</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.Nombre}</span>
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
          } bg-white border-r border-gray-200 transition-all duration-300 overflow-hidden fixed left-0 top-14 bottom-0`}
        >
          <nav className="p-4 space-y-2">
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
                  </div>
                )}
              </div>
            )}

            {/* Módulos Dinámicos */}
            {modulos.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
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
  );
}
