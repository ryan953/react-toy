(function() {

let elemCleanups = [];
let flushTree = () => {};

window.toy = {
  createElement: (tag, attrs, children) => {
    const elem = document.createElement(tag);
    Object.entries(attrs).forEach(([name, value]) => {
      if (name.startsWith('on')) {
        console.log('adding listener', name, value);
        const type = name.replace(/^on/, '').toLowerCase();
        elem.addEventListener(type, value);
        elemCleanups.push(() => {
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
        elem.appendChild(child);
      }
    });
    return elem;
  },

  render: (elem, builder) => {
    flushTree = () => {
      elemCleanups.forEach(cleanup => {
        cleanup();
      });
      const component = builder();
      elem.appendChild(component);
    };
    flushTree();
  },
};

})();
