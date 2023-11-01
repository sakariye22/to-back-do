// authServer.js - Server 1 for Authentication and User Routes
const express = require('express');

const app = express();
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const Brute = require('express-brute');
const BruteRedis = require('express-brute-redis');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const winston = require('winston');
const { createLogger, transports, format } = winston;
const logFilePath = 'logs.json'; 

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


const logger = winston.createLogger({
  level: 'info', // Adjust the log level as needed
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs.json' }),
  ],
});
const requestLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'request-logs.json' }),
  ],
});
app.use((req, res, next) => {
  requestLogger.info({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    //headers: req.headers,
    body: req.body.email
  });
  next();
});

const store = new BruteRedis({
  client: require('redis').createClient({
    host: 'localhost', 
    port: 6379, 
  }),
  prefix: 'brute:',
});

const bruteforce = new Brute(store, {
  freeRetries: 5,
  minWait: 60 * 1000, 
  maxWait: 60 * 60 * 1000, 
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
      logger.info({ message: `User with username ${email} created` });
      res.status(201).json({
        message: 'User created successfully',
      });
    });
  });
});


app.post('/login', /*bruteforce.prevent,*/ (req, res) => {
  const { email, password } = req.body;
  const checkUserSql = 'SELECT * FROM users WHERE email = ?';
  db.query(checkUserSql, [email], (err, results) => {
    if (err) {
      logger.error({ message: 'Database query error', error: err });
      return res.status(500).json({ error: err });
    }
    if (results.length === 0) {
      logger.warn({ message: `Failed login attempt for email ${email}` });
      return res.status(401).json({ message: 'Authentication failed' });
    }
    const user = results[0];
    bcrypt.compare(password, user.password, (bcryptErr, bcryptResult) => {
      if (bcryptErr || !bcryptResult) {
        logger.warn({ message: `Failed login attempt for email ${email}` });
        return res.status(401).json({ message: 'Authentication failed' });
      }
      req.session.userId = user.id;
      logger.info({ message: `User with email ${email} logged in`, userId: user.id });
      res.status(200).json({
        message: 'Authentication successful',
        userId: user.id,
      });
    });
  });
});


app.post('/logout', (req, res) => {
  const userId = req.session.userId; 
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error destroying session');
    }
    logger.info({ message: `User with ID ${userId} logged out` });
    res.status(200).send('Logged out successfully');
  });
});

app.listen(4000, () => {
  console.log('Authentication server listening on port 4000');
});
