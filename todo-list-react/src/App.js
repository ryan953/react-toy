import {
  //
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

export default function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>
          React TODO List
        </h1>
      </header>
      <main className="App-main">
        <Todo />
      </main>
    </div>
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
    <>
      <TodoList items={items} updateItem={updateItem} />
      <AddTodo addItem={addItem} />
    </>
  )
}

function TodoList({items, updateItem}) {
  useEffect(() => {
    document.title = `${items.length} Items`;
  }, [items.length]);

  return (
    <ol>
      {items.map(item => {
        return <TodoItem item={item} onToggle={() => {
          updateItem(item, (prev) => ({...prev, done: !prev.done}))
        }} />;
      })}
    </ol>
  );
}

function TodoItem({item, onToggle}) {
  return (
    <li onClick={onToggle}>
      {item.done
        ? <strike>{item.name}</strike>
        : item.name}
    </li>
  );
}

function AddTodo({addItem}) {
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      addItem({
        name: formData.get('todo'),
        done: false,
      });
      event.target.reset();
    }}>
      <input type="text" name="todo" autoFocus />
      <button type="submit">Create</button>
    </form>
  );
}
