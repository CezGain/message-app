const API_URL = window.location.origin;
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let socket = null;
let currentRecipient = null;
let typingTimeout = null;

const authPage = document.getElementById('auth-page');
const chatPage = document.getElementById('chat-page');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authError = document.getElementById('auth-error');
const conversationsList = document.getElementById('conversations-list');
const allUsersList = document.getElementById('all-users-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const searchUsersInput = document.getElementById('search-users');
const logoutBtn = document.getElementById('logout-btn');
const showAllUsersBtn = document.getElementById('show-all-users');
const hideAllUsersBtn = document.getElementById('hide-all-users');
const allUsersSection = document.getElementById('all-users-section');
const backToSidebarBtn = document.getElementById('back-to-sidebar');
const sidebar = document.querySelector('.sidebar');
const chatBox = document.getElementById('chat-box');
const themeToggleBtn = document.getElementById('theme-toggle');
const headerMenuBtn = document.getElementById('header-menu-btn');
const headerMenu = document.getElementById('header-menu');
const themeIcon = document.getElementById('theme-icon');
const editProfileBtn = document.getElementById('edit-profile-btn');
const editProfileModal = document.getElementById('edit-profile-modal');
const closeProfileModal = document.getElementById('close-profile-modal');
const cancelProfileEdit = document.getElementById('cancel-profile-edit');
const editProfileForm = document.getElementById('edit-profile-form');
const profileError = document.getElementById('profile-error');
const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordModal = document.getElementById('change-password-modal');
const closePasswordModal = document.getElementById('close-password-modal');
const cancelPasswordChange = document.getElementById('cancel-password-change');
const changePasswordForm = document.getElementById('change-password-form');
const passwordError = document.getElementById('password-error');

document.addEventListener('DOMContentLoaded', async () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.textContent = '☀️';
  }

  if (token) {
    if (currentUser) {
      initApp();
    } else {
      await loadCurrentUser();
      if (currentUser) {
        initApp();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        token = null;
        showAuthPage();
      }
    }
  } else {
    showAuthPage();
  }

  setupEventListeners();
});
function setupEventListeners() {
  document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    authError.classList.remove('show');
  });

  document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    authError.classList.remove('show');
  });

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  logoutBtn.addEventListener('click', handleLogout);
  themeToggleBtn.addEventListener('click', toggleTheme);

  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  messageInput.addEventListener('input', handleTyping);
  searchUsersInput.addEventListener('input', handleSearch);

  showAllUsersBtn.addEventListener('click', () => {
    allUsersSection.style.display = 'block';
    showAllUsersBtn.style.display = 'none';
    loadUsers();
  });

  hideAllUsersBtn.addEventListener('click', () => {
    allUsersSection.style.display = 'none';
    showAllUsersBtn.style.display = 'block';
  });

  if (backToSidebarBtn) {
    backToSidebarBtn.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('hide');
        chatBox.classList.remove('active');
        currentRecipient = null;
      }
    });
  }

  headerMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    headerMenu.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    headerMenu.classList.remove('active');
  });

  headerMenu.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  editProfileBtn.addEventListener('click', () => {
    document.getElementById('edit-username').value = currentUser.username;
    document.getElementById('edit-email').value = currentUser.email;
    document.getElementById('edit-avatar').value = currentUser.avatar || '';
    profileError.textContent = '';
    editProfileModal.classList.add('active');
  });

  closeProfileModal.addEventListener('click', () => {
    editProfileModal.classList.remove('active');
  });

  cancelProfileEdit.addEventListener('click', () => {
    editProfileModal.classList.remove('active');
  });

  editProfileModal.addEventListener('click', (e) => {
    if (e.target === editProfileModal) {
      editProfileModal.classList.remove('active');
    }
  });

  editProfileForm.addEventListener('submit', handleProfileUpdate);

  changePasswordBtn.addEventListener('click', () => {
    changePasswordForm.reset();
    passwordError.textContent = '';
    headerMenu.classList.remove('active');
    changePasswordModal.classList.add('active');
  });

  closePasswordModal.addEventListener('click', () => {
    changePasswordModal.classList.remove('active');
  });

  cancelPasswordChange.addEventListener('click', () => {
    changePasswordModal.classList.remove('active');
  });

  changePasswordModal.addEventListener('click', (e) => {
    if (e.target === changePasswordModal) {
      changePasswordModal.classList.remove('active');
    }
  });

  changePasswordForm.addEventListener('submit', handlePasswordChange);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      token = data.token;
      localStorage.setItem('token', token);
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      initApp();
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError('Erreur de connexion au serveur');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = document.getElementById('register-email').value;
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const avatar = document.getElementById('register-avatar').value;

  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password, avatar }),
    });

    const data = await response.json();

    if (response.ok) {
      token = data.token;
      localStorage.setItem('token', token);
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      initApp();
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError('Erreur de connexion au serveur');
  }
}

