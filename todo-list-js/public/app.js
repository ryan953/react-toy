const _e = toy.createElement;

function App() {
  const items = [];
  const addItem = (item) => {
    console.log('adding item', item)
  };

  return _e('div', {class: 'App'}, [
    _e('header', {class: 'App-header'}, [
      _e('h1', {}, [
        'JS TODO List',
      ]),
    ]),
    _e('main', {class: 'App-main'}, [
      TodoList({items}),
      AddTodo({addItem}),
    ]),
  ]);
}

function TodoList({items}) {
  return _e('ol', {}, 
    items.map(item => {
      return TodoItem({item});
    })
  );
}

function TodoItem({item}) {
  return _e('li', {}, [
    item.done
      ? _e('strike', {}, [item.name])
      : item.name
  ]);
}

function AddTodo({addItem}) {
  return _e('form', {onSubmit: (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    addItem({
      name: formData.get('todo'),
      done: false,
    });
    event.target.reset();
  }}, [
    _e('input', {type: 'text', name: 'todo', autofocus: true}, []),
    _e('button', {type: 'submit'}, ['Create']),
  ]);
}
