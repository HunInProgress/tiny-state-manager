import { useEffect, useState } from "react";
import {
  LazyStore,
  Reducers,
  StoreParams,
  StoreType,
  StoreWithReducer,
} from "@tiny-state-manager/store";

export function useStore<
  T,
  R = Reducers<T>,
  A extends {
    [K in keyof R]: R[K] extends (_: T, ...args: infer A) => void
      ? (...args: A) => void
      : never;
  } = { [K in keyof R]: never }
>(store: StoreWithReducer<T, R, A>): StoreWithReducer<T, R, A>;

export function useStore<
  T,
  R = Reducers<T>,
  A extends {
    [K in keyof R]: R[K] extends (_: T, ...args: infer A) => void
      ? (...args: A) => void
      : never;
  } = { [K in keyof R]: never }
>(
  lazyStore: LazyStore<T, R, A>,
  params?: StoreParams<T>
): StoreWithReducer<T, R, A>;

export function useStore<
  T,
  R = Reducers<T>,
  A extends {
    [K in keyof R]: R[K] extends (_: T, ...args: infer A) => void
      ? (...args: A) => void
      : never;
  } = { [K in keyof R]: never }
>(
  lazyStore: LazyStore<T, R, A> | StoreWithReducer<T, R, A>,
  params?: StoreParams<T>
): StoreWithReducer<T, R, A> {
  const [, update] = useState({});
  const store =
    lazyStore.__type__ === StoreType.Lazy ? lazyStore.load(params) : lazyStore;

  useEffect(() => {
    const listener = store.subscribe(() => {
      update({});
    });

    return () => {
      store.unsubscribe(listener);
    };
  }, [store]);

  store.value;

  return store;
}

// function useStore<T>(store: Store<T>, wait?: boolean) {
//   const [state, setState] = useState<State>();
//   const [_, setData] = useState<T>(store.data as T);
//   const [s] = useState(() => {
//     store.subscribe((data, state) => {
//       setData(data);
//       setState(state);
//     });
//     return store;
//   });

//   if (wait && state?.promise) {
//     throw state.promise;
//   }

//   return s;
// }
