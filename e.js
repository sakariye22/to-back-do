const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const app = express();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const expressSession = require('express-session');
const mysql = require ('mysql');
const bcrypt = require('bcrypt'); 
const cors = require ('cors');
const GitHubStrategy = require('passport-github2').Strategy;

const port = 4005;

app.use(bodyParser.json());
app.use(cors());

app.use(expressSession({ secret: 'yourSecretKey', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());


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

passport.use(
  new LocalStrategy((username, password, done) => {
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
      if (err) {
        return done(err);
      }

      if (results.length === 0) {
        return done(null, false, { message: 'User not found' });
      }

      const user = results[0];

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return done(err);
        }

        if (isMatch) {
          return done(null, user);
        } else {
          return done(null, false, { message: 'Authentication failed' });
        }
      });
    });
  })
);


passport.serializeUser((user, done) => {
  done(null, user.id || user.githubId); // Store either local or GitHub user ID
});

passport.deserializeUser((id, done) => {
  const isGitHubUser = typeof id === 'string'; // Check if it's a GitHub user ID

  const identifier = isGitHubUser ? 'githubId' : 'id';
  const query = `SELECT * FROM users WHERE ${identifier} = ?`;

  db.query(query, [id], (err, results) => {
    if (err) {
      return done(err);
    }

    const retrievedUser = results[0];
    done(null, retrievedUser);
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



app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to the desired page
    res.redirect('/todos2');
  }
);



passport.use(
  new GitHubStrategy(
    {
      clientID: 'be5e6a48a6f2e1ead205',
      clientSecret: '239e706e1d350acbc344c5b69a0a6081d3b71489',
      callbackURL: 'http://localhost:4005/auth/github/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      // Check if the GitHub user already exists in your database
      db.query('SELECT * FROM users WHERE githubId = ?', [profile.id], (err, results) => {
        if (err) {
          return done(err);
        }

        if (results.length > 0) {
          // User already exists, return the existing user
          return done(null, results[0]);
        } else {
          // User not found, create a new user
          const newUser = {
            githubId: profile.id,
            // ... (other properties if needed)
          };

          db.query('INSERT INTO users SET ?', newUser, (err, result) => {
            if (err) throw err;

            newUser.id = result.insertId;
            return done(null, newUser);
          });
        }
      });
    }
  )
);



  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });