declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: any[] | Record<string, any>): this;
    exec(sql: string, params?: any[] | Record<string, any>): any[];
    prepare(sql: string, params?: any[] | Record<string, any>): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface Statement {
    step(): boolean;
    get(params?: any[] | Record<string, any>): any[];
    getColumnNames(): string[];
    getAsObject(params?: any[] | Record<string, any>): Record<string, any>;
    bind(values?: any[] | Record<string, any>): boolean;
    reset(): void;
    freemem(): void;
    free(): boolean;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
    Statement: new () => Statement;
  }

  export interface SqlJsConfig {
    locateFile?: (url: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
