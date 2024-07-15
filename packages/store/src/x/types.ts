export type InitialValue<T> = T | Promise<T> | (() => T) | (() => Promise<T>);

export type Reducer<T, A extends any[]> = (
  prev: T,
  ...args: A
) => T | Promise<T>;

export type Reducers<T> = Record<string, Reducer<T, any[]>>;

export type Action<R extends Reducer<any, any[]>> = R extends Reducer<
  infer T,
  infer A
>
  ? (...args: A) => T | Promise<T>
  : never;

export type Actions<R extends Reducers<any>> = {
  [K in keyof R]: Action<R[K]>;
};

export type Store<T> = {
  data: T;
  loading: boolean;
  loaded: boolean;
  update: (newValue: T | Promise<T>) => void;
  subscribe: SubscribeFunc<T>;
  promise: Promise<any> | null;
  use: <R extends Reducers<T>>(reducers: R) => Store<T> & Actions<R>;
  reset: () => void;
  load: () => void;
};

export type StoreValue<S extends Store<unknown>> = S extends Store<infer T>
  ? T
  : never;

export type Loader<T, D extends Store<unknown>[]> = (values: {
  [key in keyof D]: StoreValue<D[key]>;
}) => T;

export type CreateStore = {
  (): Store<unknown>;
  <T>(initialValue: T): Store<
    T extends InitialValue<infer S>
      ? S extends Promise<infer U>
        ? U
        : S extends () => infer V
        ? V
        : S
      : T
  >;
  <T, D extends Store<any>[]>(deps: D, loader: Loader<T, D>): Store<T>;
};

export type State = {
  promise: Promise<any> | null;
  error: Error | null;
  loading: boolean;
  loaded: boolean;
  staled: boolean;
};

export type Listener<T> = {
  (newData: T, state: State): void;
};

export type UnsubsribeFunc = () => void;

export type SubscribeFunc<T> = (
  listener: Listener<T>
) => UnsubsribeFunc | undefined;
