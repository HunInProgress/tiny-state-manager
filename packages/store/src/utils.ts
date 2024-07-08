export const joinIds = (...ids: string[]) => ids.join('_');

export const isPromise = <T>(thing: T | Promise<T>): thing is Promise<T> => {
    return thing instanceof Promise;
  };