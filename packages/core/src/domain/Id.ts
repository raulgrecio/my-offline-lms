/**
 * Utilidad para la generación de identificadores únicos deterministas.
 * En el futuro podría sustituirse por UUID v4 si fuese necesario, 
 * pero por ahora usamos un formato compacto de 10 caracteres.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 12);
}
