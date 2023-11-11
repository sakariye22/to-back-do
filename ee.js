const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const app = express();
const mysql = require ('mysql');
const bcrypt = require('bcrypt'); 
const cors = require ('cors');

const port = 3005;

app.use(bodyParser.json());
app.use(cors());


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todos',
  });
  
  db.connect((err) => {
    if (err) throw err;
    console.log('Connected to the database!');
  });
const users = [
  {
    id: 1,
    username: 'example_user',
  },
];

const secretKey = 'yourSecretKey';





app.post('/create-todo', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ message: 'Token not provided in the Authorization header' });
  }

  const tokenWithoutBearer = token.replace('Bearer ', '');

  jwt.verify(tokenWithoutBearer, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    const { userId, githubId } = decoded;
    const { task } = req.body;

    const todo = { user: userId, githubId, task }; // Store both local and GitHub user IDs

    db.query('INSERT INTO todos (user, githubId, task) VALUES (?, ?, ?)', [todo.user, todo.githubId, todo.task], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error creating todo' });
      }

      res.status(201).json({ message: 'Todo created successfully' });
    });
  });
});

  



app.get('/get-todos', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ message: 'Token not provided in the Authorization header' });
  }

  const tokenWithoutBearer = token.replace('Bearer ', '');

  jwt.verify(tokenWithoutBearer, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    const { userId, githubId } = decoded;

    const identifier = userId ? 'user' : 'githubId';
    const query = `SELECT * FROM todos WHERE ${identifier} = ?`;

    db.query(query, [userId || githubId], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Error fetching todos' });
      }

      res.json({ todos: results });
    });
  });
});

  
  app.delete('/delete/:id', (req, res) => {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(401).json({ message: 'Token not provided in the Authorization header' });
    }
  
    const tokenWithoutBearer = token.replace('Bearer ', '');
  
    jwt.verify(tokenWithoutBearer, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token is not valid' });
      }
  
      const { userId } = decoded;
      const todoId = req.params.id;
  
      db.query('SELECT * FROM todos WHERE id = ? AND user = ?', [todoId, userId], (err, results) => {
        if (err) {
          return res.status(500).json({ message: 'Error deleting todo' });
        }
  
        if (results.length === 0) {
          return res.status(404).json({ message: 'Todo not found' });
        }
  
       
        db.query('DELETE FROM todos WHERE id = ?', [todoId], (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Error deleting todo' });
          }
  
          res.json({ message: 'Todo deleted successfully' });
        });
      });
    });
  });

  app.patch('/edit/:id', (req, res) => {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(401).json({ message: 'Token not provided in the Authorization header' });
    }
  
    const tokenWithoutBearer = token.replace('Bearer ', '');

    jwt.verify(tokenWithoutBearer, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token is not valid' });
      }

      const { userId } = decoded;
      const todoId = req.params.id;
      const updatedTask = req.body.task;
  
      db.query('SELECT * FROM todos WHERE id = ? AND user = ?', [todoId, userId], (err, results) => {
        if (err) {
          return res.status(500).json({ message: 'Error updating todo' });
        }
  
        if (results.length === 0) {
          return res.status(404).json({ message: 'Todo not found' });
        }
  
        db.query('UPDATE todos SET task = ? WHERE id = ?', [updatedTask, todoId], (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Error updating todo' });
          }
  
          res.json({ message: 'Todo updated successfully' });
        });
      });
    });
  });
  
  

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });