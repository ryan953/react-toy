import {
  createElement as _n,
  useCallback,
  useEffect,
  useMemo,
  useState,
 } from "./toy-react.mjs";

export default function App() {
  return (
    _n('div', {class: 'App'}, [
      _n('header', {class: 'App-header'}, [
        _n('h1', {}, [
          'JS TODO List',
        ]),
      ]),
      _n('main', {class: 'App-main'}, [
        _n(Todo, {}, []),
      ])
    ])
  );
}

function Todo() {
  const [items, setItems] = useState([]);

  const updateItem = useCallback((orig, change) => {
    setItems(prev => {
      return prev.toSpliced(
        items.findIndex(item => item === orig),
        1,
        change(orig),
      );
    });
  }, [items]);

  const addItem = useCallback((newItem) => {
    setItems(prev => {
      return [...prev, newItem];
    })
  }, []);

  return (
    _n('', {}, [
      _n(TodoList, { items, updateItem }, []),
      _n(AddTodo, { addItem }, []),
    ])
  );
}

function TodoList({items, updateItem}) {
  useEffect(() => {
    document.title = `${items.length} Items`;
  }, [items.length]);

  return (
    _n('ol', {}, 
      items.map(item => {
        return _n(TodoItem, {item, onToggle: () => {
          updateItem(item, (prev) => ({...prev, done: !prev.done}))
        }}, []);
      })
    )
  );
}

function TodoItem({item, onToggle}) {
  return (
    _n('li', {onClick: onToggle}, [
      item.done
        ? _n('strike', {}, [item.name])
        : item.name
    ])
  );
}

function AddTodo({addItem}) {
  return (
    _n('form', {onSubmit: (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      addItem({
        name: formData.get('todo'),
        done: false,
      });
      event.target.reset();
    }}, [
      _n('input', {type: 'text', name: 'todo', 'data-autofocus': true}, []),
      _n('button', {type: 'submit'}, ['Create']),
    ])
  );
}
