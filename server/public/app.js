const socket = io('ws://localhost:3500');

const activity = document.querySelector('.activity');
const msgInput = document.querySelector('#message-input');
const sendButton = document.querySelector('#send-button');
const usernameInput = document.getElementById('username');
const emailForm = document.getElementById('email-form'); 

let username = '';

function sendMessage(e) {
    e.preventDefault();
    if (msgInput.value && username) {
        socket.emit('message', { username, message: msgInput.value });
        msgInput.value = '';
    }
    msgInput.focus();
}

sendButton.addEventListener('click', sendMessage);

const authForm = document.getElementById('auth-form');

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    username = usernameInput.value;
    socket.emit('authenticate', username);
});

socket.once('authenticationSuccess', (message) => {
    alert(message);
});

socket.once('authenticationError', (message) => {
    alert(message);
});

socket.on('message', (data) => {
    activity.textContent = '';
    const li = document.createElement('li');
    li.textContent = `${data.username}: ${data.message}`;
    document.querySelector('ul').appendChild(li);
});

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', socket.id.substring(0, 5));
});

let activityTimer;
socket.on('activity', (username) => {
    activity.textContent = `${username} is typing...`;

    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        activity.textContent = '';
    }, 3000);
});

socket.on('popUpMessage', (message) => {
    alert(message);
});

emailForm.addEventListener('submit', function (e) {
    e.preventDefault(); 

    const email = document.getElementById('recipient-email').value;


    alert(`Email submitted: ${email}`);
});
