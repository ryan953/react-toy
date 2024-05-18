import { mapToObj, isSameDependencyList } from './utils.mjs'

let __renderTree;

class RenderTree {
  __current_path = '';
  __current_child = -1;
  __current_hook = -1;
  __elemCleanups = [];
  
  __state = {
    toJSON: () => mapToObj(this.__state.values),
    values: new Map(),
  };

  constructor(elem, builder) {
    this.elem = elem;
    this.builder = builder;
  }

  render() {
    console.log('--- rerender ---');
    
    this.__unmount();
    this.__mount();
  }

  registerCleanup(callback) {
    this.__elemCleanups.push(callback);
  }

  __unmount() {
    this.__elemCleanups.forEach(cleanup => {
      cleanup();
    });

    this.__current_path = 'root';
    this.__current_child = 0;
    this.__current_hook = 0;

    Array.from(this.elem.children).forEach((child) => {
      this.elem.removeChild(child);
    });
  }

  __mount() {
    const component = this.builder();
    this.elem.appendChild(component());
    this.elem.querySelector('[data-autofocus="true"')?.focus();
  }

  renderWithPath(name, callback) {
    const parentPath = this.__current_path;
    const parentHook = this.__current_hook;

    const segment = `${name}[${this.__current_child++}]`;
    this.__current_path = [this.__current_path, segment].join('|');
    this.__current_hook = 0;

    const result = callback();

    this.__current_path = parentPath;
    this.__current_hook == parentHook;

    return result;
  }

  hookKey() {
    return `${this.__current_path}[${this.__current_hook++}]`;
  }

  useStorage(type, {insert, update, after}) {
    const key = __renderTree.hookKey();

    const get = () => this.__state.values.get(key);
    const set = (value) => this.__state.values.set(key, value);

    const logValues = {};

    if (this.__state.values.has(key)) {
      logValues.prevState = get();
      update({get, set});
      logValues.newState = get();
    } else {
      insert({get, set});
      logValues.state = get();
    }
    
    const result = after({get});
    console.log(type, {key, ...logValues, result, USE_STATE: this.__state.toJSON()});
    return result;
  }
}

const buildTag = (tag, attrs, children) => {
  if (tag === '') {
    return children;
  }
  const elem = document.createElement(tag);
  Object.entries(attrs).forEach(([name, value]) => {
    if (name.startsWith('on')) {
      const type = name.replace(/^on/, '').toLowerCase();
      elem.addEventListener(type, value);
      __renderTree.registerCleanup(() => {
        elem.removeEventListener(type, value);
      });
    } else {
      elem.setAttribute(name, value);
    }
  });
  children.forEach(child => {
    if (typeof child === 'string') {
      const text = document.createTextNode(child);
      elem.appendChild(text);
    } else {
      const children = child();
      if (children instanceof Array) {
        children.forEach((c) => {
          elem.appendChild(c());
        });
      } else {
        elem.appendChild(children);
      }
    }
  });
  return elem;
}

const buildComponent = (component, attrs, children) => {
  console.group('render', component.name, attrs);
  const rendered = __renderTree.renderWithPath(component.name, () => {
    return component(attrs, children);
  })();
  console.groupEnd();
  return rendered;
}

export function createElement(tagOrComponent, attrs, children) {
  return () => {
    return typeof tagOrComponent === 'string'
      ? buildTag(tagOrComponent, attrs, children)
      : buildComponent(tagOrComponent, attrs, children);
  };
};

export function render(elem, builder) {
  __renderTree = new RenderTree(elem, builder);
  __renderTree.render();
};

export function useState(dflt) {
  return __renderTree.useStorage(
    'useState',
    {
      insert: ({get, set}) => {
        set([
          dflt,
          (callback) => {
            const [prevState, prevSetState] = get();
            const newState = callback(prevState);
            set([newState, prevSetState]);
            __renderTree.render();
          },
        ]);
      },
      update: () => {
        // No updates happen via useState()
      },
      after: ({get}) => get(),
    }
  );
};

const memoCallbackHook = (callback, deps) => ({
  insert: ({set}) => {
    set([deps, callback()]);
  },
  update: ({get, set}) => {
    const [prevDeps] = get();
    if (!isSameDependencyList(prevDeps, deps)) {
      const newValue = callback();
      set([deps, newValue]);
    }
  },
  after: ({get}) => {
    const [, value] = get();
    return value;
  },
});

export function useMemo(callback, deps) {
  return __renderTree.useStorage('useMemo', memoCallbackHook(callback, deps));
};

export function useCallback(callback, deps) {
  return __renderTree.useStorage('useCallback', memoCallbackHook(() => callback, deps));
}

export function useEffect(callback, deps) {
  return __renderTree.useStorage(
    'useEffect',
    {
      insert: ({set}) => {
        const cleanup = callback() ?? (() => {});
        __renderTree.registerCleanup(cleanup);
        set([deps, cleanup]);
      },
      update: ({get, set}) => {
        const [prevDeps, prevCleanup] = get();
        if (!isSameDependencyList(prevDeps, deps)) {
          prevCleanup();

          const newCleanup = callback() ?? (() => {});
          __renderTree.registerCleanup(newCleanup);
          set([deps, newCleanup]);
        }
      },
      after: () => {
        // Nothing is returned from useEffect()
      },
    },
  );
};

