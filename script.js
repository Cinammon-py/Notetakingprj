document.addEventListener('DOMContentLoaded', async function () {
  var app = document.getElementById('app');
  var noteInput = document.querySelector('.note-input');
  var trashIcon = document.getElementsByClassName('trash-icon');
  var pinIcon = document.querySelector('.pin-icon');
  var noteContainer = document.querySelector('.note-container');

  const forcedLogin = window.location.search.includes('forcedLogin=true');

  if (forcedLogin) {
    alert('You have been redirected to the login page. Please log in to continue.');
  }
  window.addEventListener('error', function (event) {
    console.error('Global error caught:', event.error);
  });

  var logoutLink = document.getElementById('logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', async function (event) {
      event.preventDefault();

      try {
        const response = await fetch('/logout', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

          console.log('cookie cleared');
          debugger;
          window.location.replace('/login.html');
        } else {
          console.error('Failed to log out. Server returned:', response.status);
        }
      } catch (error) {
        console.error('Error during logout:', error);
      }
    });
  }

  function createNoteCard(note) {
    var noteCard = document.createElement('div');
    noteCard.className = 'note-card';

    if (note && note.content !== undefined) {
      var content = note.content || '';

      var contentLength = content.length;

      // Adjust min-width and max-width based on content length
      var minWidth = Math.min(150 + contentLength * 5, 100); // Adjust these values accordingly
      var maxWidth = Math.min(200 + contentLength * 5, 450); // Adjust these values accordingly

      noteCard.style.minWidth = minWidth + 'px';
      noteCard.style.maxWidth = maxWidth + 'px';

      var noteCardContent = document.createElement('div');
      noteCardContent.className = 'note-content';

      // Set a maximum length before enabling scrollbar
      var maxLength = 100;
      if (contentLength > maxLength) {
        noteCardContent.style.overflowY = 'auto';
        noteCardContent.style.maxHeight = '300px'; // Adjust this value accordingly
        noteCard.style.height = 'auto'; // Set height to auto for scrollable content
      } else {
        noteCard.style.height = '80px'; // Set fixed height for non-scrollable content
      }

      noteCardContent.innerText = note.content;
      noteCardContent.style.boxSizing = 'border-box';

      var noteActions = document.createElement('div');
      noteActions.className = 'note-actions';

      var trashIcon = document.createElement('img');
      trashIcon.className = 'icon trash-icon';
      trashIcon.src = 'https://img.icons8.com/ios/452/trash.png';
      trashIcon.alt = 'Trash icon';

      noteActions.appendChild(trashIcon);

      noteCard.appendChild(noteCardContent);
      noteCard.appendChild(noteActions);

      noteContainer.appendChild(noteCard);
    } else {
      console.error('Note content is undefined:', note);
    }
  }
  const loginForm = document.getElementById('login-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      let usernameInput = document.getElementById('username');
      let passwordInput = document.getElementById('password');

      if (!usernameInput || !passwordInput) {
        console.error('Username or password input not found');
        return;
      }

      let username = usernameInput.value;
      let password = passwordInput.value;
      console.log('Username input:', usernameInput.value);
      console.log('Password input:', passwordInput.value);

      try {
        const response = await fetch('/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ usernameInput, passwordInput }),
          credentials: 'include',
        });

        if (response.ok) {
          // Redirect or perform other actions as needed
          window.location.replace('/Home.html');
          await displayExistingNotes();
        } else {
          const errorMessage = await response.text();
          console.error(`Authentication failed. Server returned: ${response.status}, ${errorMessage}`);
          // Handle failed authentication, e.g., show an error message
        }
      } catch (error) {
        console.error('Error during login:', error);
        // Handle other errors during login
      }
    });
  }

  async function getUserIdFromCookies() {
    return new Promise((resolve) => {
      try {
        const cookieData = document.cookie
          .split(';')
          .map((cookie) => cookie.trim())
          .find((cookie) => cookie.startsWith('user='));

        if (cookieData) {
          const userData = JSON.parse(decodeURIComponent(cookieData.substring('user='.length)));
          const userId = userData ? userData._id : null;
          console.log(userId);
          resolve(userId);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error parsing user data from cookies:', error);
        resolve(null);
      }
    });
  }

  async function displayExistingNotes() {
    try {
      const userCookie = document.cookie.split(';').find((c) => c.trim().startsWith('user='));
      const user = userCookie ? JSON.parse(userCookie.split('=')[1]) : null;

      if (user && user.notes) {
        console.log('User data found:', user);

        user.notes.forEach((note) => createNoteCard(note));
      } else {
        console.error('User data or notes not found:', user);
      }
    } catch (error) {
      console.error('Error displaying notes for user:', error);
    }
  }

  const userId = await getUserIdFromCookies();
  if (!userId) {
    console.error('User not logged in. Unable to create note.');
  }

  pinIcon.addEventListener('click', async function () {
    var noteContent = noteInput.value.trim();

    if (noteContent !== '') {
      if (typeof noteContent !== 'string') {
        console.error('Note content is not a string:', noteContent);
        return;
      }
      try {
        const userId = await getUserIdFromCookies();
        console.log(userId);

        console.log('Sending request to create note. Content:', noteContent);
        const response = await fetch('/createNote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: `${noteContent}`, userId }),
          credentials: 'include',
        });

        console.log(userId);
        if (response.ok) {
          const createdNote = await response.json();
          console.log('Created Note:', createdNote);

          createNoteCard(createdNote);

          noteInput.value = '';
        } else {
          console.error('Failed to create note. Server returned:', response.status);
        }
      } catch (error) {
        console.error('Error creating note:', error);
      }
    }
  });
});
