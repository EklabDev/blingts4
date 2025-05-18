import { CacheOptions } from '../../types';

interface CacheEntry {
  value: unknown;
  expiry: number | undefined;
}

const cache = new Map<string, CacheEntry>();
export type WithCache<T, K extends string> = {
  [P in K as `invalidate${Capitalize<P>}`]: () => void;
};

/**
 * Caches method results with optional expiration
 * @param options Cache configuration options
 */
export function Cached(options: CacheOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const { expiryTime, key } = options;
    const methodName = propertyKey;
    const capitalizedName = methodName.charAt(0).toUpperCase() + methodName.slice(1);
    const invalidateMethodName = `invalidate${capitalizedName}`;

    // List of keys related to this method for invalidation
    const methodCacheKeys = new Set<string>();

    // Add invalidation method to the prototype
    const prototype = target.constructor.prototype;
    prototype[invalidateMethodName] = function () {
      methodCacheKeys.forEach(cacheKey => {
        cache.delete(cacheKey);
      });
      methodCacheKeys.clear();
    };

    descriptor.value = function (...args: any[]) {
      const cacheKey =
        typeof key === 'function'
          ? key(...args)
          : `${this.constructor.name}:${methodName}:${JSON.stringify(args)}`;

      methodCacheKeys.add(cacheKey);
      const cached = cache.get(cacheKey);
      if (cached) {
        if (!cached.expiry || cached.expiry > Date.now()) {
          return cached.value;
        }
        cache.delete(cacheKey);
      }

      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result.then(value => {
          cache.set(cacheKey, {
            value,
            expiry: expiryTime ? Date.now() + expiryTime : undefined,
          });
          return value;
        });
      }

      cache.set(cacheKey, {
        value: result,
        expiry: expiryTime ? Date.now() + expiryTime : undefined,
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * Permanently caches method results
 */
export function Memoize() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const memoized = new Map<string, unknown>();
    const methodName = propertyKey;

    descriptor.value = function (...args: any[]) {
      const key = `${methodName}:${JSON.stringify(args)}`;

      if (memoized.has(key)) {
        return memoized.get(key);
      }

      const result = originalMethod.apply(this, args);

      if (result instanceof Promise) {
        return result.then(value => {
          memoized.set(key, value);
          return value;
        });
      }

      memoized.set(key, result);
      return result;
    };

    return descriptor;
  };
}
