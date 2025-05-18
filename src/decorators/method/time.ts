/**
 * Debounce decorator for both sync and async methods
 * @param delay The delay in milliseconds
 */
/**
 * Debounce decorator for synchronous methods
 * @param delay The delay in milliseconds
 */
export function DebounceSync(delay: number) {
  // Global map to store timeouts by class and method name
  const timeoutMap = new Map<string, NodeJS.Timeout>();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = propertyKey;

    descriptor.value = function (...args: any[]): Promise<any> {
      // Create a key using class name and method name
      const key = `${this.constructor.name}.${methodName}`;

      // Clear the previous timeout
      const existingTimeout = timeoutMap.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      return new Promise(resolve => {
        const newTimeout = setTimeout(() => {
          // Execute the original method
          const result = originalMethod.apply(this, args);
          resolve(result);
        }, delay);

        // Store the new timeout ID
        timeoutMap.set(key, newTimeout);
      });
    };

    return descriptor;
  };
}

/**
 * Debounce decorator for asynchronous methods
 * @param delay The delay in milliseconds
 */
export function DebounceAsync(delay: number) {
  // Global map to store timeouts by class and method name
  const timeoutMap = new Map<string, NodeJS.Timeout>();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = propertyKey;

    descriptor.value = function (...args: any[]): Promise<any> {
      // Create a key using class name and method name
      const key = `${this.constructor.name}.${methodName}`;

      // Clear the previous timeout
      const existingTimeout = timeoutMap.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Create a new promise that will resolve when the debounce completes
      const debouncePromise = new Promise(resolve => {
        const newTimeout = setTimeout(() => {
          resolve(null);
        }, delay);

        // Store the new timeout ID
        timeoutMap.set(key, newTimeout);
      });

      // Chain the original method after the debounce completes
      return debouncePromise.then(() => {
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

/**
 * Throttle decorator for synchronous methods
 * @param interval The interval in milliseconds
 */
export function ThrottleSync(interval: number) {
  // Global map to store last call times by class and method name
  const lastCallMap = new Map<string, number>();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = propertyKey;

    descriptor.value = function (...args: any[]): any {
      const now = Date.now();
      const key = `${this.constructor.name}.${methodName}`;
      const lastCall = lastCallMap.get(key) || 0;

      if (now - lastCall >= interval) {
        lastCallMap.set(key, now);
        return originalMethod.apply(this, args);
      }

      return undefined;
    };

    return descriptor;
  };
}

/**
 * Throttle decorator for asynchronous methods
 * @param interval The interval in milliseconds
 */
export function ThrottleAsync(interval: number) {
  // Global maps to store state by class and method name
  const lastCallMap = new Map<string, number>();
  const lastResultMap = new Map<string, any>();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = propertyKey;

    descriptor.value = function (...args: any[]): Promise<any> {
      const now = Date.now();
      const key = `${this.constructor.name}.${methodName}`;
      const lastCall = lastCallMap.get(key) || 0;

      if (now - lastCall >= interval) {
        const result = originalMethod.apply(this, args);
        lastCallMap.set(key, now);
        lastResultMap.set(key, result);
        return result;
      }

      const lastResult = lastResultMap.get(key);
      return lastResult || Promise.resolve(undefined);
    };

    return descriptor;
  };
}

/**
 * Timed decorator for both sync and async methods
 */
export function Timed() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = propertyKey;

    descriptor.value = function (...args: any[]): any {
      const start = performance.now();
      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result.then(
            value => {
              const duration = performance.now() - start;
              console.log(`${this.constructor.name}.${methodName} took ${duration.toFixed(2)}ms`);
              return value;
            },
            error => {
              const duration = performance.now() - start;
              console.log(
                `${this.constructor.name}.${methodName} failed after ${duration.toFixed(2)}ms`
              );
              throw error;
            }
          );
        }

        const duration = performance.now() - start;
        console.log(`${this.constructor.name}.${methodName} took ${duration.toFixed(2)}ms`);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        console.log(`${this.constructor.name}.${methodName} failed after ${duration.toFixed(2)}ms`);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Measure decorator for both sync and async methods
 * @param options Configuration options for measurement
 */
export function Measure(options: { memory?: boolean; logger?: Function } = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const { memory = false, logger = console.log } = options;
    const methodName = propertyKey;

    descriptor.value = function (...args: any[]): any {
      const start = performance.now();
      const startMemory = memory && typeof process !== 'undefined' ? process.memoryUsage() : null;

      try {
        const result = originalMethod.apply(this, args);

        const logMetrics = () => {
          const duration = performance.now() - start;
          const metrics: Record<string, number> = {
            duration: Number(duration.toFixed(2)),
          };

          if (memory && startMemory) {
            const endMemory = process.memoryUsage();
            metrics.memory = endMemory.heapUsed - startMemory.heapUsed;
          }

          logger(`${this.constructor.name}.${methodName} metrics:`, metrics);
        };

        if (result instanceof Promise) {
          return result.then(
            value => {
              logMetrics();
              return value;
            },
            error => {
              logMetrics();
              throw error;
            }
          );
        }

        logMetrics();
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        logger(`${this.constructor.name}.${methodName} failed after ${duration.toFixed(2)}ms`);
        throw error;
      }
    };

    return descriptor;
  };
}
