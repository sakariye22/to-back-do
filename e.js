const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const app = express();
const mysql = require ('mysql');
const bcrypt = require('bcrypt'); 
const cors = require ('cors');

const port = 4005;

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


const secretKey = 'yourSecretKey';




app.post('/register', (req, res) => {
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
    const { username, password } = req.body;
  
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
  
      if (results.length === 0) {
        return res.status(401).json({ message: 'User not found' });
      }
  
      const user = results[0];
  
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ message: 'Error comparing passwords' });
        }
  
        if (isMatch) {
        
          const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: '1h' });
          res.json({ token });
        } else {
          return res.status(401).json({ message: 'Authentication failed' });
        }
      });
    });
  });


  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });