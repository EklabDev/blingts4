/**
 * Auto-generates a getter for a field
 */
export function Getter() {
  return function (target: any, propertyKey: string) {
    const fieldName = propertyKey;
    const capitalizedName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    const getterName = `get${capitalizedName}`;

    // Add the getter method to the class prototype
    Object.defineProperty(target.constructor.prototype, getterName, {
      value: function () {
        return this[fieldName];
      },
      enumerable: false,
      configurable: true,
      writable: true,
    });
  };
}

/**
 * Auto-generates a setter for a field
 */
export function Setter() {
  return function (target: any, propertyKey: string) {
    const fieldName = propertyKey;
    const capitalizedName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    const setterName = `set${capitalizedName}`;

    // Add the setter method to the class prototype
    Object.defineProperty(target.constructor.prototype, setterName, {
      value: function (value: any) {
        this[fieldName] = value;
        return this;
      },
      enumerable: false,
      configurable: true,
      writable: true,
    });
  };
}

/**
 * Auto-generates a builder method for a field
 */
export function Builder() {
  return function (target: any, propertyKey: string) {
    const fieldName = propertyKey;
    const capitalizedName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    const builderName = `with${capitalizedName}`;

    // Add the builder method to the class prototype
    Object.defineProperty(target.constructor.prototype, builderName, {
      value: function (value: any) {
        this[fieldName] = value;
        return this;
      },
      enumerable: false,
      configurable: true,
      writable: true,
    });
  };
}

type Capitalize<S extends string> = S extends `${infer F}${infer R}` ? `${Uppercase<F>}${R}` : S;

export type WithGetter<T, K extends String> = {
  [P in K as `get${Capitalize<string & P>}`]: () => any;
};

export type WithSetter<T, K extends String> = {
  [P in K as `set${Capitalize<string & P>}`]: (value: any) => T;
};

export type WithBuilder<T, K extends String> = {
  [P in K as `with${Capitalize<string & P>}`]: (value: any) => T;
};

/**
 * class Person {
  @Getter()
  name: string = '';

  @Setter()
  age: number = 0;

  @Builder()
  address: string = '';

  constructor(name: string, age: number, address: string) {
    this.name = name;
    this.age = age;
    this.address = address;
  }
}

// Type augmentation for the decorated fields
type PersonWithHelpers = Person &
  WithGetter<Person, 'name'> &
  WithSetter<Person, 'age'> &
  WithBuilder<Person, 'address'>;

// Usage with type casting
const person = new Person('John', 30, '123 Main St') as PersonWithHelpers;
 */
