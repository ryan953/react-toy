import { mapToObj, isSameDependencyList } from './utils.mjs'

let __elemCleanups = [];
let __rerender = () => {};

let __current_path = '';
let __current_child = -1;
let __current_hook = -1;
const __hook_key = () => `${__current_path}[${__current_hook++}]`;

const STATE = {
  toJSON: () => mapToObj(STATE.values),
  values: new Map(),
  setters: new Map(),
  withPath: function(name, callback) { 
    const parentPath = __current_path;
    const parentHook = __current_hook;

    const segment = `${name}[${__current_child++}]`;
    __current_path = [__current_path, segment].join('|');
    __current_hook = 0;

    const result = callback();

    __current_path = parentPath;
    __current_hook == parentHook;

    return result;
  },
};

const buildTag = (tag, attrs, children) => {
  const elem = document.createElement(tag);
  Object.entries(attrs).forEach(([name, value]) => {
    if (name.startsWith('on')) {
      const type = name.replace(/^on/, '').toLowerCase();
      elem.addEventListener(type, value);
      __elemCleanups.push(() => {
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
      elem.appendChild(child());
    }
  });
  return elem;
}

const buildComponent = (component, attrs, children) => {
  console.group('render', component.name, attrs);
  const rendered = STATE.withPath(component.name, () => {
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
  __rerender = () => {
    console.log('--- rerender ---');
    __elemCleanups.forEach(cleanup => {
      cleanup();
    });
    __current_path = 'root';
    __current_child = 0;
    __current_hook = 0;

    const component = builder();
    Array.from(elem.children).forEach((child) => {
      elem.removeChild(child);
    });
    elem.appendChild(component());
    elem.querySelector('[data-autofocus="true"')?.focus();
  };
  __rerender();
};

function useStorage(type, {insert, update, after}) {
  const key = __hook_key();

  const get = () => STATE.values.get(key);
  const set = (value) => STATE.values.set(key, value);

  const logValues = {};

  if (STATE.values.has(key)) {
    logValues.prevState = get();
    update({get, set});
    logValues.newState = get();
  } else {
    insert({get, set});
    logValues.state = get();
  }
  
  const result = after({get});
  console.log(type, {key, ...logValues, result, USE_STATE: STATE.toJSON()});
  return result;
}

export function useState(dflt) {
  return useStorage(
    'useState',
    {
      insert: ({get, set}) => {
        set([
          dflt,
          (callback) => {
            const [prevState, prevSetState] = get();
            const newState = callback(prevState);
            set([newState, prevSetState]);
            __rerender();
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
  return useStorage('useMemo', memoCallbackHook(callback, deps));
};

export function useCallback(callback, deps) {
  return useStorage('useCallback', memoCallbackHook(() => callback, deps));
}

export function useEffect(callback, deps) {
  return useStorage(
    'useEffect',
    {
      insert: ({set}) => {
        const cleanup = callback() ?? (() => {});
        __elemCleanups.push(cleanup);
        set([deps, cleanup]);
      },
      update: ({get, set}) => {
        const [prevDeps, prevCleanup] = get();
        if (!isSameDependencyList(prevDeps, deps)) {
          prevCleanup();

          const newCleanup = callback() ?? (() => {});
          __elemCleanups.push(newCleanup);
          set([deps, newCleanup]);
        }
      },
      after: () => {
        // Nothing is returned from useEffect()
      },
    },
  );
};

