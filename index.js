const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
require('dotenv').config();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'todo1',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to the database!');
});

const app = express();

const sessionStore = new MySQLStore({}, db);

app.use(bodyParser.json());
app.use(cookieParser());
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

app.get('/todos', (req, res) => {
  const userId = req.session.userId;
  const sql = 'SELECT * FROM todos WHERE userId = ?';
  db.query(sql, userId, (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

app.post('/users', (req, res) => {
  const { username, email, password } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    const user = { username, email, password: hash };
    const sql = 'INSERT INTO users SET ?';
    db.query(sql, user, (err, result) => {
      if (err) throw err;
      res.status(201).json({
        message: 'User created successfully',
      });
    });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const checkUserSql = 'SELECT * FROM users WHERE email = ?';
  db.query(checkUserSql, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    if (results.length === 0) {
      return res.status(401).json({ message: 'Authentication failed' });
    }
    const user = results[0];
    bcrypt.compare(password, user.password, (bcryptErr, bcryptResult) => {
      if (bcryptErr || !bcryptResult) {
        return res.status(401).json({ message: 'Authentication failed' });
      }
      req.session.userId = user.id;
      res.status(200).json({
        message: 'Authentication successful',
        userId: user.id,
      });
    });
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error destroying session');
    }
    res.status(200).send('Logged out successfully');
  });
});

app.listen(4000, () => {
  console.log('Listening on port 4000');
});
