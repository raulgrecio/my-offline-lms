export interface IDatabase {
  prepare(sql: string): any;
  exec(sql: string): void;
  initialize(): void;
  close(): void;
}
