"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, List, Folder } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    usuarios: 0,
    roles: 0,
    listas: 0,
    modulos: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Bienvenido al sistema de gestión Salvita</p>
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
          <p className="text-sm text-gray-600">
            Sistema de gestión parametrizable para geriátrico Salvita.
          </p>
          <p className="text-sm text-gray-600">
            Utiliza el menú lateral para acceder a las diferentes funcionalidades.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
