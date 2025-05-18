import { z } from 'zod';

/**
 * Validates method arguments using a Zod schema
 * @param schema Zod schema for validation
 */
export function ValidateArgs(schema: z.ZodType) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      try {
        const validatedArgs = schema.parse(args);
        return originalMethod.apply(this, validatedArgs);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Validation failed for ${propertyKey}: ${error.message}`);
        }
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Marks a method as deprecated
 * @param message Optional deprecation message
 */
export function Deprecate(message?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const deprecationMessage = message || `${propertyKey} is deprecated`;

    descriptor.value = function (...args: any[]) {
      console.warn(`Deprecation warning: ${deprecationMessage}`);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Checks for required permissions before executing a method
 * @param permissions Required permissions
 */
export function GuardSync(GuardFn: (...args: any[]) => boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // This is a placeholder implementation. In a real application,
      // you would integrate with your authentication/authorization system

      if (!GuardFn(...args)) {
        throw new Error(`Guard failed for ${propertyKey}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export function GuardAsync(GuardFn: (...args: any[]) => Promise<boolean>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // This is a placeholder implementation. In a real application,
      // you would integrate with your authentication/authorization system

      if (!(await GuardFn(...args))) {
        throw new Error(`Guard failed for ${propertyKey}`);
      }

      return await originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Implements rate limiting for a method
 * @param options Rate limit configuration
 */
export function RateLimited(options: { limit: number; window: number }) {
  // Create a shared rate limit tracker for the decorator
  // This ensures rate limits are tracked across all instances
  const rateLimitState = new Map<string, number[]>();

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const { limit, window } = options;
    const methodName = propertyKey;

    descriptor.value = function (...args: any[]) {
      const now = Date.now();
      const windowStart = now - window;

      // Create a key that combines instance class name and method name
      // This helps isolate rate limits appropriately
      const instanceId = this.constructor.name;
      const key = `${instanceId}:${methodName}`;

      // Get or initialize the request timestamps for this key
      let requestTimestamps = rateLimitState.get(key) || [];

      // Clean up old requests that are outside the current window
      requestTimestamps = requestTimestamps.filter(timestamp => timestamp > windowStart);

      // Check if rate limit is exceeded
      if (requestTimestamps.length >= limit) {
        const oldestRequest = Math.min(...requestTimestamps);
        const resetTime = oldestRequest + window - now;
        throw new Error(
          `Rate limit exceeded for ${methodName}. ` +
            `Try again in ${Math.ceil(resetTime / 1000)} seconds.`
        );
      }

      // Record this request
      requestTimestamps.push(now);
      rateLimitState.set(key, requestTimestamps);

      // Execute the original method
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
