import { cloneDeep, isFunction } from "lodash";
import {
  XInternalCreateStore,
  PromiseStatus,
  Reducers,
  Listener,
  StoreWithReducer,
  Store,
  LazyStore,
  DefaultState,
  StoreType,
  Options,
  XCreateLazyStore,
  XLazyStore,
} from "./types";
import { isPromise } from "./utils";

const MINUTE = 1000 * 60;

const init = (): XCreateLazyStore => {
  const cache = new WeakMap();
  const defaultValues = new WeakMap();
  const stores = new Map<any, StoreWithReducer<any> | Store<any>>();

  if (process.env.NODE_ENV === "development") {
    Object.assign(window, { cache, defaultValues, stores });
  }

  const terminateStore = (key: any) => {
    const store = stores.get(key);
    if (!store) {
      return;
    }
    defaultValues.delete(store);
    cache.delete(store);
    stores.delete(key);
  };

  const internallyCreateStore: XInternalCreateStore = <
    T,
    R = Reducers<T>,
    A extends {
      [K in keyof R]: R[K] extends (_: T, ...args: infer A) => void
        ? (...args: A) => void
        : never;
    } = { [K in keyof R]: never }
  >(
    defaultState: DefaultState<T>,
    options: Options
  ) => {
    const listeners = new Set<Listener<T>>();
    let suspender: Promise<void> | null = null;
    let status: PromiseStatus = PromiseStatus.idle;
    let error: Error | null = null;
    let revalidateInterval: Timer | null = null;
    const getDefaultState = isFunction(defaultState)
      ? defaultState
      : () => defaultState;

    const cleanup = () => {
      onCleanup?.(store);
      terminateStore(defaultState);
      revalidateInterval && clearInterval(revalidateInterval);
      revalidateInterval = null;
    };

    const invalidateStore = () => {
      if (listeners.size === 0) {
        cleanup();
        return;
      }
      if (isFunction(defaultState)) {
        defaultValues.delete(store);
      }
    };

    // if (revalidate) {
    //   revalidateInterval = setInterval(invalidateStore, revalidate);
    // }

    // const restartRevalidateInterval = () => {
    //   if (revalidateInterval) {
    //     clearInterval(revalidateInterval);
    //   }

    // //   revalidateInterval = setInterval(invalidateStore, revalidate);
    // };

    const updateCache = (state: T) => {
      cache.set(store, state);
    };

    const setDefaultValue = (value: T) => {
      if (defaultValues.has(store)) {
        return;
      }
      defaultValues.set(store, cloneDeep(value));
    };

    const extractData = (state: DefaultState<T>, setAsDefault?: boolean): T => {
      if (isFunction(state)) {
        return extractData(state(), setAsDefault);
      }

      if (!isPromise(state)) {
        error = null;
        updateCache(state);
        if (setAsDefault) {
          setDefaultValue(state);
        }
        publish();
        return cache.get(store);
      }

      status = PromiseStatus.pending;
      publish();
      suspender = state
        .then(
          (v) => {
            if (setAsDefault) {
              setDefaultValue(v);
            }
            updateCache(v);
            status = PromiseStatus.success;
            error = null;
          },
          (e) => {
            error = e;
            status = PromiseStatus.error;
          }
        )
        .finally(() => {
          suspender = null;
          publish();
        });

      return cache.get(store);
    };

    const getData = (state?: T | Promise<T>) => {
      if (!state && cache.has(store)) {
        return cache.get(store);
      }

      if (!defaultState) {
        return undefined;
      }

      // Throw the promise/error if it's still pending/errored out
      if (suspender) {
        throw suspender;
      }

      if (error) {
        throw error;
      }

      return extractData(state || defaultState, !state);
    };

    const publish = () => {
      listeners.forEach((listener) => {
        listener(cache.get(store), status);
      });
    };

    const update = async (newState: T | Promise<T>) => {
      extractData(newState);
      //   restartRevalidateInterval();
    };

    const subscribe = (listener: Listener<T>) => {
      listeners.add(listener);
      return listener;
    };

    const unsubscribe = (listener: Listener<T>) => {
      listeners.delete(listener);
    };

    const reset = () => {
      if (
        (!defaultValues.has(store) && defaultState) ||
        isFunction(defaultState)
      ) {
        extractData(defaultState, true);
        return;
      }
      update(cloneDeep(defaultValues.get(store)));
    };

    const use = <
      R extends Reducers<T>,
      A extends {
        [K in keyof R]: R[K] extends (_: T, ...args: infer A) => void
          ? (...args: A) => void
          : never;
      }
    >(
      reducers: R
    ): StoreWithReducer<T, R, A> => {
      const actions: Record<string, (...args: never[]) => void> = {};

      Object.entries(reducers).forEach(([key, reducer]) => {
        if (key in store) {
          return;
        }

        const action = (...args: never[]) => {
          const reduced = reducer(store.value, ...args);
          update(reduced);
        };

        actions[key] = action;
      });

      return Object.assign<Store<T>, A>(store, actions as A);
    };

    const store: Store<T> = {
      get __type__() {
        return StoreType.Normal as StoreType.Normal;
      },
      get value() {
        return getData();
      },
      set value(newValue: T) {
        update(newValue);
      },
      get status() {
        return status;
      },
      update,
      subscribe,
      unsubscribe,
      reset,
      use,
    };

    stores.set(defaultState, store);

    return stores.get(defaultState) as StoreWithReducer<T, R, A>;
  };

  const getStore: XInternalCreateStore = <T>(
    ...args: any[]
  ): StoreWithReducer<T> => {
    const key = isFunction(args[1]) ? args[1] : args[0];
    if (stores.has(key)) {
      return stores.get(key) as StoreWithReducer<T>;
    }

    const newStore = internallyCreateStore<T>(...args);
    return newStore;
  };

  const createStore: XCreateLazyStore = <T>(...params: any[]) => {
    const defaultReducers: Reducers<T> = {};

    const load: XInternalCreateStore = (defaultState?: DefaultState<T>) => {
      // const store = getStore<T>(defaultState ? defaultState : ...params);
      const store = defaultState
        ? getStore<T>(defaultState)
        : getStore<T>(...params);
      store.use(defaultReducers);
      return store;
    };

    const use = <
      R extends Reducers<T>,
      A extends {
        [K in keyof R]: R[K] extends (_: T, ...args: infer A) => void
          ? (...args: A) => void
          : never;
      }
    >(
      reducers: R
    ): XLazyStore<T, R, A> => {
      Object.entries(reducers).forEach(([key, reducer]) => {
        defaultReducers[key] = reducer;
      });

      return payload as XLazyStore<T, R, A>;
    };

    const payload: LazyStore<T> = {
      get __type__() {
        return StoreType.Lazy as StoreType.Lazy;
      },
      use,
      load,
    };

    return payload;
  };

  return createStore;
};

export const createStore = init();

const store = createStore("hehe");

const moreStore = createStore(
  [store] as const,
  ([yo]) => {
    return "hehe";
  },
  { revalidate: 1 }
);
