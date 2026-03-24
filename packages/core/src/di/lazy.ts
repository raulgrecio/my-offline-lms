/**
 * Crea un envoltorio para la inicialización diferida (lazy) de un servicio.
 * Garantiza que el proceso se ejecute una sola vez y evita condiciones de carrera (race conditions).
 * Si la inicialización falla, se permite reintentar en la próxima llamada.
 */
export function createLazyService<T, A extends any[]>(factory: (...args: A) => Promise<T>): (...args: A) => Promise<T> {
  let instance: T | null = null;
  let promise: Promise<T> | null = null;

  return async (...args: A) => {
    if (instance) return instance;

    if (!promise) {
      promise = factory(...args).then((result) => {
        instance = result;
        return result;
      }).catch((err) => {
        // En caso de error, reseteamos la promesa para permitir reintentos
        promise = null;
        throw err;
      });
    }

    return promise;
  };
}
