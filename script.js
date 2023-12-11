document.addEventListener('DOMContentLoaded', async function () {
  var app = document.getElementById('app');
  var noteInput = document.querySelector('.note-input');
  var trashIcon = document.getElementsByClassName('trash-icon');
  var pinIcon = document.querySelector('.pin-icon');
  var noteContainer = document.getElementsByClassName('note-container')[0];

  // Check if the page was redirected due to forced login
  const forcedLogin = window.location.search.includes('forcedLogin=true');

  if (forcedLogin) {
    // Display a message to the user
    alert('You have been redirected to the login page. Please log in to continue.');
  }
  window.addEventListener('error', function (event) {
    console.error('Global error caught:', event.error);
  });

  var logoutLink = document.getElementById('logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', async function (event) {
      // Prevent the default link behavior
      event.preventDefault();

      try {
        // Perform logout actions, clear session, token, etc.
        const response = await fetch('/logout', {
          method: 'GET',
          credentials: 'include',
        });

        // Check if the logout was successful
        if (response.ok) {
          console.log('okay!');
          // Clear user information from sessionStorage
          sessionStorage.removeItem('user');
          // Redirect to the login page
          window.location.replace('/login.html');
          console.log('session cleared');
        } else {
          console.error('Failed to log out. Server returned:', response.status);
        }
      } catch (error) {
        console.error('Error during logout:', error);
      }
    });
  }

  // Function to create a note card
  function createNoteCard(note) {
    var noteCard = document.createElement('div');
    noteCard.className = 'note-card';

    if (note && note.content !== undefined) {
      var content = note.content || '';
      // Calculate content length to determine dynamic width
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
  async function getUserIdFromSession() {
    return new Promise((resolve) => {
      const user = JSON.parse(sessionStorage.getItem('user'));
      resolve(user ? user._id : null);
    });
  }

  async function displayExistingNotes() {
    try {
      const response = await fetch('/getNotes');
      const rawData = await response.json();
      console.log('Raw response from server:', rawData);

      // parsing  response as JSON
      let data;
      try {
        data = rawData;
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
        return;
      }

      if (data && data.notes) {
        data.notes.forEach((note) => createNoteCard(note));
      } else {
        console.error('Unexpected response format:', data);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }

  // Display existing notes on page load
  await displayExistingNotes();

  const userId = getUserIdFromSession();
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
        //Get user ID from session
        const userId = await getUserIdFromSession();
        // Send note to  server for storage
        console.log('Sending request to create note. Content:', noteContent);
        const response = await fetch('/createNote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: `${noteContent}`, userId }),
        });

        console.log(userId);
        if (response.ok) {
          const createdNote = await response.json();
          console.log('Created Note:', createdNote);
          // Create a new note card for the new note
          createNoteCard(createdNote);

          // Clear the input after creating the note card
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