async function handleLogout() {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error('Erreur logout:', error);
  }

  if (socket) {
    socket.disconnect();
  }

  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  showAuthPage();
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? null : 'dark';

  if (newTheme) {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeIcon.textContent = '☀️';
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('theme');
    themeIcon.textContent = '🌙';
  }

  headerMenu.classList.remove('active');
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  profileError.textContent = '';

  const username = document.getElementById('edit-username').value;
  const email = document.getElementById('edit-email').value;
  const avatar = document.getElementById('edit-avatar').value;

  try {
    const response = await fetch(`${API_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, email, avatar: avatar || undefined }),
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      document.getElementById('current-user-name').textContent = currentUser.username;
      const avatar =
        currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.username}&background=0084ff&color=fff`;
      document.getElementById('current-user-avatar').src = avatar;
      editProfileModal.classList.remove('active');
    } else {
      profileError.textContent = data.message || 'Erreur lors de la mise à jour';
    }
  } catch (error) {
    console.error('Erreur:', error);
    profileError.textContent = 'Erreur de connexion au serveur';
  }
}

async function handlePasswordChange(e) {
  e.preventDefault();
  passwordError.textContent = '';

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    passwordError.textContent = 'Les mots de passe ne correspondent pas';
    return;
  }

  if (newPassword.length < 6) {
    passwordError.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (response.ok) {
      changePasswordModal.classList.remove('active');
      changePasswordForm.reset();
      alert('Mot de passe modifié avec succès');
    } else {
      passwordError.textContent = data.error || 'Erreur lors du changement de mot de passe';
    }
  } catch (error) {
    console.error('Erreur:', error);
    passwordError.textContent = 'Erreur de connexion au serveur';
  }
}

async function loadCurrentUser() {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Erreur chargement utilisateur:', error);
    return false;
  }
}

function initApp() {
  showChatPage();
  displayCurrentUser();
  connectWebSocket();
  loadConversations();
}

function showAuthPage() {
  authPage.classList.add('active');
  chatPage.classList.remove('active');
}

function showChatPage() {
  authPage.classList.remove('active');
  chatPage.classList.add('active');
}

function showError(message) {
  authError.textContent = message;
  authError.classList.add('show');
  setTimeout(() => authError.classList.remove('show'), 5000);
}

