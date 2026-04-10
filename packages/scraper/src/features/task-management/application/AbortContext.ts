import { AsyncLocalStorage } from 'async_hooks';

import { TASK_CANCELLED_ERROR } from './TaskOrchestrator';

/**
 * Contexto de cancelación basado en AsyncLocalStorage.
 *
 * Permite que cualquier función dentro de una cadena de ejecución asíncrona
 * pueda comprobar o reaccionar a una señal de abort SIN necesidad de recibir
 * el AbortSignal como parámetro explícito.
 *
 * Uso:
 *   // En el punto de entrada (orquestador):
 *   await AbortContext.run(signal, () => doWork());
 *
 *   // En cualquier punto de la cadena:
 *   AbortContext.throwIfAborted(); // lanza TASK_CANCELLED_ERROR si abortado
 */
const storage = new AsyncLocalStorage<AbortSignal>();

export const AbortContext = {
  /**
   * Ejecuta `fn` con el signal vinculado al contexto actual de ejecución.
   */
  run<T>(signal: AbortSignal, fn: () => Promise<T>): Promise<T> {
    return storage.run(signal, fn);
  },

  /**
   * Devuelve el AbortSignal activo en el contexto actual, o undefined si no hay ninguno.
   */
  getSignal(): AbortSignal | undefined {
    return storage.getStore();
  },

  /**
   * Lanza un error de cancelación si el signal activo en el contexto ha sido abortado.
   * Es un no-op si no hay signal en el contexto.
   */
  throwIfAborted(): void {
    const signal = storage.getStore();
    if (signal?.aborted) {
      throw new Error(TASK_CANCELLED_ERROR);
    }
  },
};
