import type { AssetType } from "../domain/models/Asset";
import { ASSET_FOLDERS } from "../domain/models/Asset";
import type { AssetPathsJson } from "../domain/models/AssetPathsJson";
import type { IFileSystem } from "./IFileSystem";

export class AssetPathResolver {
  private configPath: string;
  private monorepoRoot: string;
  private fs: IFileSystem;
  private config: AssetPathsJson | null = null;

  constructor({
    configPath,
    monorepoRoot,
    fs,
  }: {
    configPath: string;
    monorepoRoot: string;
    fs: IFileSystem;
  }) {
    this.configPath = configPath;
    this.monorepoRoot = monorepoRoot;
    this.fs = fs;
    this.loadConfig();
  }

  /**
   * Carga la configuración de rutas de assets desde el archivo JSON o aplica valores por defecto.
   */
  private loadConfig() {
    try {
      if (this.fs.existsSync(this.configPath)) {
        const content = this.fs.readFileSync(this.configPath, "utf-8");
        this.config = JSON.parse(content);
      } else {
        // Valores por defecto si la configuración no existe
        this.config = {
          defaultWritePath: "data/assets",
          searchPaths: [{ path: "data/assets", label: "Default" }],
        };
        this.saveConfig();
      }
    } catch (error) {
      console.error("Error loading asset paths config:", error);
      this.config = {
        defaultWritePath: "data/assets",
        searchPaths: [{ path: "data/assets", label: "Default" }],
      };
      this.saveConfig();
    }
  }

  private saveConfig() {
    if (!this.config) return;
    const dir = this.fs.dirname(this.configPath);
    if (!this.fs.existsSync(dir)) {
      this.fs.mkdirSync(dir, { recursive: true });
    }
    this.fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Resolves a path to an absolute path, handling both relative to monorepo and absolute paths.
   */
  private getAbsolutePath(p: string): string {
    if (this.fs.isAbsolute(p)) return p;
    return this.fs.resolve(this.monorepoRoot, p);
  }

  /**
   * Devuelve todas las rutas de búsqueda disponibles, indicando si existen en el sistema.
   */
  getAvailablePaths() {
    if (!this.config) return [];
    return this.config.searchPaths.map((sp) => {
      const fullPath = this.getAbsolutePath(sp.path);
      return {
        ...sp,
        fullPath,
        available: this.fs.existsSync(fullPath),
      };
    });
  }

  /**
   * Devuelve la ruta por defecto para nuevas descargas.
   */
  getDefaultWritePath(): string {
    return this.getAbsolutePath(this.config?.defaultWritePath || "data/assets");
  }

  /**
   * Intenta encontrar un asset (courseId/type/filename) en todas las rutas de búsqueda.
   * @param courseId ID del curso.
   * @param type Tipo de asset (lógico). Se mapeará automáticamente al nombre de la carpeta física.
   * @param filename Nombre del archivo.
   */
  findAsset(
    courseId: string,
    type: AssetType,
    filename: string
  ): string | null {
    const folderName = ASSET_FOLDERS[type];
    const relativePath = this.fs.join(String(courseId), folderName, filename);
    const availablePaths = this.getAvailablePaths().filter((p) => p.available);

    for (const sp of availablePaths) {
      const fullPath = this.fs.join(sp.fullPath, relativePath);
      if (this.fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  /**
   * Verifica si un asset existe en alguna de las rutas de búsqueda.
   * @param courseId ID del curso.
   * @param type Tipo de asset (lógico).
   * @param filename Nombre del archivo.
   */
  assetExistsAnywhere(
    courseId: string,
    type: AssetType,
    filename: string
  ): boolean {
    return this.findAsset(courseId, type, filename) !== null;
  }

  /**
   * Recibe una ruta absoluta (posiblemente antigua o rota) e intenta encontrar el archivo
   * extrayendo el patrón courseId/folder/filename y buscando en otras ubicaciones.
   * Mapea automáticamente los nombres de carpeta ("videos", "guides") de vuelta a AssetType.
   */
  resolveExistingPath(absolutePath: string): string | null {
    if (this.fs.existsSync(absolutePath)) return absolutePath;

    // Patrón: .../{courseId}/{videos|guides}/{filename}
    // Buscamos desde el final
    const parts = absolutePath.split(this.fs.sep);
    if (parts.length < 3) return null;

    const filename = parts[parts.length - 1];
    const typeStr = parts[parts.length - 2]; // "videos" or "guides"
    const courseId = parts[parts.length - 3];

    const folderToType: Record<string, AssetType> = Object.entries(ASSET_FOLDERS).reduce(
      (acc, [type, folder]) => ({ ...acc, [folder]: type as AssetType }),
      {}
    );

    const assetType = folderToType[typeStr];
    if (!assetType) return null;

    return this.findAsset(courseId, assetType, filename);
  }

  /**
   * Guarda una nueva ruta de búsqueda en el archivo de configuración.
   */
  saveNewPath(p: string, label: string): void {
    if (!this.config) return;

    // Evitar duplicados
    if (this.config.searchPaths.some((sp) => sp.path === p)) return;

    this.config.searchPaths.push({ path: p, label });
    this.fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Elimina una ruta de búsqueda del archivo de configuración.
   */
  removePath(p: string): void {
    if (!this.config) return;
    this.config.searchPaths = this.config.searchPaths.filter(
      (sp) => sp.path !== p
    );
    this.fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Lista todos los archivos existentes en un directorio específico de assets de un curso
   * a través de todas las rutas de búsqueda.
   * @param courseId ID del curso.
   * @param type Tipo de asset (lógico).
   */
  listAssets(courseId: string, type: AssetType): string[] {
    const results: string[] = [];
    const folderName = ASSET_FOLDERS[type];
    const relativePath = this.fs.join(String(courseId), folderName);
    const availablePaths = this.getAvailablePaths().filter((p) => p.available);

    for (const sp of availablePaths) {
      const fullDir = this.fs.join(sp.fullPath, relativePath);
      if (this.fs.existsSync(fullDir)) {
        try {
          const files = this.fs.readdirSync(fullDir);
          files.forEach((f) => results.push(this.fs.join(fullDir, f)));
        } catch (e) {
          console.error(`Error listing assets in ${fullDir}:`, e);
        }
      }
    }
    return results;
  }
}
