import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para sanitizar nombres de tablas (previene SQL injection)
export function sanitizeTableName(name: string): string {
  // Elimina caracteres especiales y espacios, mantiene solo alfanuméricos y guiones bajos
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

// Función para sanitizar nombres de columnas (previene SQL injection)
export function sanitizeColumnName(name: string): string {
  // Elimina caracteres especiales y espacios, mantiene solo alfanuméricos y guiones bajos
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}
