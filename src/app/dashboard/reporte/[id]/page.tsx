"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { FileDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from 'xlsx';

interface PageProps {
  params: { id: string };
}

export default function ReportePage({ params }: PageProps) {
  const reporteId = params.id;
  const [reporte, setReporte] = useState<any>(null);
  const [columnas, setColumnas] = useState<string[]>([]);
  const [datos, setDatos] = useState<any[]>([]);
  const [datosFiltrados, setDatosFiltrados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();

  useEffect(() => {
    loadReporte();
  }, [reporteId]);

  useEffect(() => {
    // Filtrar datos según el término de búsqueda
    if (!searchTerm) {
      setDatosFiltrados(datos);
    } else {
      const filtered = datos.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setDatosFiltrados(filtered);
    }
    setCurrentPage(1); // Resetear a la primera página al filtrar
  }, [searchTerm, datos]);

  const loadReporte = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/reportes/ejecutar?id=${reporteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setReporte(data.data.reporte);
        setColumnas(data.data.columnas);
        setDatos(data.data.resultados);
        setDatosFiltrados(data.data.resultados);
      } else {
        toast({
          title: "Error",
          description: data.error || "Error al cargar el reporte",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cargar el reporte",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    try {
      // Crear un nuevo workbook
      const wb = XLSX.utils.book_new();

      // Convertir los datos a formato worksheet
      const ws = XLSX.utils.json_to_sheet(datosFiltrados);

      // Agregar la hoja al workbook
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");

      // Generar el archivo y descargarlo
      const fileName = `${reporte?.Nombre || 'Reporte'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Éxito",
        description: "Reporte exportado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al exportar el reporte",
        variant: "destructive",
      });
    }
  };

  // Cálculo de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = datosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(datosFiltrados.length / itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400">Reporte no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{reporte.Nombre}</h1>
        {reporte.Descripcion && (
          <p className="text-gray-600 dark:text-gray-400 mt-2">{reporte.Descripcion}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar en el reporte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Button onClick={exportToExcel} variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Exportar a Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {datos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay datos para mostrar
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columnas.map((columna, index) => (
                        <TableHead key={index} className="font-semibold">
                          {columna}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={columnas.length}
                          className="text-center text-gray-500"
                        >
                          No se encontraron resultados
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {columnas.map((columna, colIndex) => (
                            <TableCell key={colIndex}>
                              {row[columna] !== null && row[columna] !== undefined
                                ? String(row[columna])
                                : "-"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {datosFiltrados.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {indexOfFirstItem + 1} a{" "}
                    {Math.min(indexOfLastItem, datosFiltrados.length)} de{" "}
                    {datosFiltrados.length} resultados
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
