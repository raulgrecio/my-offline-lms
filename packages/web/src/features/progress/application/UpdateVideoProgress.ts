import type { IProgressRepository } from "../domain/ports/IProgressRepository";

export class UpdateVideoProgress {
  constructor(private progressRepo: IProgressRepository) {}

  execute(assetId: string, position: number, completed?: boolean): void {
    // Aquí es donde en el futuro podríamos añadir lógica de orquestación, 
    // como verificar si al completar el vídeo se debe marcar el curso como iniciado/completado.
    this.progressRepo.updateVideoProgress(assetId, position, completed);
  }
}
