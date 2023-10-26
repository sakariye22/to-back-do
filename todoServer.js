// todoServer.js - Server 2 for To-Do Routes
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
require('dotenv').config();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'todo2',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database!');
});

const app = express();
const cors = require('cors');

const sessionStore = new MySQLStore({}, db);
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://3cc7-217-211-74-135.ngrok-free.app', // Add other allowed origins as needed
  ],
  credentials: true,
};

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: {
      maxAge: 3600000,
      secure: false,
    },
  })
);

// Middleware function to check for an active session
const checkSession = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to access this resource.' });
  }
  next();
};

// Get to-do items for a user
app.get('/todos', checkSession, (req, res) => {
  const userId = req.session.userId;
  const sql = 'SELECT * FROM todos WHERE userId = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});


app.get('/check-session', (req, res) => {
  if (req.session.userId) {
    // Session exists, return user's ID
    res.status(200).json({ userId: req.session.userId });
  } else {
    // No session or not logged in
    res.status(401).json({ message: 'No active session' });
  }
});

// Define your to-do related routes here




app.post('/todos', (req, res) => {
  const { title, content } = req.body;
  const userId = req.session.userId;
  if (userId == null) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to create a todo.' });
  }
  const todo = { title, content, userId };
  const sql = 'INSERT INTO todos SET ?';
  db.query(sql, todo, (err, result) => {
    if (err) throw err;
    console.log('Todo created:', result);
    res.status(201).json({ message: 'Todo created successfully' });
  });
});


app.delete('/todos/:id', (req, res) => {
  const userId = req.session.userId;
  const todoId = req.params.id;

  if (userId == null) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to delete a todo.' });
  }

  const deleteSql = 'DELETE FROM todos WHERE id = ? AND userId = ?';
  db.query(deleteSql, [todoId, userId], (err, result) => {
    if (err) throw err;
    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Todo deleted successfully' });
    } else {
      res.status(404).json({ message: 'Todo not found or you do not have permission to delete it' });
    }
  });
});


app.patch('/todos/:id', (req, res) => {
  const userId = req.session.userId;
  const todoId = req.params.id;
  const { title, content } = req.body;

  if (userId == null) {
    return res.status(401).json({ message: 'Unauthorized. Please log in to update a todo.' });
  }

  const updateSql = 'UPDATE todos SET title = ?, content = ? WHERE id = ? AND userId = ?';
  db.query(updateSql, [title, content, todoId, userId], (err, result) => {
    if (err) throw err;
    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Todo updated successfully' });
    } else {
      res.status(404).json({ message: 'Todo not found or you do not have permission to update it' });
    }
  });
});



app.listen(4001, () => {
  console.log('To-Do server listening on port 4001');
});