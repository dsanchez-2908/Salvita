"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState("Salvita");
  const [projectDescription, setProjectDescription] = useState("Sistema de Gestión");
  const [logoUrl, setLogoUrl] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadProjectInfo();
  }, []);

  const loadProjectInfo = async () => {
    try {
      // Cargar nombre del proyecto
      const nameResponse = await fetch("/api/parametros?parametro=Nombre%20Proyecto");
      const nameData = await nameResponse.json();
      if (nameData.success && nameData.data) {
        setProjectName(nameData.data.Valor);
      }

      // Cargar descripción del login
      const descResponse = await fetch("/api/parametros?parametro=Descripcion%20Login");
      const descData = await descResponse.json();
      if (descData.success && descData.data) {
        setProjectDescription(descData.data.Valor);
      }

      // Cargar logo del sistema
      const logoResponse = await fetch("/api/parametros?parametro=Logo%20Sistema");
      const logoData = await logoResponse.json();
      if (logoData.success && logoData.data && logoData.data.Valor) {
        setLogoUrl(logoData.data.Valor);
      }
    } catch (error) {
      console.error("Error cargando información del proyecto:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usuario, clave }),
      });

      const data = await response.json();

      if (data.success) {
        // Guardar token en localStorage
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.usuario));

        toast({
          title: "Inicio de sesión exitoso",
          description: `Bienvenido ${data.data.usuario.Nombre}`,
        });

        router.push("/dashboard");
      } else {
        toast({
          title: "Error",
          description: data.error || "Credenciales inválidas",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al iniciar sesión",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          {logoUrl && (
            <div className="flex justify-center mb-4">
              <img src={logoUrl} alt="Logo" className="max-h-24 object-contain" />
            </div>
          )}
          <CardTitle className="text-3xl font-bold text-center">{projectName}</CardTitle>
          <CardDescription className="text-center">
            {projectDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input
                id="usuario"
                type="text"
                placeholder="Ingrese su usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clave">Contraseña</Label>
              <Input
                id="clave"
                type="password"
                placeholder="Ingrese su contraseña"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
