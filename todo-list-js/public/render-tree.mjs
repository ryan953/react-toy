import { mapToObj } from './utils.mjs'

/**
 * The RenderTree renders tags and components starting from the root, tracking
 * component depth via wrapComponentRender() as it goes. This depth information
 * is used to construct keys for hook storage, so that successive renders will
 * find cached data which is exposed via useStorage.
 * 
 * Cleanup routines are not implemented. There is no virtual DOM to uniquely 
 * identify and track each component that is rendered, therefore if you construct
 * dynamic component trees then there will be key collisions as old data is not 
 * evicted from storage.
 */
export default class RenderTree {
  __current_path = '';
  __current_child = -1;
  __current_hook = -1;
  __cleanups = [];
  
  __storage = new Map();

  constructor(elem, rootComponent) {
    this.elem = elem;
    this.rootComponent = rootComponent;
  }

  renderFullTree() {
    console.log('--- renderFullTree ---');
    
    this.__unmount();
    this.__mount();
  }

  registerCleanup(callback) {
    this.__cleanups.push(callback);
  }

  __unmount() {
    while(this.__cleanups.length) {
      const cleanup = this.__cleanups.pop();
      cleanup();
    }

    this.__current_path = 'root';
    this.__current_child = 0;
    this.__current_hook = 0;

    Array.from(this.elem.children).forEach((child) => {
      this.elem.removeChild(child);
    });
  }

  __mount() {
    const component = this.rootComponent();
    this.elem.appendChild(component());
    this.elem.querySelector('[data-autofocus="true"')?.focus();
  }

  wrapComponentRender(name, callback) {
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

  /**
   * useStorage exists to demonstrate that hooks can be implemented in terms of
   * one big internal storage map.
   * This implementation includes setting and reading values back, it does not
   * evict values if their specific component is removed from the dom.
   */
  useStorage(type, {insert, update, after}) {
    const key =`${this.__current_path}[${this.__current_hook++}]`;

    const get = () => this.__storage.get(key);
    const set = (value) => this.__storage.set(key, value);

    const logValues = {};

    if (this.__storage.has(key)) {
      logValues.prevState = get();
      update({get, set});
      logValues.newState = get();
    } else {
      insert({get, set});
      logValues.state = get();
    }
    
    const result = after({get});
    console.log(type, {key, ...logValues, result, USE_STATE: mapToObj(this.__storage)});
    return result;
  }
}
