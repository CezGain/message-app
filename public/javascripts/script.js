// Configuration
const API_URL = window.location.origin;
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let socket = null;
let currentRecipient = null;
let typingTimeout = null;

// Éléments DOM
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

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  if (token) {
    // Si on a un currentUser en cache, l'utiliser
    if (currentUser) {
      initApp();
    } else {
      // Sinon, charger depuis le serveur
      await loadCurrentUser();
      if (currentUser) {
        initApp();
      } else {
        // Token invalide, déconnexion
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
}); // Event Listeners
function setupEventListeners() {
  // Auth forms
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

  // Chat
  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  messageInput.addEventListener('input', handleTyping);
  searchUsersInput.addEventListener('input', handleSearch);

  // Afficher/Masquer tous les utilisateurs
  showAllUsersBtn.addEventListener('click', () => {
    allUsersSection.style.display = 'block';
    showAllUsersBtn.style.display = 'none';
    loadUsers();
  });

  hideAllUsersBtn.addEventListener('click', () => {
    allUsersSection.style.display = 'none';
    showAllUsersBtn.style.display = 'block';
  });
}

// Authentification
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

// Charger les données de l'utilisateur actuel
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

// Initialisation de l'application
function initApp() {
  showChatPage();
  displayCurrentUser();
  connectWebSocket();
  loadConversations(); // Charger uniquement les conversations actives par défaut
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

// WebSocket
function connectWebSocket() {
  socket = io(API_URL, {
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('WebSocket connecté');
    document.getElementById('current-user-status').classList.add('online');
  });

  socket.on('disconnect', () => {
    console.log('WebSocket déconnecté');
    document.getElementById('current-user-status').classList.remove('online');
  });

  socket.on('new-message', (message) => {
    if (
      currentRecipient &&
      (message.sender._id === currentRecipient._id || message.recipient._id === currentRecipient._id)
    ) {
      displayMessage(message);
      scrollToBottom();

      // Marquer comme lu
      socket.emit('message-read', { message_id: message._id });
    }

    loadConversations();
  });

  socket.on('message-sent', (data) => {
    if (data.success) {
      displayMessage(data.message);
      scrollToBottom();
      
      // Recharger les conversations et retirer l'utilisateur de "Tous les utilisateurs"
      loadConversations().then(() => {
        // Retirer l'utilisateur de la liste "Tous les utilisateurs" s'il y est
        if (currentRecipient) {
          const userInAllList = allUsersList.querySelector(`[data-user-id="${currentRecipient._id}"]`);
          if (userInAllList) {
            userInAllList.remove();
          }
        }
      });
    }
  });

  socket.on('message-read-confirmation', () => {
    // Mettre à jour l'indicateur de lecture
    loadConversations();
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

// Conversations
async function loadConversations() {
  try {
    const response = await fetch(`${API_URL}/api/messages/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Conversations reçues:', data.conversations);
      displayConversations(data.conversations);
      
      // Retourner les conversations pour permettre le chaînage
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
      // Récupérer les IDs des conversations existantes
      const existingConvIds = Array.from(document.querySelectorAll('#conversations-list [data-user-id]')).map(
        (el) => el.dataset.userId
      );

      // Filtrer pour afficher uniquement les utilisateurs sans conversation
      const usersWithoutConversations = data.users.filter(
        (u) => u._id !== currentUser._id && !existingConvIds.includes(u._id)
      );

      // Vider et afficher dans la section "Tous les utilisateurs"
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

  console.log('Affichage de', conversations.length, 'conversations');

  if (conversations.length === 0) {
    conversationsList.innerHTML =
      '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Aucune conversation<br><small>Cliquez sur "Afficher tous les utilisateurs" pour démarrer une discussion</small></div>';
    return;
  }

  conversations.forEach((conv, index) => {
    console.log(`Conversation ${index}:`, conv);
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

  // Vérifier que user a les propriétés nécessaires
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

  // Mettre à jour l'UI
  document.querySelectorAll('.conversation-item').forEach((item) => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-user-id="${user._id}"]`).classList.add('active');

  // Afficher le chat
  document.getElementById('no-chat-selected').style.display = 'none';
  document.getElementById('chat-box').style.display = 'flex';

  // Afficher les infos du destinataire
  const avatar = user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=0084ff&color=fff`;
  document.getElementById('recipient-avatar').src = avatar;
  document.getElementById('recipient-name').textContent = user.username;

  const statusElem = document.getElementById('recipient-status');
  statusElem.textContent = user.status === 'online' ? 'En ligne' : 'Hors ligne';
  statusElem.className = `status ${user.status}`;

  // Charger les messages
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
      data.messages.forEach((msg) => displayMessage(msg));
    }
  } catch (error) {
    console.error('Erreur chargement messages:', error);
  }
}

function displayMessage(message) {
  const div = document.createElement('div');
  const isSent = message.sender._id === currentUser._id;
  div.className = `message ${isSent ? 'sent' : 'received'}`;

  const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusIcon = message.status === 'read' ? '✓✓' : '✓';

  div.innerHTML = `
    <div class="message-content">
      <div class="message-text">${escapeHtml(message.content)}</div>
      <div class="message-meta">
        <span class="message-time">${time}</span>
        ${message.edited ? '<span class="edited-badge">modifié</span>' : ''}
        ${isSent ? `<span class="message-status">${statusIcon}</span>` : ''}
      </div>
    </div>
  `;

  messagesContainer.appendChild(div);
}

// Envoi de messages
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

// Typing indicator
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

// Recherche
async function handleSearch(e) {
  const query = e.target.value.trim();

  if (query.length < 2) {
    // Restaurer l'affichage normal
    allUsersSection.style.display = 'none';
    showAllUsersBtn.style.display = 'block';
    document.getElementById('conversations-section').style.display = 'block';
    loadConversations();
    allUsersList.innerHTML = '';
    return;
  }

  try {
    // Charger toutes les données nécessaires en parallèle
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
      // Filtrer les conversations qui correspondent à la recherche
      const matchingConversations = conversationsData.conversations.filter((conv) =>
        conv._id.username.toLowerCase().includes(query.toLowerCase())
      );

      // Récupérer les IDs des utilisateurs déjà dans les conversations
      const conversationUserIds = conversationsData.conversations.map((conv) => conv._id._id);

      // Filtrer les autres utilisateurs (ceux pas dans les conversations)
      const otherUsers = searchData.users.filter(
        (user) => user._id !== currentUser._id && !conversationUserIds.includes(user._id)
      );

      // Afficher les sections
      document.getElementById('conversations-section').style.display = 'block';
      allUsersSection.style.display = 'block';
      showAllUsersBtn.style.display = 'none';

      // Afficher les conversations filtrées
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

      // Afficher les autres utilisateurs filtrés
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

// Statut utilisateur
function updateUserStatus(userId, status) {
  const convItem = document.querySelector(`[data-user-id="${userId}"]`);

  if (currentRecipient && currentRecipient._id === userId) {
    const statusElem = document.getElementById('recipient-status');
    statusElem.textContent = status === 'online' ? 'En ligne' : 'Hors ligne';
    statusElem.className = `status ${status}`;
  }
}

// Utilitaires
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