function displayCurrentUser() {
  document.getElementById('current-user-name').textContent = currentUser.username;
  const avatar =
    currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.username}&background=0084ff&color=fff`;
  document.getElementById('current-user-avatar').src = avatar;
}

function connectWebSocket() {
  socket = io(API_URL, {
    auth: { token },
  });

  socket.on('connect', () => {
    document.getElementById('current-user-status').classList.add('online');
  });

  socket.on('disconnect', () => {
    document.getElementById('current-user-status').classList.remove('online');
  });

  socket.on('new-message', (message) => {
    if (
      currentRecipient &&
      (message.sender._id === currentRecipient._id || message.recipient._id === currentRecipient._id)
    ) {
      displayMessage(message);
      scrollToBottom();

      socket.emit('message-received', { message_id: message._id });
      socket.emit('message-read', { message_id: message._id });
    } else {
      socket.emit('message-received', { message_id: message._id });
    }

    loadConversations();
  });

  socket.on('message-sent', (data) => {
    if (data.success) {
      displayMessage(data.message);
      scrollToBottom();

      loadConversations().then(() => {
        if (currentRecipient) {
          const userInAllList = allUsersList.querySelector(`[data-user-id="${currentRecipient._id}"]`);
          if (userInAllList) {
            userInAllList.remove();
          }
        }
      });
    }
  });

  socket.on('message-received-confirmation', (data) => {
    updateMessageStatus(data.message_id, data.receivedAt, null);
  });

  socket.on('message-read-confirmation', (data) => {
    updateMessageStatus(data.message_id, data.receivedAt, data.readAt);
    loadConversations();
  });

  socket.on('message-edited', (data) => {
    if (data.success) {
      updateMessageContent(data.message._id, data.message.content, data.message.edited);
    }
  });

  socket.on('message-updated', (data) => {
    updateMessageContent(data.message._id, data.message.content, data.message.edited);
  });

  socket.on('user-typing', (data) => {
    if (currentRecipient && data.userId === currentRecipient._id) {
      showTypingIndicator(data.username, data.isTyping);
    }
  });

  socket.on('user-status', (data) => {
    updateUserStatus(data.userId, data.status);
  });

  socket.on('error', (error) => {
    console.error('Erreur WebSocket:', error);
  });
}

async function loadConversations() {
  try {
    const response = await fetch(`${API_URL}/api/messages/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (response.ok) {
      displayConversations(data.conversations);

      return data.conversations;
    } else {
      console.error('Erreur API conversations:', data);
      return [];
    }
  } catch (error) {
    console.error('Erreur chargement conversations:', error);
    return [];
  }
}

