import type { AssetType } from "../domain/models/Asset";
import { ASSET_FOLDERS } from "../domain/models/Asset";
import type { AssetPathsJson } from "../domain/models/AssetPathsJson";
import type { IFileSystem } from "./IFileSystem";
import { type ILogger, NoopLogger } from "../logging";

interface AssetPathResolverProps {
  configPath: string;
  monorepoRoot: string;
  fs: IFileSystem;
  logger?: ILogger;
}

export class AssetPathResolver {
  private configPath: string;
  private monorepoRoot: string;
  private fs: IFileSystem;
  private logger: ILogger;
  private config: AssetPathsJson | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor({
    configPath,
    monorepoRoot,
    fs,
    logger = new NoopLogger(),
  }: AssetPathResolverProps) {
    this.configPath = configPath;
    this.monorepoRoot = monorepoRoot;
    this.fs = fs;
    this.logger = logger.withContext("AssetPathResolver");
  }

  /**
   * Asegura que la configuración esté cargada de forma asíncrona.
   */
  async ensureInitialized(): Promise<void> {
    if (this.config) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.loadConfig();
    return this.initializationPromise;
  }

  /**
   * Carga la configuración de rutas de assets desde el archivo JSON o aplica valores por defecto.
   */
  private async loadConfig() {
    try {
      if (await this.fs.exists(this.configPath)) {
        const content = await this.fs.readFile(this.configPath, "utf-8");
        this.config = JSON.parse(content);
      } else {
        // Valores por defecto si la configuración no existe
        this.config = {
          defaultWritePath: "data/assets",
          searchPaths: [{ path: "data/assets", label: "Default" }],
        };
        await this.saveConfig();
      }
    } catch (error) {
      this.logger.error("Error loading asset paths config", error);
      this.config = {
        defaultWritePath: "data/assets",
        searchPaths: [{ path: "data/assets", label: "Default" }],
      };
      await this.saveConfig();
    }
  }

  private async saveConfig() {
    if (!this.config) return;
    const dir = this.fs.dirname(this.configPath);
    if (!(await this.fs.exists(dir))) {
      await this.fs.mkdir(dir, { recursive: true });
    }
    await this.fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
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
  async getAvailablePaths() {
    await this.ensureInitialized();
    if (!this.config) return [];

    const results = await Promise.all(this.config.searchPaths.map(async (sp) => {
      const fullPath = this.getAbsolutePath(sp.path);
      return {
        ...sp,
        fullPath,
        available: await this.fs.exists(fullPath),
      };
    }));
    return results;
  }

  /**
   * Devuelve la ruta por defecto para nuevas descargas.
   */
  async getDefaultWritePath(): Promise<string> {
    await this.ensureInitialized();
    return this.getAbsolutePath(this.config?.defaultWritePath || "data/assets");
  }

  /**
   * Intenta encontrar un asset (courseId/type/filename) en todas las rutas de búsqueda.
   * @param courseId ID del curso.
   * @param type Tipo de asset (lógico). Se mapeará automáticamente al nombre de la carpeta física.
   * @param filename Nombre del archivo.
   */
  async findAsset(
    courseId: string,
    type: AssetType,
    filename: string
  ): Promise<string | null> {
    const folderName = ASSET_FOLDERS[type];
    const relativePath = this.fs.join(String(courseId), folderName, filename);
    const allPaths = await this.getAvailablePaths();
    const availablePaths = allPaths.filter((p) => p.available);

    for (const sp of availablePaths) {
      const fullPath = this.fs.join(sp.fullPath, relativePath);
      if (await this.fs.exists(fullPath)) {
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
  async assetExistsAnywhere(
    courseId: string,
    type: AssetType,
    filename: string
  ): Promise<boolean> {
    return (await this.findAsset(courseId, type, filename)) !== null;
  }

  /**
   * Recibe una ruta absoluta (posiblemente antigua o rota) e intenta encontrar el archivo
   * extrayendo el patrón courseId/folder/filename y buscando en otras ubicaciones.
   * Mapea automáticamente los nombres de carpeta ("videos", "guides") de vuelta a AssetType.
   */
  async resolveExistingPath(absolutePath: string): Promise<string | null> {
    if (await this.fs.exists(absolutePath)) return absolutePath;

    // Patrón: .../{courseId}/{videos|guides}/{filename}
    // Buscamos desde el final
    // Usamos regex para split para soportar rutas windows y linux independientemente del SO
    const parts = absolutePath.split(/[\\\/]/);
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
  async saveNewPath(p: string, label: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.config) return;

    // Evitar duplicados
    if (this.config.searchPaths.some((sp) => sp.path === p)) return;

    this.config.searchPaths.push({ path: p, label });
    await this.saveConfig();
  }

  /**
   * Elimina una ruta de búsqueda del archivo de configuración.
   */
  async removePath(p: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.config) return;
    this.config.searchPaths = this.config.searchPaths.filter(
      (sp) => sp.path !== p
    );
    await this.saveConfig();
  }

  /**
   * Lista todos los archivos existentes en un directorio específico de assets de un curso
   * a través de todas las rutas de búsqueda.
   * @param courseId ID del curso.
   * @param type Tipo de asset (lógico).
   */
  async listAssets(courseId: string, type: AssetType): Promise<string[]> {
    const results: string[] = [];
    const folderName = ASSET_FOLDERS[type];
    const relativePath = this.fs.join(String(courseId), folderName);
    const allPaths = await this.getAvailablePaths();
    const availablePaths = allPaths.filter((p) => p.available);

    for (const sp of availablePaths) {
      const fullDir = this.fs.join(sp.fullPath, relativePath);
      if (await this.fs.exists(fullDir)) {
        try {
          const files = await this.fs.readdir(fullDir);
          files.forEach((f) => results.push(this.fs.join(fullDir, f)));
        } catch (e) {
          this.logger.error(`Error listing assets in ${fullDir}`, e);
        }
      }
    }
    return results;
  }
}
