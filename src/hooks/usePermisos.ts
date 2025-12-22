import { useState, useEffect } from "react";

interface Permiso {
  ModuloId: number;
  ModuloNombre: string;
  PermisoVer: number;
  PermisoVerAgrupado: number;
  PermisoAgregar: number;
  PermisoModificar: number;
  PermisoEliminar: number;
}

interface PermisosUsuario {
  ver: boolean;
  verAgrupado: boolean;
  agregar: boolean;
  modificar: boolean;
  eliminar: boolean;
}

export function usePermisos(moduloId?: string | number) {
  const [permisos, setPermisos] = useState<PermisosUsuario>({
    ver: false,
    verAgrupado: false,
    agregar: false,
    modificar: false,
    eliminar: false,
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      return;
    }

    try {
      const user = JSON.parse(userData);
      
      // Los administradores tienen todos los permisos
      const admin = user.Roles?.includes("Administrador");
      setIsAdmin(admin);

      if (admin) {
        setPermisos({
          ver: true,
          verAgrupado: true,
          agregar: true,
          modificar: true,
          eliminar: true,
        });
        return;
      }

      // Si no hay moduloId, no se puede verificar permisos específicos
      if (!moduloId) {
        setPermisos({
          ver: false,
          verAgrupado: false,
          agregar: false,
          modificar: false,
          eliminar: false,
        });
        return;
      }

      // Buscar permisos del módulo específico
      const permisosList = user.Permisos || [];
      const permisoModulo = permisosList.find(
        (p: Permiso) => p.ModuloId === Number(moduloId)
      );

      if (permisoModulo) {
        setPermisos({
          ver: permisoModulo.PermisoVer === 1,
          verAgrupado: permisoModulo.PermisoVerAgrupado === 1,
          agregar: permisoModulo.PermisoAgregar === 1,
          modificar: permisoModulo.PermisoModificar === 1,
          eliminar: permisoModulo.PermisoEliminar === 1,
        });
      } else {
        setPermisos({
          ver: false,
          verAgrupado: false,
          agregar: false,
          modificar: false,
          eliminar: false,
        });
      }
    } catch (error) {
      console.error("Error cargando permisos:", error);
    }
  }, [moduloId]);

  return { ...permisos, isAdmin };
}