async function loadUsers() {
  try {
    const response = await fetch(`${API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (response.ok) {
      const existingConvIds = Array.from(document.querySelectorAll('#conversations-list [data-user-id]')).map(
        (el) => el.dataset.userId
      );

      const usersWithoutConversations = data.users.filter(
        (u) => u._id !== currentUser._id && !existingConvIds.includes(u._id)
      );

      allUsersList.innerHTML = '';
      usersWithoutConversations.forEach((user) => {
        const item = createConversationItem(user, null, 0);
        allUsersList.appendChild(item);
      });
    }
  } catch (error) {
    console.error('Erreur chargement utilisateurs:', error);
  }
}

function displayConversations(conversations) {
  conversationsList.innerHTML = '';

  if (conversations.length === 0) {
    conversationsList.innerHTML =
      '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Aucune conversation<br><small>Cliquez sur "Afficher tous les utilisateurs" pour démarrer une discussion</small></div>';
    return;
  }

  conversations.forEach((conv, index) => {
    const user = conv._id;
    const lastMessage = conv.lastMessage;
    const unreadCount = conv.unreadCount;

    if (!user) {
      console.error('Utilisateur manquant dans conversation:', conv);
      return;
    }

    const item = createConversationItem(user, lastMessage, unreadCount);
    conversationsList.appendChild(item);
  });
}

function displayUserInList(user) {
  const item = createConversationItem(user, null, 0);
  allUsersList.appendChild(item);
}

function createConversationItem(user, lastMessage, unreadCount) {
  const div = document.createElement('div');
  div.className = 'conversation-item';
  div.dataset.userId = user._id;

  if (!user.username) {
    console.error('Utilisateur sans username:', user);
    return div;
  }

  const avatar =
    user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=0084ff&color=fff`;

  const preview = lastMessage
    ? lastMessage.deleted
      ? '[Message supprimé]'
      : lastMessage.content.substring(0, 50)
    : 'Commencer une conversation';

  div.innerHTML = `
    <img src="${avatar}" alt="${user.username}">
    <div class="conversation-info">
      <div class="conversation-name">${user.username}</div>
      <div class="conversation-preview">${preview}</div>
    </div>
    ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
  `;

  div.addEventListener('click', () => selectConversation(user));

  return div;
}

async function selectConversation(user) {
  currentRecipient = user;

  document.querySelectorAll('.conversation-item').forEach((item) => {
    item.classList.remove('active');
  });
  const selectedConvItem = document.querySelector(`[data-user-id="${user._id}"]`);
  if (selectedConvItem) {
    selectedConvItem.classList.add('active');

    const badge = selectedConvItem.querySelector('.unread-badge');
    if (badge) {
      badge.remove();
    }
  }

  document.getElementById('no-chat-selected').style.display = 'none';
  document.getElementById('chat-box').style.display = 'flex';

  if (window.innerWidth <= 768) {
    sidebar.classList.add('hide');
    chatBox.classList.add('active');
  }

  const avatar = user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=0084ff&color=fff`;
  document.getElementById('recipient-avatar').src = avatar;
  document.getElementById('recipient-name').textContent = user.username;

  const statusElem = document.getElementById('recipient-status');
  statusElem.textContent = user.status === 'online' ? 'En ligne' : 'Hors ligne';
  statusElem.className = `status ${user.status}`;

  await loadMessages(user._id);
  scrollToBottom();
}

async function loadMessages(userId) {
  try {
    const response = await fetch(`${API_URL}/api/messages/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (response.ok) {
      messagesContainer.innerHTML = '';
      data.messages.forEach((msg) => {
        displayMessage(msg);

        if (msg.recipient._id === currentUser._id && msg.status !== 'read') {
          socket.emit('message-read', { message_id: msg._id });
        }
      });
    }
  } catch (error) {
    console.error('Erreur chargement messages:', error);
  }
}

function displayMessage(message) {
  const div = document.createElement('div');
  const isSent = message.sender._id === currentUser._id;
  div.className = `message ${isSent ? 'sent' : 'received'}`;
  div.dataset.messageId = message._id;

  const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusIcon = getStatusIcon(message);

  const messageAge = Date.now() - new Date(message.createdAt).getTime();
  const canEdit = isSent && messageAge < 15 * 60 * 1000;

  const menuItems = [];
  if (canEdit) {
    menuItems.push('<button class="menu-item edit-option">Modifier</button>');
  }
  menuItems.push('<button class="menu-item info-option">Informations</button>');

  div.innerHTML = `
    <div class="message-content">
      <div class="message-text">${escapeHtml(message.content)}</div>
      <div class="message-meta">
        <span class="message-time">${time}</span>
        ${message.edited ? '<span class="edited-badge">modifié</span>' : ''}
        ${isSent ? `<span class="message-status">${statusIcon}</span>` : ''}
      </div>
    </div>
    ${
      menuItems.length > 0
        ? `
      <button class="message-menu-btn" title="Options">⋮</button>
      <div class="message-menu" style="display: none;">
        ${menuItems.join('')}
      </div>
    `
        : ''
    }
  `;

  if (menuItems.length > 0) {
    const menuBtn = div.querySelector('.message-menu-btn');
    const menu = div.querySelector('.message-menu');
    const editOption = div.querySelector('.edit-option');
    const infoOption = div.querySelector('.info-option');

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menu.style.display === 'block';

      document.querySelectorAll('.message-menu').forEach((m) => (m.style.display = 'none'));

      menu.style.display = isVisible ? 'none' : 'block';
    });

    if (editOption) {
      editOption.addEventListener('click', () => {
        menu.style.display = 'none';
        editMessage(message._id, div);
      });
    }

    if (infoOption) {
      infoOption.addEventListener('click', () => {
        menu.style.display = 'none';
        showMessageInfo(message);
      });
    }

    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });
  }

  messagesContainer.appendChild(div);
}

