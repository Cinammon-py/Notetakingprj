// server.js

const path = require('path');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
const secureSecret = crypto.randomBytes(32).toString('hex');
console.log(secureSecret);

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
};

app.use(express.json());
app.use(cors(corsOptions));
app.set('views', path.join(__dirname, '/'));
app.use(express.static(path.join(__dirname, '/')));
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect('mongodb+srv://bloguser:bloguser@cluster0.0ioti5t.mongodb.net/test?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

// Define User schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
  active: Boolean,
});

const User = mongoose.model('User', userSchema);

const noteSchema = new mongoose.Schema({
  content: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const Note = mongoose.model('Note', noteSchema);

app.use(
  session({
    secret: secureSecret,
    resave: false,
    saveUninitialized: true,
  })
);

const authenticateUser = async (req, res, next) => {
  if (req.session && req.session.user) {
    try {
      const user = await User.findById(req.session.user._id);

      if (user && user.active) {
        req.currentUser = user; // Attach the user object to the request
        next(); // User is authenticated and active, proceed to the next middleware
      } else {
        res.status(401).json({ error: 'Unauthorized: User is not active.' });
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.status(401).json({ error: 'Unauthorized: User not logged in.' });
  }
};

// Custom middleware for role-based authentication
const checkUserRole = (requiredRole) => {
  return (req, res, next) => {
    if (req.currentUser && req.currentUser.role === requiredRole) {
      next(); // User has the required role, proceed to the next middleware
    } else {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
    }
  };
};

// Serve static files (HTML, CSS, JS)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/Home.html', authenticateUser, checkUserRole, (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.user) {
    // If not logged in, redirect to the login page with forcedLogin parameter
    return res.redirect('/login.html?forcedLogin=true');
  }

  // If logged in, serve the Home.html file
  res.sendFile(path.join(__dirname, 'Home.html'));
});

// Catch-all route for any other paths to redirect to login with forcedLogin
app.get('*', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.user) {
    // If not logged in, redirect to the login page with forcedLogin parameter
    return res.redirect('/login.html?forcedLogin=true');
  }

  // If logged in, redirect to the home page
  res.redirect('/Home.html');
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log('Attempting to find user:', username);
    const user = await User.findOne({ username, password });
    if (user) {
      // Fetch notes associated with the user
      const userNotes = await Note.find({ user: user._id });

      // Render Home.html and pass user and notes data
      console.log('User found. Redirecting to Home.html');
      // Store user information in session storage
      req.session.user = { _id: user._id, username: user.username, role: user.role, active: user.active, notes: userNotes };
      // Send response to the client
      res.redirect('/Home.html');
    } else {
      // Redirect to login.html with an error parameter
      console.log('Authentication failed. Redirecting to login.html');
      res.redirect('/login.html?error=Authentication%20failed');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/logout', (req, res) => {
  // Check if the user is already logged out
  if (!req.session || !req.session.user) {
    return res.redirect('/login.html');
  }

  // Destroy the session to log the user out
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    } else {
      console.log('Session destroyed');
      res.redirect('/login.html');
    }
  });
});

// Registration route
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  try {
    // Check if passwords match
    if (password !== confirmPassword) {
      return res.redirect('/register.html?error=Passwords%20do%20not%20match');
    }

    const newUser = new User({ username, password, role: 'user', active: true });
    await newUser.save();

    // Redirect to home.html or any other page on successful registration
    res.redirect('/Home.html');
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Note creation route
app.post('/createNote', authenticateUser, async (req, res) => {
  const { content } = req.body;
  const userId = req.currentUser._id;

  console.log('Received request to create note. Content:', content);

  try {
    if (!content) {
      return res.status(400).json({ error: 'Note content is required.' });
    }

    const newNote = new Note({ content, user: userId });
    const savedNote = await newNote.save();
    const note = await Note.findById(savedNote._id);

    if (!note) {
      return res.status(500).json({ error: 'Error retrieving the created note.' });
    }

    // Respond with success or redirect as needed
    res.status(200).json(note);
    console.log('Note created successfully');
  } catch (error) {
    console.log('Error creating note!', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Retrieve notes route
app.get('/getNotes', authenticateUser, (req, res) => {
  const userId = req.session.user._id;

  try {
    // Find notes associated with the user
    Note.find({ user: userId })
      .sort({ createdAt: -1 })
      .exec((err, userNotes) => {
        if (err) {
          console.error('Error fetching notes:', err); // Log the error
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          console.log('Notes sent to client:', userNotes); // Log the notes
          res.json({ notes: userNotes });
        }
      });
  } catch (error) {
    console.error('Exception during /getNotes:', error); // Log any exceptions
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Note deletion route
// app.delete('/deleteNote/:noteId', authenticateUser, async (req, res) => {
//   const noteId = req.params.noteId;
//   const userId = req.currentUser._id;

//   try {
//     // Check if the note belongs to the logged-in user
//     const note = await Note.findOne({ _id: noteId, user: userId });

//     if (!note) {
//       // Note not found or doesn't belong to the user
//       res.status(404).json({ error: 'Note not found or unauthorized' });
//       return;
//     }

//     // Remove the note from the database
//     await Note.findByIdAndDelete(noteId);

//     // Respond with success
//     res.status(200).send('Note deleted successfully');
//   } catch (error) {
//     console.error('Error deleting note:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
