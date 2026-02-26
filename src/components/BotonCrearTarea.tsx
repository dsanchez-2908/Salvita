"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export function BotonCrearTarea() {
  const [cantidadRegistros, setCantidadRegistros] = useState(0);
  const [tienePermiso, setTienePermiso] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const verificarPermisos = async () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      // Administrador siempre tiene permiso
      if (user.Roles?.includes("Administrador")) {
        setTienePermiso(true);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/permisos-tareas", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setTienePermiso(data.data.HabilitarTareas && data.data.PuedeCrearTareas);
      }
    } catch (error) {
      console.error("Error verificando permisos:", error);
      setTienePermiso(false);
    } finally {
      setLoading(false);
    }
  };

  const cargarCantidadRegistros = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tareas/temporal", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setCantidadRegistros(data.data.length);
      }
    } catch (error) {
      console.error("Error cargando registros temporales:", error);
    }
  };

  useEffect(() => {
    verificarPermisos();
    cargarCantidadRegistros();

    // Listener para actualizar contador cuando se agreguen registros
    const handleActualizacion = () => {
      cargarCantidadRegistros();
    };

    window.addEventListener("registrosTemporalesActualizados", handleActualizacion);

    return () => {
      window.removeEventListener("registrosTemporalesActualizados", handleActualizacion);
    };
  }, []);

  // No mostrar nada mientras se verifica el permiso o si no tiene permiso
  if (loading || !tienePermiso) {
    return null;
  }

  return (
    <Button
      onClick={() => router.push("/dashboard/tarea/crear")}
      className="h-10 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white flex items-center gap-2 shadow-md"
    >
      <div className="relative">
        <ClipboardList className="h-5 w-5" />
        {cantidadRegistros > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {cantidadRegistros}
          </span>
        )}
      </div>
      <span className="font-semibold">Crear Tarea</span>
    </Button>
  );
}