function getStatusIcon(message) {
  if (message.readAt) {
    return '<svg class="status-icon read" viewBox="0 0 18 16" width="18" height="16"><path fill="#31a24c" d="M6.5 12L2 7.5l1.5-1.5L6.5 9l7-7L15 3.5z"/><path fill="#31a24c" d="M10.5 12L6 7.5l1.5-1.5L10.5 9l7-7L19 3.5z"/></svg>';
  } else if (message.receivedAt) {
    return '<svg class="status-icon" viewBox="0 0 18 16" width="18" height="16"><path fill="currentColor" d="M6.5 12L2 7.5l1.5-1.5L6.5 9l7-7L15 3.5z"/><path fill="currentColor" d="M10.5 12L6 7.5l1.5-1.5L10.5 9l7-7L19 3.5z"/></svg>';
  } else {
    return '<svg class="status-icon" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M5.5 12L1 7.5l1.5-1.5L5.5 9l7-7L14 3.5z"/></svg>';
  }
}

function updateMessageStatus(messageId, receivedAt, readAt) {
  const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
  if (messageDiv) {
    const statusSpan = messageDiv.querySelector('.message-status');
    if (statusSpan) {
      const message = { receivedAt, readAt };
      statusSpan.innerHTML = getStatusIcon(message);
    }
  }
}

function updateMessageContent(messageId, content, edited) {
  const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
  if (messageDiv) {
    const textSpan = messageDiv.querySelector('.message-text');
    const metaDiv = messageDiv.querySelector('.message-meta');

    if (textSpan) {
      textSpan.textContent = content;
    }

    if (edited && metaDiv) {
      let editedBadge = metaDiv.querySelector('.edited-badge');
      if (!editedBadge) {
        const timeSpan = metaDiv.querySelector('.message-time');
        editedBadge = document.createElement('span');
        editedBadge.className = 'edited-badge';
        editedBadge.textContent = 'modifié';
        timeSpan.after(editedBadge);
      }
    }
  }
}

function editMessage(messageId, messageDiv) {
  const textSpan = messageDiv.querySelector('.message-text');
  const currentContent = textSpan.textContent;

  const input = document.createElement('textarea');
  input.className = 'edit-message-input';
  input.value = currentContent;
  input.rows = 2;

  const saveBtn = document.createElement('button');
  saveBtn.className = 'save-edit-btn';
  saveBtn.textContent = '✓';
  saveBtn.title = 'Sauvegarder';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cancel-edit-btn';
  cancelBtn.textContent = '✕';
  cancelBtn.title = 'Annuler';

  const editControls = document.createElement('div');
  editControls.className = 'edit-controls';
  editControls.appendChild(input);
  editControls.appendChild(saveBtn);
  editControls.appendChild(cancelBtn);

  const messageContent = messageDiv.querySelector('.message-content');
  messageContent.style.display = 'none';
  messageDiv.appendChild(editControls);

  input.focus();
  input.select();

  saveBtn.addEventListener('click', () => {
    const newContent = input.value.trim();
    if (newContent && newContent !== currentContent) {
      socket.emit('edit-message', {
        message_id: messageId,
        content: newContent,
      });
    }
    editControls.remove();
    messageContent.style.display = 'block';
  });

  cancelBtn.addEventListener('click', () => {
    editControls.remove();
    messageContent.style.display = 'block';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveBtn.click();
    } else if (e.key === 'Escape') {
      cancelBtn.click();
    }
  });
}

