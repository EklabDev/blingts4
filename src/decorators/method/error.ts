import { RetryOptions, CircuitBreakerOptions } from '../../types';

/**
 * Retries a method call on failure
 * @param options Retry configuration options
 */
export function Retry(options: RetryOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const { maxRetries, strategy, backoff = 1000, onRetry } = options;

    descriptor.value = function (...args: any[]): Promise<any> {
      let attempts = 0;

      const execute = async (): Promise<any> => {
        try {
          attempts++; // Increment attempts at the beginning

          const result = originalMethod.apply(this, args);

          // Handle both synchronous results and promises
          if (result instanceof Promise) {
            return await result; // This will throw if the promise is rejected
          }

          return result;
        } catch (error) {
          // If we've exceeded max retries, rethrow the error
          if (attempts >= maxRetries + 1) {
            // +1 because we're counting the initial attempt
            throw error;
          }

          if (onRetry) {
            onRetry(error as Error, attempts);
          }

          const delay = strategy === 'exponential' ? backoff * Math.pow(2, attempts - 1) : backoff;

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));

          // Retry the operation
          return execute();
        }
      };

      return execute();
    };

    return descriptor;
  };
}

/**
 * Limits the execution time of a method
 * @param ms Timeout in milliseconds
 */
export function Timeout(ms: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = propertyKey;

    descriptor.value = function (...args: any[]): Promise<any> {
      const methodPromise = Promise.resolve(originalMethod.apply(this, args));
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${methodName} timed out after ${ms}ms`));
        }, ms);
      });

      return Promise.race([methodPromise, timeoutPromise]);
    };

    return descriptor;
  };
}

/**
 * Implements the circuit breaker pattern
 * @param options Circuit breaker configuration options
 */
export function CircuitBreaker(options: CircuitBreakerOptions) {
  // Create a shared state object for this specific circuit breaker
  const circuitState = {
    failures: 0,
    state: 'closed' as 'closed' | 'open' | 'half-open',
    lastFailureTime: 0,
  };

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // Functions to manage circuit state
    function updateState(newState: 'closed' | 'open' | 'half-open'): void {
      if (circuitState.state !== newState) {
        circuitState.state = newState;
        options.onStateChange?.(newState);
      }
    }

    function handleFailure(error: Error): void {
      circuitState.failures++;
      circuitState.lastFailureTime = Date.now();

      if (circuitState.failures >= options.failureThreshold) {
        updateState('open');
      }
    }

    descriptor.value = function (...args: any[]): Promise<any> {
      // Always return a Promise for consistent handling
      return new Promise((resolve, reject) => {
        // Check if circuit is open
        if (circuitState.state === 'open') {
          // Check if we should transition to half-open
          if (Date.now() - circuitState.lastFailureTime >= options.resetTimeout) {
            updateState('half-open');
          } else {
            // Still open - reject with circuit breaker error
            reject(new Error('Circuit breaker is open'));
            return;
          }
        }

        try {
          const result = originalMethod.apply(this, args);

          if (result instanceof Promise) {
            result
              .then(value => {
                // Success in half-open state - transition to closed
                if (circuitState.state === 'half-open') {
                  updateState('closed');
                  circuitState.failures = 0;
                }
                resolve(value);
              })
              .catch(error => {
                handleFailure(error);
                reject(error);
              });
          } else {
            // Synchronous success
            if (circuitState.state === 'half-open') {
              updateState('closed');
              circuitState.failures = 0;
            }
            resolve(result);
          }
        } catch (error) {
          handleFailure(error as Error);
          reject(error);
        }
      });
    };

    return descriptor;
  };
}

/**
 * Provides a fallback implementation when the method fails
 * @param fallbackFn Fallback function to execute
 */
export function Fallback<T extends (...args: any[]) => any>(fallbackFn: T) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]): any {
      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result.catch(error => {
            return fallbackFn.apply(this, args);
          });
        }

        return result;
      } catch (error) {
        return fallbackFn.apply(this, args);
      }
    };

    return descriptor;
  };
}
