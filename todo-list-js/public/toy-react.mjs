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

export function useState(dflt) {
  const key = __hook_key('useState');
  
  if (!STATE.values.has(key)) {
    STATE.values.set(key, dflt);
  }
  const value = STATE.values.get(key);
  console.log('useState', {key, value, dflt, USE_STATE: STATE.toJSON()});

  if (!STATE.setters.has(key)) {
    STATE.setters.set(key, (callback) => {
      const prevState = STATE.values.get(key);
      const newState = callback(prevState);
      console.log('setState', {key, prevState, newState, USE_STATE: STATE.toJSON()});
      STATE.values.set(key, newState);
      __rerender();
    });
  }
  const setState = STATE.setters.get(key);

  return [value, setState];
};

export function useMemo(callback, deps) {
  const key = __hook_key('useMemo');
  
  if (STATE.values.has(key)) {
    const {deps: prevDeps, value: prevValue} = STATE.values.get(key);
    if (isSameDependencyList(prevDeps, deps)) {
      console.log('useMemo', {key, prevValue, USE_STATE: STATE.toJSON()});
      return prevValue;
    } else {
      const newValue = callback();
      console.log('useMemo', {key, prevValue, newValue, USE_STATE: STATE.toJSON()});
      STATE.values.set(key, {deps, value: newValue});
      return newValue;
    }
  } else {
    const value = callback();
    console.log('useMemo', {key, value, USE_STATE: STATE.toJSON()});
    STATE.values.set(key, {deps, value});
    return value;
  }
};

export function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}

export function useEffect(callback, deps) {
  const key = __hook_key('useEffect');

  if (STATE.values.has(key)) {
    const {deps: prevDeps, cleanup: prevCleanup} = STATE.values.get(key);
    if (isSameDependencyList(prevDeps, deps)) {
      console.log('useEffect', {key, USE_STATE: STATE.toJSON()});
    } else {
      prevCleanup();

      const newCleanup = callback() ?? (() => {});
      __elemCleanups.push(newCleanup);
      console.log('useEffect', {key, newCleanup, USE_STATE: STATE.toJSON()});
      STATE.values.set(key, {deps, cleanup: newCleanup});
    }
  } else {
    const cleanup = callback() ?? (() => {});
    __elemCleanups.push(cleanup);
    console.log('useEffect', {key, cleanup, USE_STATE: STATE.toJSON()});
    STATE.values.set(key, {deps, cleanup});
  }
};

