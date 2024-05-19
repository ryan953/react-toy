import { isSameDependencyList } from './utils.mjs'
import RenderTree from './render-tree.mjs';

let __renderTree;

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

export function render(elem, rootComponent) {
  __renderTree = new RenderTree(elem, rootComponent);
  __renderTree.render();
};

/**
 * useState is built in terms of useStorage
 * 
 * When `useState()` is first called, we insert a default value, and a setter
 * into storage.
 * When the setter is called we update storage to have a new value, but
 * re-insert the same setter for next time. This preserves the memory reference
 * to the setter function across calls.
 */
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

/**
 * Both useMemo and useCallback will stash the result of a callback into storage,
 * using the deps array as the cache key. The only difference is that useMemo 
 * will invoke the function directly, while useCallback will return the function 
 * itself. Therefore, you can think of `useCallback` is a convenience wrapper
 * for `useMemo(() => callback, [])`.
 * 
 * The `deps` array is a unique Array object each time, while the values inside
 * it are expected to be stable references between calls. For this reason we 
 * don't actually use `deps` as the direct cache-key, but instead insert the
 * array into the cache itself via: `set([deps, value])`. At read time we can
 * shallow-compare deps with what we found in the cache.
 */
const memoCallbackHook = (callback, deps) => ({
  insert: ({set}) => {
    set([deps, callback()]);
  },
  update: ({get, set}) => {
    const [prevDeps] = get();
    if (!isSameDependencyList(prevDeps, deps)) {
      set([deps, callback()]);
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

/**
 * useEffect runs a callback and will stash the result of the callback into
 * storage. The result is then run when the dependencies have changed, or when
 * the component is unmounted (this is not implemented).
 */
export function useEffect(callback, deps) {
  return __renderTree.useStorage(
    'useEffect',
    {
      insert: ({set}) => {
        const cleanup = callback() ?? (() => {});
        set([deps, cleanup]);
      },
      update: ({get, set}) => {
        const [prevDeps, prevCleanup] = get();
        if (!isSameDependencyList(prevDeps, deps)) {
          prevCleanup();

          const newCleanup = callback() ?? (() => {});
          set([deps, newCleanup]);
        }
      },
      after: () => {
        // Nothing is returned from useEffect()
      },
    },
  );
};

