import { isPromise } from "./utils";
import {
  CreateStore,
  InitialValue,
  State,
  Store,
  SubscribeFunc,
  Listener,
  Actions,
} from "./types";
import { isDepsArgs, isStandaloneArgs } from "./utils";

const init = () => {
  const cache = new Map();
  const defaultValues = new Map();
  const stores = new Map();

  const createStore: CreateStore = <T>(...args: any[]) => {
    let data: T;
    const state: State = {
      promise: null,
      error: null,
      loading: false,
      loaded: false,
      staled: false,
    };

    const listeners = new Set<Listener<T>>();
    const notify = () => {
      listeners.forEach((listener) => {
        listener(data, state);
      });
    };

    const loaderWrapper = () => {
      if (!isDepsArgs<T, Store<any>[]>(args)) {
        return;
      }
      const [deps, loader] = args;
      if (state.promise) {
        state.loading = true;
        state.promise
          .then(loaderWrapper)
          .catch((e) => (state.error = e))
          .finally(() => {
            state.loading = false;
            state.promise = null;
            notify();
          });
        notify();
        return;
      }

      const pendingPromises = new Array<Promise<any>>();
      for (let i = 0; i < deps.length; i++) {
        const dep = deps[i];
        if (dep.promise) {
          pendingPromises.push(dep.promise);
        }
      }

      if (pendingPromises.length > 0) {
        state.loading = true;
        state.promise = Promise.all(pendingPromises)
          .then(loaderWrapper)
          .catch((e) => (state.error = e))
          .finally(() => {
            state.loading = false;
            state.promise = null;
            notify();
          });
        notify();
        return;
      }
      setData(loader(deps.map((dep) => dep.data)));
    };

    if (isDepsArgs<T, Store<any>[]>(args)) {
      const [deps] = args;
      deps.forEach((store) => store.subscribe(loaderWrapper));
    }

    const setData = (inputData: InitialValue<T>) => {
      if (isPromise(inputData)) {
        state.loading = true;
        state.promise = inputData
          .then((r) => {
            data = r;
            state.error = null;
          })
          .catch((e) => (state.error = e))
          .finally(() => {
            state.loading = false;
            state.promise = null;
            notify();
          });

        notify();
        return data;
      }

      if (typeof inputData === "function") {
        return setData((inputData as (() => T) | (() => Promise<T>))());
      }

      data = inputData;
      notify();
    };

    const load = () => {
      if (state.loaded) {
        return;
      }
      state.loaded = true;
      if (isDepsArgs<T, Store<any>[]>(args)) {
        const [deps] = args;
        deps.forEach((dep) => dep.load());
        loaderWrapper();
        return;
      }
      if (isStandaloneArgs<T>(args)) {
        const intitialValue = args[0];
        setData(intitialValue);
        return;
      }
    };

    const getData = (): T => {
      load();
      if (data) {
        return data;
      }

      if (state.promise) {
        throw state.promise;
      }

      if (state.error) {
        throw state.error;
      }

      return data;
    };

    const update = (newValue: InitialValue<T>) => {
      setData(newValue);
    };

    const reset = () => {
      if (isStandaloneArgs<T>(args)) {
        state.loaded = false;
        load();
      }
    };

    const subscribe: SubscribeFunc<T> = (listener) => {
      if (!listeners.has(listener)) {
        listeners.add(listener);
      }

      return () => {
        listeners.delete(listener);
      };
    };

    const use: Store<T>["use"] = (reducers) => {
      const actions = Object.entries(reducers).reduce((acc, [key, reducer]) => {
        return {
          ...acc,
          [key]: (...args: any[]) => {
            update(reducer(data, ...args));
          },
        };
      }, {} as Actions<typeof reducers>);
      const s = Object.assign(store, actions);
      return s;
    };

    const store: Store<T> = {
      get data() {
        return getData();
      },
      get loading() {
        return state.loading;
      },
      get promise() {
        return state.promise;
      },
      get loaded() {
        return state.loaded;
      },
      update,
      subscribe,
      use,
      reset,
      load,
    };

    return store;
  };

  return createStore;
};

export const createStore = init();
