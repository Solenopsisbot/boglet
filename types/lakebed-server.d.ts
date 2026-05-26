declare module "lakebed/server" {
  export type TableField = {
    string: () => FieldDef;
    boolean: () => FieldDef;
    number: () => FieldDef;
  };

  export interface FieldDef {
    default?: (value: string | boolean | number) => FieldDef;
  }

  export const string: TableField["string"];
  export const boolean: TableField["boolean"];
  export const number: TableField["number"];

  export interface TableDef {
    [field: string]: FieldDef;
  }

  export function table(def: TableDef): TableDef;

  export interface Row {
    id: string;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
  }

  export interface QueryBuilder {
    where(field: string, value: string | number | boolean): QueryBuilder;
    orderBy(field: string, dir: "asc" | "desc"): QueryBuilder;
    limit(n: number): QueryBuilder;
    all(): Row[];
    get(): Row | null;
  }

  export interface TableOperations {
    where(field: string, value: string | number | boolean): QueryBuilder;
    orderBy(field: string, dir: "asc" | "desc"): QueryBuilder;
    get(id: string): Row | null;
    all(): Row[];
    insert(data: Record<string, unknown>): unknown;
    update(id: string, data: Record<string, unknown>): void;
    delete(id: string): void;
  }

  export interface QueryContext {
    auth: {
      userId: string;
      displayName: string;
      isGuest: boolean;
      picture?: string;
    };
    db: any;
    env: Record<string, string>;
  }

  export type QueryHandler<T> = (ctx: QueryContext) => T;

  export function query<T>(handler: QueryHandler<T>): QueryHandler<T>;

  export interface MutationContext extends QueryContext {}

  export type MutationHandler<TArgs extends unknown[], TResult> = (ctx: MutationContext, ...args: TArgs) => TResult;

  export function mutation<TArgs extends unknown[], TResult>(handler: MutationHandler<TArgs, TResult>): MutationHandler<TArgs, TResult>;

  export interface CapsuleConfig {
    name: string;
    schema: {
      [table: string]: TableDef;
    };
    queries?: {
      [name: string]: QueryHandler<unknown>;
    };
    mutations?: {
      [name: string]: MutationHandler<unknown[], unknown>;
    };
  }

  export function capsule(config: CapsuleConfig): CapsuleConfig;
}
