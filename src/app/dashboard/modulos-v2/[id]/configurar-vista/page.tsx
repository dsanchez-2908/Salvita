"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, X, Save, Filter, Type, Columns, Trash2 } from "lucide-react";

interface Campo {
  Id: number;
  Nombre: string;
  TipoDato: string;
  ListaId: number | null;
}

interface Modulo {
  Id: number;
  Nombre: string;
  MostrarEnMenu: boolean;
}

interface FiltroInicial {
  id: string;
  campo: string;
  operador: string;
  valor: any;
}

interface ConfigTitulo {
  campos: string[];
  separador: string;
  template: string;
}

export default function ConfigurarVistaPage() {
  const params = useParams();
  const router = useRouter();
  const moduloId = params.id as string;
  const { toast } = useToast();

  const [modulo, setModulo] = useState<Modulo | null>(null);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [valoresListas, setValoresListas] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Configuración
  const [filtrosIniciales, setFiltrosIniciales] = useState<FiltroInicial[]>([]);
  const [configTitulo, setConfigTitulo] = useState<ConfigTitulo>({
    campos: [],
    separador: " ",
    template: "",
  });
  const [numeroColumnas, setNumeroColumnas] = useState(2);

  useEffect(() => {
    loadData();
  }, [moduloId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Cargar módulo y configuración en paralelo
      const [responseModulo, responseConfig] = await Promise.all([
        fetch(`/api/modulos-v2/${moduloId}/datos`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/module-view-config?moduloId=${moduloId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [dataModulo, dataConfig] = await Promise.all([
        responseModulo.json(),
        responseConfig.json(),
      ]);
      
      if (dataModulo.success) {
        setModulo(dataModulo.data.modulo);
        setCampos(dataModulo.data.campos.filter((c: Campo) => c.TipoDato !== "Archivo"));

        // Cargar valores de listas en paralelo
        const camposConLista = dataModulo.data.campos.filter((c: Campo) => c.ListaId);
        const valoresMap: Record<number, any[]> = {};
        
        const listasPromises = camposConLista.map(async (campo: Campo) => {
          const resValores = await fetch(`/api/listas/${campo.ListaId}/valores`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const dataValores = await resValores.json();
          if (dataValores.success && campo.ListaId) {
            valoresMap[campo.ListaId] = dataValores.data;
          }
        });
        
        await Promise.all(listasPromises);
        setValoresListas(valoresMap);
      }

      // Aplicar configuración existente
      if (dataConfig.success && dataConfig.data) {
        if (dataConfig.data.FiltrosIniciales) {
          setFiltrosIniciales(dataConfig.data.FiltrosIniciales);
        }
        if (dataConfig.data.ConfigTitulo) {
          setConfigTitulo(dataConfig.data.ConfigTitulo);
        }
        setNumeroColumnas(dataConfig.data.NumeroColumnas || 2);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const agregarFiltro = () => {
    setFiltrosIniciales([
      ...filtrosIniciales,
      {
        id: `filtro-${Date.now()}`,
        campo: "",
        operador: "=",
        valor: "",
      },
    ]);
  };

  const eliminarFiltro = (id: string) => {
    setFiltrosIniciales(filtrosIniciales.filter((f) => f.id !== id));
  };

  const actualizarFiltro = (id: string, key: string, value: any) => {
    setFiltrosIniciales(
      filtrosIniciales.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    );
  };

  const agregarCampoTitulo = () => {
    if (configTitulo.campos.length < 4) {
      setConfigTitulo({
        ...configTitulo,
        campos: [...configTitulo.campos, ""],
      });
    }
  };

  const eliminarCampoTitulo = (index: number) => {
    setConfigTitulo({
      ...configTitulo,
      campos: configTitulo.campos.filter((_, i) => i !== index),
    });
  };

  const actualizarCampoTitulo = (index: number, campo: string) => {
    const nuevosCampos = [...configTitulo.campos];
    nuevosCampos[index] = campo;
    
    // Actualizar template automáticamente
    const template = nuevosCampos
      .filter(c => c)
      .map(c => `[${c}]`)
      .join(configTitulo.separador || " ");
    
    setConfigTitulo({
      ...configTitulo,
      campos: nuevosCampos,
      template,
    });
  };

  const getOperadoresPorTipo = (tipoDato: string) => {
    switch (tipoDato) {
      case "Numero":
      case "Decimal":
        return [
          { value: "=", label: "=" },
          { value: "<>", label: "≠" },
          { value: ">", label: ">" },
          { value: "<", label: "<" },
          { value: ">=", label: "≥" },
          { value: "<=", label: "≤" },
        ];
      case "Fecha":
      case "FechaHora":
        return [
          { value: "=", label: "=" },
          { value: "<>", label: "≠" },
          { value: ">", label: "Después de" },
          { value: "<", label: "Antes de" },
          { value: ">=", label: "Desde" },
          { value: "<=", label: "Hasta" },
        ];
      default:
        return [
          { value: "=", label: "=" },
          { value: "<>", label: "≠" },
          { value: "contiene", label: "Contiene" },
          { value: "noContiene", label: "No contiene" },
        ];
    }
  };

  const handleGuardar = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      // Validar filtros
      const filtrosValidos = filtrosIniciales.filter(
        (f) => f.campo && f.operador && f.valor !== ""
      );

      // Validar config título
      const configTituloValida = configTitulo.campos.filter(c => c).length > 0 
        ? configTitulo 
        : null;

      const body = {
        ModuloId: parseInt(moduloId),
        FiltrosIniciales: filtrosValidos.length > 0 ? filtrosValidos : null,
        ConfigTitulo: configTituloValida,
        NumeroColumnas: numeroColumnas,
      };

      const response = await fetch("/api/module-view-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Éxito",
          description: "Configuración guardada correctamente",
        });
        router.back();
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al guardar configuración",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error guardando configuración:", error);
      toast({
        title: "Error",
        description: "Error al guardar configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestablecer = async () => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/module-view-config?moduloId=${moduloId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Éxito",
          description: "Configuración restablecida a valores por defecto",
        });
        // Restablecer estado local
        setFiltrosIniciales([]);
        setConfigTitulo({ campos: [], separador: " ", template: "" });
        setNumeroColumnas(2);
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al restablecer configuración",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error restableciendo configuración:", error);
      toast({
        title: "Error",
        description: "Error al restablecer configuración",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg dark:text-white">Cargando configuración...</div>
        </div>
      </div>
    );
  }

  if (!modulo?.MostrarEnMenu) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Módulo no disponible</h2>
          <p className="text-gray-600 mb-4">
            Solo los módulos padre (mostrar en menú) pueden configurar su vista.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configurar Vista</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {modulo?.Nombre}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRestablecer}>
            Restablecer
          </Button>
          <Button onClick={handleGuardar} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Ajuste 1: Filtros Iniciales */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle>Filtros Iniciales</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Configura filtros que se aplicarán automáticamente al entrar al módulo.
            Los usuarios podrán quitar estos filtros si lo desean.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {filtrosIniciales.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No hay filtros configurados</p>
              <p className="text-xs mt-1">Haz clic en "Agregar Filtro" para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtrosIniciales.map((filtro) => {
                const campo = campos.find((c) => c.Nombre === filtro.campo);
                const operadores = campo ? getOperadoresPorTipo(campo.TipoDato) : [];

                return (
                  <div
                    key={filtro.id}
                    className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                      {/* Campo */}
                      <div className="md:col-span-4">
                        <select
                          value={filtro.campo}
                          onChange={(e) => actualizarFiltro(filtro.id, "campo", e.target.value)}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">Seleccionar campo...</option>
                          {campos.map((campo) => (
                            <option key={campo.Id} value={campo.Nombre}>
                              {campo.Nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operador */}
                      <div className="md:col-span-3">
                        <select
                          value={filtro.operador}
                          onChange={(e) =>
                            actualizarFiltro(filtro.id, "operador", e.target.value)
                          }
                          className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white"
                          disabled={!filtro.campo}
                        >
                          {operadores.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Valor */}
                      <div className="md:col-span-5">
                        {campo?.TipoDato === "Lista" && campo.ListaId ? (
                          <select
                            value={filtro.valor}
                            onChange={(e) =>
                              actualizarFiltro(filtro.id, "valor", e.target.value)
                            }
                            className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white"
                          >
                            <option value="">Seleccionar valor...</option>
                            {valoresListas[campo.ListaId]?.map((valor: any) => (
                              <option key={valor.Id} value={valor.Id}>
                                {valor.Valor}
                              </option>
                            ))}
                          </select>
                        ) : campo?.TipoDato === "Fecha" ? (
                          <input
                            type="date"
                            value={filtro.valor}
                            onChange={(e) =>
                              actualizarFiltro(filtro.id, "valor", e.target.value)
                            }
                            className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white"
                          />
                        ) : campo?.TipoDato === "FechaHora" ? (
                          <input
                            type="datetime-local"
                            value={filtro.valor}
                            onChange={(e) =>
                              actualizarFiltro(filtro.id, "valor", e.target.value)
                            }
                            className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white"
                          />
                        ) : (
                          <input
                            type="text"
                            value={filtro.valor}
                            onChange={(e) =>
                              actualizarFiltro(filtro.id, "valor", e.target.value)
                            }
                            placeholder="Valor..."
                            className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white"
                          />
                        )}
                      </div>
                    </div>

                    {/* Botón eliminar */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarFiltro(filtro.id)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Button variant="outline" onClick={agregarFiltro} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Filtro
          </Button>
        </CardContent>
      </Card>

      {/* Ajuste 2: Configuración de Título */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-green-600" />
            <CardTitle>Título del Detalle</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Configura qué campos se mostrarán como título en el detalle del registro.
            Por defecto se usa el primer campo visible.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {configTitulo.campos.map((campo, index) => (
              <div key={index} className="flex items-center gap-2">
                <Label className="w-24">Campo {index + 1}:</Label>
                <select
                  value={campo}
                  onChange={(e) => actualizarCampoTitulo(index, e.target.value)}
                  className="flex-1 h-10 px-3 rounded-md border border-input bg-background dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Seleccionar campo...</option>
                  {campos.map((c) => (
                    <option key={c.Id} value={c.Nombre}>
                      {c.Nombre}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => eliminarCampoTitulo(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {configTitulo.campos.length < 4 && (
            <Button variant="outline" onClick={agregarCampoTitulo} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Campo
            </Button>
          )}

          {configTitulo.campos.length > 1 && (
            <div className="space-y-2">
              <Label>Separador:</Label>
              <Input
                value={configTitulo.separador}
                onChange={(e) => {
                  const nuevoSeparador = e.target.value;
                  const template = configTitulo.campos
                    .filter(c => c)
                    .map(c => `[${c}]`)
                    .join(nuevoSeparador);
                  
                  setConfigTitulo({
                    ...configTitulo,
                    separador: nuevoSeparador,
                    template,
                  });
                }}
                placeholder="Ej: ' ', ' - ', ', '"
                className="max-w-xs"
              />
            </div>
          )}

          {configTitulo.template && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Label className="text-sm text-blue-700 dark:text-blue-300">Vista previa:</Label>
              <p className="font-mono text-sm mt-1 dark:text-white">
                {configTitulo.template}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ajuste 3: Número de Columnas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Columns className="h-5 w-5 text-purple-600" />
            <CardTitle>Diseño de Campos en Detalle</CardTitle>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Número de columnas para mostrar los campos en la sección "Información General".
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setNumeroColumnas(num)}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    numeroColumnas === num
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">{num}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {num === 1 ? "columna" : "columnas"}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">
                Vista previa del diseño:
              </Label>
              <div
                className={`grid gap-3 ${
                  numeroColumnas === 1
                    ? "grid-cols-1"
                    : numeroColumnas === 2
                    ? "grid-cols-2"
                    : numeroColumnas === 3
                    ? "grid-cols-3"
                    : "grid-cols-4"
                }`}
              >
                {campos.slice(0, Math.min(8, campos.length)).map((campo) => (
                  <div
                    key={campo.Id}
                    className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {campo.Nombre}
                    </div>
                    <div className="text-sm font-medium mt-1 text-gray-400">
                      Valor...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
