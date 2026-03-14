export interface IDatabase {
  prepare(sql: string): any;
  exec(sql: string): void;
  initialize(): void;
  transaction(fn: (...args: any[]) => any): (...args: any[]) => any;
  close(): void;
}
