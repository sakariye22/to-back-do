const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const app = express();
const mysql = require ('mysql');
const bcrypt = require('bcrypt'); 

const port = 3005;

app.use(bodyParser.json());


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

app.post('/gettoken', (req, res) => {
  const { username } = req.body;

  const user = users.find((u) => u.username === username);

  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  const token = jwt.sign({ userId: user.id }, secretKey, { expiresIn: '1h' });

  res.json({ token });
});

/*

app.post('/testtoken2', (req, res) => {
  const token = req.body.token;

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    res.json({ message: 'Token is valid', decoded });
  });
});
*/

app.post('/testtoken', (req, res) => {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(401).json({ message: 'Token not provided in the Authorization header' });
    }
  
    const tokenWithoutBearer = token.replace('Bearer ', '');
  
    jwt.verify(tokenWithoutBearer, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token is not valid' });
      }
  
      res.json({ message: 'Token is valid', decoded });
    });
  });
  

  app.get('/protected', (req, res) => {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(401).json({ message: 'Token not provided in the Authorization header' });
    }
  
    const tokenWithoutBearer = token.replace('Bearer ', '');
  
    jwt.verify(tokenWithoutBearer, secretKey, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token is not valid' });
      }
  
      res.json({ message: 'Token is valid', decoded });
    });
  });







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
  
      const { userId } = decoded;
      const { task } = req.body;
  
    
      const todo = { user: userId, task };
  
      db.query('INSERT INTO todos (user, task) VALUES (?, ?)', [todo.user, todo.task], (err, result) => {
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
  
      const { userId } = decoded;
  
      db.query('SELECT * FROM todos WHERE user = ?', [userId], (err, results) => {
        if (err) {
          return res.status(500).json({ message: 'Error fetching todos' });
        }
  
        res.json({ todos: results });
      });
    });
  });
  


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });