declare module "pg" {
  export class Pool {
    constructor(options?: any);
    query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
    end(): Promise<void>;
  }
}
