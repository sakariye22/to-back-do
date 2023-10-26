// authServer.js - Server 1 for Authentication and User Routes
const express = require('express');

const app = express();
const mysql = require('mysql');
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


const sessionStore = new MySQLStore({}, db);

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
const cors = require('cors');

const corsOptions = {
  origin: 'http://localhost:3000', // Adjust to your client's origin
  credentials: true, // Allow credentials (cookies)
};
app.use(cors(corsOptions));


app.use(express.json());
//app.options('*', cors(corsOptions));

const logAudit = (action, userId, ipAddress) => {
  const timestamp = new Date().toISOString();
  const log = `${timestamp} - User ${userId} from IP ${ipAddress}: ${action}`;
  console.log(log); // För närvarande loggas till konsolen för enkelhets skull
};


// User registration route
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
      logAudit(`User with username ${email} created`, req.session.userId);
      res.status(201).json({
        message: 'User created successfully',
      });
    });
  });
});

// User login route
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

// User logout route
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
  console.log('Authentication server listening on port 4000');
});
