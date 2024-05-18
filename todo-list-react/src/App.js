import * as React from 'react';
import './App.css';

function App() {
  const [items, setItems] = React.useState([]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          React TODO List
        </h1>
      </header>
      <main className="App-main">
        <TodoList items={items} />
        <AddTodo addItem={(newItem) => {
          setItems(prev => {
            return [...prev, newItem];
          });
        }} />
      </main>
    </div>
  );
}

function TodoList({items}) {
  return (
    <ol>
      {items.map(item => {
        return <TodoItem item={item} />;
      })}
    </ol>
  );
}

function TodoItem({item}) {
  return (
    <li>
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

export default App;
