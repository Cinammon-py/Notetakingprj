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
          window.location.href = '/login.html';
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
  function createNoteCard(content) {
    var noteCard = document.createElement('div');
    noteCard.className = 'note-card';

    // Calculate content length to determine dynamic width
    var contentLength = content.length;

    // Adjust min-width and max-width based on content length
    var minWidth = Math.min(150 + contentLength * 5, 100); // Adjust these values accordingly
    var maxWidth = Math.min(200 + contentLength * 5, 450); // Adjust these values accordingly

    noteCard.style.minWidth = minWidth + 'px';
    noteCard.style.maxWidth = maxWidth + 'px';

    var noteCardContent = document.createElement('div');
    noteCardContent.className = 'note-content';

    // Set a maximum length before enabling the scrollbar
    var maxLength = 100; // Adjust this value accordingly
    if (contentLength > maxLength) {
      noteCardContent.style.overflowY = 'auto';
      noteCardContent.style.maxHeight = '300px'; // Adjust this value accordingly
      noteCard.style.height = 'auto'; // Set height to auto for scrollable content
    } else {
      noteCard.style.height = '80px'; // Set fixed height for non-scrollable content
    }

    noteCardContent.innerText = content;
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
  }
  async function getUserIdFromSession() {
    return new Promise((resolve) => {
      const user = JSON.parse(sessionStorage.getItem('user'));
      resolve(user ? user._id : null);
    });
  }

  // Function to fetch and display existing notes
  async function displayExistingNotes() {
    try {
      const response = await fetch('/getNotes');
      const rawData = response.json(); // Get the raw response as text

      // Log the raw response from the server
      console.log('Raw response from server:', rawData);

      // Try parsing the response as JSON
      let data;
      try {
        data = rawData;
      } catch (parseError) {
        console.error('Error parsing response as JSON:', parseError);
        return;
      }

      // Log the parsed data
      console.log('Parsed data:', data);

      if (data && data.notes) {
        data.notes.forEach((note) => createNoteCard(note.content));
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
    // Optionally, you can redirect the user to the login page or perform other actions
  }
  // Event listener for creating new notes
  pinIcon.addEventListener('click', async function () {
    var noteContent = noteInput.value.trim();

    if (noteContent !== '') {
      try {
        //Get user ID from session
        const userId = await getUserIdFromSession();
        // Send the new note to the server for storage
        const response = await fetch('/createNote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: noteContent, userId }),
        });

        console.log(userId);
        if (response.ok) {
          // Create a new note card for the new note
          createNoteCard(noteContent);

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
