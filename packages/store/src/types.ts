export enum StoreType {
  Normal = "normal",
  Lazy = "lazy",
}

export type Listener<T> = (newState: T, status: PromiseStatus) => void;

export type DefaultState<T> = T | Promise<T> | (() => T) | (() => Promise<T>);

export type StoreValue<
  S extends StoreWithReducer<unknown> | Store<unknown> | LazyStore<unknown>
> = S extends StoreWithReducer<infer T>
  ? T
  : S extends Store<infer T>
  ? T
  : S extends LazyStore<infer T>
  ? T
  : unknown;

export type Loader<
  T,
  Deps extends Array<StoreWithReducer<any> | Store<any> | LazyStore<any>>
> = (
  deps: Deps extends Array<StoreWithReducer<any>>
    ? {
        [key in keyof Deps]: StoreValue<Deps[key]>;
      }
    : never
) => T;

export type StoreParams<T> = {
  id: string;
  defaultState?: DefaultState<T>;
  revalidate?: number;
  onCleanup?: (store: Store<T>) => void;
  onCreate?: (store: Store<T>) => void;
};

export type Options = {
  revalidate?: number;
};

export type InternalCreateStore = <T>(
  params: StoreParams<T>
) => StoreWithReducer<T>;

export type XInternalCreateStore = {
  <T, D extends Array<StoreWithReducer<any> | Store<any> | LazyStore<any>>>(
    deps: D,
    loader: Loader<T, D>,
    options?: Options
  ): StoreWithReducer<T>;
  <T>(defaultState: DefaultState<T>, options?: Options): StoreWithReducer<T>;
};

export type LazyStore<
  T,
  R = Reducers<T>,
  A extends {
    [K in keyof R]: R[K] extends (_: T, ...args: infer Args) => void
      ? (...args: Args) => void
      : never;
  } = { [K in keyof R]: never }
> = {
  __type__: StoreType.Lazy;
  load: (params?: StoreParams<T>) => StoreWithReducer<T, R, A>;
  use: <
    R extends Reducers<T>,
    A extends {
      [K in keyof R]: R[K] extends (_: T, ...args: infer Args) => void
        ? (...args: Args) => void
        : never;
    }
  >(
    reducers: R
  ) => LazyStore<T, R, A>;
};

export type XLazyStore<
  T,
  R = Reducers<T>,
  A extends {
    [K in keyof R]: R[K] extends (_: T, ...args: infer Args) => void
      ? (...args: Args) => void
      : never;
  } = { [K in keyof R]: never }
> = {
  __type__: StoreType.Lazy;
  load: XInternalCreateStore;
  use: <
    R extends Reducers<T>,
    A extends {
      [K in keyof R]: R[K] extends (_: T, ...args: infer Args) => void
        ? (...args: Args) => void
        : never;
    }
  >(
    reducers: R
  ) => LazyStore<T, R, A>;
};

export type CreateLazyStore = <T>(params: StoreParams<T>) => LazyStore<T>;

export type XCreateLazyStore = {
  <T, D extends Array<StoreWithReducer<any>>>(
    deps: D,
    loader: Loader<T, D>,
    options?: Options
  ): LazyStore<T>;
  <T>(defaultState: DefaultState<T>, options?: Options): LazyStore<T>;
};

export type Reducer<T> = (prevState: T, ...args: never[]) => T | Promise<T>;

export type Reducers<T> = {
  [K in string]: Reducer<T>;
};

export type StoreWithReducer<
  T,
  R = Reducers<T>,
  A extends {
    [K in keyof R]: R[K] extends (_: T, ...args: infer Args) => void
      ? (...args: Args) => void
      : never;
  } = { [K in keyof R]: never }
> = Store<T> & A;

// type T = T extends PromiseLike<infer P> ? P : T;

export type Store<T> = {
  __type__: StoreType.Normal;
  id?: string;
  status: PromiseStatus;
  value: T;
  update: (newState: T | Promise<T>) => void;
  subscribe: (listener: Listener<T>) => Listener<T>;
  unsubscribe: (listener: Listener<T>) => void;
  reset: () => void;
  use: <
    R extends Reducers<T>,
    A extends {
      [K in keyof R]: R[K] extends (_: T, ...args: infer Args) => void
        ? (...args: Args) => void
        : never;
    }
  >(
    reducers: R
  ) => StoreWithReducer<T, R, A>;
};

export enum PromiseStatus {
  idle = "idle",
  pending = "pending",
  error = "error",
  success = "success",
}
