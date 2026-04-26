import { container as rootContainer, type DependencyContainer, type InjectionToken } from 'tsyringe';

export class Container {
  constructor(private readonly c: DependencyContainer = rootContainer.createChildContainer()) {}

  bind<T>(token: InjectionToken<T>, factory: (c: Container) => T): this {
    this.c.register(token as InjectionToken<T>, {
      useFactory: () => factory(this),
    });
    return this;
  }

  singleton<T>(token: InjectionToken<T>, factory: (c: Container) => T): this {
    let cached: T | undefined;
    this.c.register(token as InjectionToken<T>, {
      useFactory: () => {
        if (cached === undefined) cached = factory(this);
        return cached;
      },
    });
    return this;
  }

  instance<T>(token: InjectionToken<T>, value: T): this {
    this.c.registerInstance(token as InjectionToken<T>, value);
    return this;
  }

  resolve<T>(token: InjectionToken<T>): T {
    return this.c.resolve<T>(token);
  }

  has(token: InjectionToken<unknown>): boolean {
    return this.c.isRegistered(token as InjectionToken<unknown>, true);
  }

  createScope(): Container {
    return new Container(this.c.createChildContainer());
  }

  raw(): DependencyContainer {
    return this.c;
  }
}