function showMessageInfo(message) {
  const sentAt = new Date(message.createdAt).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  let receivedAt = 'Non reçu';
  if (message.receivedAt) {
    receivedAt = new Date(message.receivedAt).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  }

  let readAt = 'Non lu';
  if (message.readAt) {
    readAt = new Date(message.readAt).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  }

  const infoHtml = `
    <div class="message-info-overlay">
      <div class="message-info-content">
        <div class="message-info-header">
          <h3>Informations du message</h3>
          <button class="close-info-btn">&times;</button>
        </div>
        <div class="message-info-body">
          <div class="info-row">
            <span class="info-label">Envoyé :</span>
            <span class="info-value">${sentAt}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Reçu :</span>
            <span class="info-value">${receivedAt}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Lu :</span>
            <span class="info-value">${readAt}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const overlay = document.createElement('div');
  overlay.innerHTML = infoHtml;
  document.body.appendChild(overlay.firstElementChild);

  const closeBtn = document.querySelector('.close-info-btn');
  const infoOverlay = document.querySelector('.message-info-overlay');

  closeBtn.addEventListener('click', () => {
    infoOverlay.remove();
  });

  infoOverlay.addEventListener('click', (e) => {
    if (e.target === infoOverlay) {
      infoOverlay.remove();
    }
  });
}

function sendMessage() {
  const content = messageInput.value.trim();

  if (!content || !currentRecipient) return;

  socket.emit('send-message', {
    recipient_id: currentRecipient._id,
    content,
  });

  messageInput.value = '';
  messageInput.style.height = 'auto';
}

function handleTyping() {
  if (!currentRecipient) return;

  socket.emit('typing', {
    recipient_id: currentRecipient._id,
    isTyping: true,
  });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', {
      recipient_id: currentRecipient._id,
      isTyping: false,
    });
  }, 3000);
}

function showTypingIndicator(username, isTyping) {
  const indicator = document.getElementById('typing-indicator');
  if (isTyping) {
    document.getElementById('typing-user').textContent = username;
    indicator.style.display = 'block';
  } else {
    indicator.style.display = 'none';
  }
}

async function handleSearch(e) {
  const query = e.target.value.trim();

  if (query.length < 2) {
    allUsersSection.style.display = 'none';
    showAllUsersBtn.style.display = 'block';
    document.getElementById('conversations-section').style.display = 'block';
    loadConversations();
    allUsersList.innerHTML = '';
    return;
  }

  try {
    const [searchResponse, conversationsResponse] = await Promise.all([
      fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const searchData = await searchResponse.json();
    const conversationsData = await conversationsResponse.json();

    if (searchResponse.ok) {
      const matchingConversations = conversationsData.conversations.filter((conv) =>
        conv._id.username.toLowerCase().includes(query.toLowerCase())
      );

      const conversationUserIds = conversationsData.conversations.map((conv) => conv._id._id);

      const otherUsers = searchData.users.filter(
        (user) => user._id !== currentUser._id && !conversationUserIds.includes(user._id)
      );

      document.getElementById('conversations-section').style.display = 'block';
      allUsersSection.style.display = 'block';
      showAllUsersBtn.style.display = 'none';

      conversationsList.innerHTML = '';
      if (matchingConversations.length === 0) {
        conversationsList.innerHTML =
          '<div style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 14px;">Aucune conversation correspondante</div>';
      } else {
        matchingConversations.forEach((conv) => {
          const item = createConversationItem(conv._id, conv.lastMessage, conv.unreadCount);
          conversationsList.appendChild(item);
        });
      }

      allUsersList.innerHTML = '';
      if (otherUsers.length === 0) {
        allUsersList.innerHTML =
          '<div style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 14px;">Aucun utilisateur correspondant</div>';
      } else {
        otherUsers.forEach((user) => {
          const item = createConversationItem(user, null, 0);
          allUsersList.appendChild(item);
        });
      }
    }
  } catch (error) {
    console.error('Erreur recherche:', error);
  }
}

function updateUserStatus(userId, status) {
  const convItem = document.querySelector(`[data-user-id="${userId}"]`);

  if (currentRecipient && currentRecipient._id === userId) {
    const statusElem = document.getElementById('recipient-status');
    statusElem.textContent = status === 'online' ? 'En ligne' : 'Hors ligne';
    statusElem.className = `status ${status}`;
  }
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
