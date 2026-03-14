import type { AssetPathConfig } from "./AssetPathConfig";

export interface AssetPathsJson {
  defaultWritePath: string;
  searchPaths: AssetPathConfig[];
}