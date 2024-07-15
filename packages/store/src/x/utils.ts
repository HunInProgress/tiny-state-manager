import { Store, Loader } from "./types";

export const isPromise = <T>(thing: T | Promise<T>): thing is Promise<T> => {
  return thing instanceof Promise;
};

export const isDepsArgs = <T, D extends Store<any>[]>(
  args: any[]
): args is [D, Loader<T, D>] => {
  return args.length > 1;
};

export const isStandaloneArgs = <T>(args: any[]): args is [T] => {
  return args.length === 1;
};
