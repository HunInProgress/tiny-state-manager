import { Store, UnsubsribeFunc } from "@tiny-state-manager/x";
import { useState, useRef, useEffect } from "react";

export function useStore<T>(store: Store<T>, wait?: boolean) {
  const [_, update] = useState<{}>({});
  const unsubRef = useRef<UnsubsribeFunc>();
  const [s] = useState(() => {
    store.subscribe(() => {
      update({});
    });

    return store;
  });

  useEffect(() => unsubRef.current, []);

  if (wait && s?.promise) {
    throw s.promise;
  }

  return s;
}
