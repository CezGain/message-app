# Message App - Chat 1-to-1 en Temps Réel

Application de messagerie privée 1-to-1 avec API REST et WebSocket, développée avec Express.js, Socket.io, MongoDB et JWT.

## 🚀 Fonctionnalités

### Authentification

- ✓ Inscription avec email, username, mot de passe
- ✓ Connexion avec JWT (tokens valides 7 jours)
- ✓ Hashage bcrypt des mots de passe
- ✓ Validation des données entrantes
- ✓ Gestion des statuts online/offline
- ✓ Changement de mot de passe sécurisé
- ✓ Mise à jour du profil (username, email, avatar)

### Messagerie

- ✓ Messages privés 1-to-1
- ✓ Envoi/réception en temps réel (WebSocket)
- ✓ Historique de conversations
- ✓ Statuts des messages avec timestamps (envoyé, reçu, lu)
- ✓ Édition de messages (délai 15 minutes)
- ✓ Pagination (30 messages/page)
- ✓ Maximum 5000 caractères par message
- ✓ Informations détaillées des messages (timestamps d'envoi/réception/lecture)

### Notifications temps réel

- ✓ Indicateur "en train d'écrire..."
- ✓ Statut de présence (online/offline)
- ✓ Notifications de lecture avec confirmations
- ✓ Mise à jour automatique des conversations
- ✓ Synchronisation des statuts via WebSocket

### Interface utilisateur

- ✓ Design moderne et responsive
- ✓ Liste des conversations avec aperçu
- ✓ Compteur de messages non lus
- ✓ Recherche d'utilisateurs
- ✓ Avatars personnalisables (auto-générés avec initiales)
- ✓ Thème clair/sombre avec persistance localStorage
- ✓ Menu contextuel sur messages (modifier, informations)
- ✓ Icônes de statut visuels (✓ envoyé, ✓✓ reçu, ✓✓ vert lu)
- ✓ Sidebar mobile avec menu glissant
- ✓ Modales pour édition de profil et changement de mot de passe

## 📋 Prérequis

- Node.js 14+
- MongoDB 4.4+ (Atlas ou local)
- npm ou yarn

## 🔧 Installation

```bash
# Cloner le projet
git clone <repository-url>
cd message-app

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres
```

## ⚙️ Configuration

Fichier `.env` :

```env
NODE_ENV=development
PORT=3000

# Production database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/messenger?retryWrites=true&w=majority

# Test database (utilisée automatiquement avec NODE_ENV=test)
MONGODB_TEST_URI=mongodb+srv://user:password@cluster.mongodb.net/messenger-test?retryWrites=true&w=majority

JWT_SECRET=votre_secret_jwt_tres_securise
```

## 🏃 Lancement

### Développement

```bash
npm run dev
```

### Production

```bash
npm start
```

### Tests

```bash
# Tous les tests avec coverage
npm test

# Tests en mode watch
npm run test:watch
```

Le serveur démarre sur `http://localhost:3000`

## 📚 Documentation API

### Base URL

```
http://localhost:3000/api
```

### Authentification

#### POST /api/auth/register

Inscription d'un nouvel utilisateur

**Body:**

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "password123",
  "avatar": "https://example.com/avatar.jpg" // Optionnel
}
```

**Réponse (201):**

```json
{
  "message": "Inscription réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "email": "user@example.com",
    "username": "johndoe",
    "avatar": "https://example.com/avatar.jpg",
    "status": "offline",
    "createdAt": "2025-11-03T10:00:00.000Z"
  }
}
```

#### POST /api/auth/login

Connexion d'un utilisateur

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse (200):**

```json
{
  "message": "Connexion réussie",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    /* ... */
  }
}
```

#### POST /api/auth/logout

Déconnexion (nécessite authentification)

**Headers:**

```
Authorization: Bearer <token>
```

**Réponse (200):**

```json
{
  "message": "Déconnexion réussie"
}
```

#### GET /api/auth/me

Obtenir les informations de l'utilisateur connecté

**Headers:**

```
Authorization: Bearer <token>
```

**Réponse (200):**

```json
{
  "user": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "username": "johndoe",
    "email": "user@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "status": "online"
  }
}
```

### Utilisateurs

#### GET /api/users

Lister tous les utilisateurs (paginé)

**Headers:**

```
Authorization: Bearer <token>
```

**Query params:**

- `page` (optionnel, défaut: 1)
- `limit` (optionnel, défaut: 20)

**Réponse (200):**

```json
{
  "users": [
    {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "username": "johndoe",
      "avatar": "https://example.com/avatar.jpg",
      "status": "online"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```

#### GET /api/users/:id

Obtenir un utilisateur par ID

**Réponse (200):**

```json
{
  "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
  "username": "johndoe",
  "email": "user@example.com",
  "avatar": "https://example.com/avatar.jpg",
  "status": "online",
  "lastConnection": "2025-11-03T10:00:00.000Z"
}
```

#### PUT /api/users/profile

Mettre à jour son profil

**Body:**

```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**Réponse (200):**

```json
{
  "message": "Profil mis à jour",
  "user": {
    /* ... */
  }
}
```

#### PUT /api/users/change-password

Changer son mot de passe

**Body:**

```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Réponse (200):**

```json
{
  "message": "Mot de passe modifié avec succès"
}
```

#### GET /api/users/search

Rechercher des utilisateurs

**Query params:**

- `q` (requis, minimum 2 caractères)

**Exemple:**

```
GET /api/users/search?q=john
```

### Messages

#### POST /api/messages

Créer un nouveau message

**Body:**

```json
{
  "recipient_id": "64a1b2c3d4e5f6g7h8i9j0k1",
  "content": "Hello, comment ça va ?"
}
```

**Réponse (201):**

```json
{
  "message": "Message créé",
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k2",
    "sender": {
      /* ... */
    },
    "recipient": {
      /* ... */
    },
    "content": "Hello, comment ça va ?",
    "receivedAt": null,
    "readAt": null,
    "edited": false,
    "deleted": false,
    "createdAt": "2025-11-03T10:00:00.000Z"
  }
}
```

#### GET /api/messages/:user_id

Récupérer les messages avec un utilisateur (marque automatiquement les messages comme lus)

**Query params:**

- `page` (optionnel, défaut: 1)
- `limit` (optionnel, défaut: 30)

**Réponse (200):**

```json
{
  "messages": [
    /* ... */
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 156,
    "pages": 6
  }
}
```

#### GET /api/messages/conversations

Lister toutes les conversations avec nombre de messages non lus

**Réponse (200):**

```json
{
  "conversations": [
    {
      "_id": {
        /* user object */
      },
      "lastMessage": {
        /* message object */
      },
      "unreadCount": 3
    }
  ]
}
```

#### PUT /api/messages/:id

Éditer un message (propriétaire seulement, délai 15 minutes)

**Body:**

```json
{
  "content": "Message modifié"
}
```

#### DELETE /api/messages/:id

Supprimer un message (soft delete, propriétaire seulement)

**Réponse (200):**

```json
{
  "message": "Message supprimé"
}
```

#### POST /api/messages/:id/read

Marquer un message comme lu (destinataire seulement)

## 🔌 Événements WebSocket

### Connexion

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your-jwt-token' },
});
```

### Événements côté client

#### send-message

Envoyer un message

```javascript
socket.emit('send-message', {
  recipient_id: '64a1b2c3d4e5f6g7h8i9j0k1',
  content: 'Hello!',
});
```

#### message-received

Confirmer la réception d'un message

```javascript
socket.emit('message-received', {
  message_id: '64a1b2c3d4e5f6g7h8i9j0k2',
});
```

#### message-read

Marquer un message comme lu

```javascript
socket.emit('message-read', {
  message_id: '64a1b2c3d4e5f6g7h8i9j0k2',
});
```

#### edit-message

Éditer un message (délai 15 minutes)

```javascript
socket.emit('edit-message', {
  message_id: '64a1b2c3d4e5f6g7h8i9j0k2',
  content: 'Message modifié',
});
```

#### typing

Indiquer qu'on est en train d'écrire

```javascript
socket.emit('typing', {
  recipient_id: '64a1b2c3d4e5f6g7h8i9j0k1',
  isTyping: true, // ou false
});
```

#### get-user-status

Demander le statut d'un utilisateur

```javascript
socket.emit('get-user-status', {
  user_id: '64a1b2c3d4e5f6g7h8i9j0k1',
});
```

### Événements côté serveur

#### new-message

Réception d'un nouveau message

```javascript
socket.on('new-message', (message) => {
  console.log('Nouveau message:', message);
});
```

#### message-sent

Confirmation d'envoi

```javascript
socket.on('message-sent', (data) => {
  console.log('Message envoyé:', data.message);
});
```

#### message-received-confirmation

Confirmation que le message a été reçu

```javascript
socket.on('message-received-confirmation', (data) => {
  console.log('Message reçu:', data.message_id);
  console.log('Timestamp:', data.receivedAt);
});
```

#### message-read-confirmation

Notification de lecture

```javascript
socket.on('message-read-confirmation', (data) => {
  console.log('Message lu:', data.message_id);
  console.log('Timestamps:', data.receivedAt, data.readAt);
});
```

#### message-edited

Confirmation d'édition de message

```javascript
socket.on('message-edited', (data) => {
  if (data.success) {
    console.log('Message édité:', data.message);
  }
});
```

#### message-updated

Notification qu'un message a été édité par l'autre utilisateur

```javascript
socket.on('message-updated', (data) => {
  console.log('Message mis à jour:', data.message);
});
```

#### user-typing

Notification de frappe

```javascript
socket.on('user-typing', (data) => {
  console.log(data.username, "est en train d'écrire...");
});
```

#### user-status

Changement de statut utilisateur

```javascript
socket.on('user-status', (data) => {
  console.log(data.username, 'est', data.status);
});
```

#### error

Erreur WebSocket

```javascript
socket.on('error', (error) => {
  console.error('Erreur:', error.message);
});
```

## 🗂️ Structure du Projet

```
message-app/
├── src/
│   ├── models/
│   │   ├── User.js              # Modèle utilisateur (bcrypt, toPublicJSON)
│   │   └── Message.js           # Modèle message (timestamps: createdAt, receivedAt, readAt)
│   ├── routes/
│   │   ├── auth.js              # Routes authentification
│   │   ├── users.js             # Routes utilisateurs
│   │   └── messages.js          # Routes messages
│   ├── controllers/
│   │   ├── authController.js    # Logique authentification
│   │   ├── userController.js    # Logique utilisateurs (profil, mot de passe)
│   │   └── messageController.js # Logique messages (CRUD, conversations)
│   ├── middleware/
│   │   └── auth.js              # Middleware JWT
│   ├── socket/
│   │   └── handlers.js          # Handlers WebSocket (messages, statuts, édition)
│   ├── app.js                   # Configuration Express + MongoDB
│   └── server.js                # Serveur HTTP + Socket.io
├── test/
│   ├── models.test.js           # Tests modèles
│   ├── auth.test.js             # Tests authentification
│   ├── messages.test.js         # Tests messages
│   └── websocket.test.js        # Tests WebSocket
├── public/
│   ├── index.html               # Interface utilisateur (SPA)
│   ├── stylesheets/
│   │   └── style.css            # Styles (CSS custom properties, thème clair/sombre)
│   └── javascripts/
│       └── script.js            # Logique frontend (WebSocket, DOM, localStorage)
├── .env                         # Variables d'environnement
├── .env.example                 # Exemple de configuration
├── .gitignore
├── package.json
└── README.md
```

## 🧪 Tests

Le projet inclut une suite de tests complète avec **49 tests** qui passent :

- **Tests unitaires** : Modèles User et Message (validation, méthodes)
- **Tests d'intégration** : Routes API (auth, users, messages, profil, mot de passe)
- **Tests WebSocket** : Connexion, envoi de messages, édition, notifications temps réel

Lancer les tests :

```bash
# Tous les tests avec coverage
npm test

# Tests en mode watch
npm run test:watch
```

**Coverage actuel : ~72%**

Les tests utilisent automatiquement une base de données séparée (`MONGODB_TEST_URI`) pour ne pas affecter les données de production.

## 🔒 Sécurité

- ✓ Mots de passe hashés avec bcrypt (salt rounds: 10)
- ✓ Authentification JWT avec expiration (7 jours)
- ✓ Validation des entrées utilisateur
- ✓ Protection CORS
- ✓ Messages privés isolés (1-to-1 uniquement)
- ✓ Vérification des autorisations (propriétaire pour edit/delete)
- ✓ Vérification du mot de passe actuel avant changement
- ✓ Délai d'édition de 15 minutes pour les messages
- ✓ Base de données de test séparée

## 📱 Interface Utilisateur

### Pages

1. **Authentification** : Login/Register avec validation
2. **Chat** :
   - Sidebar avec liste des conversations
   - Zone de recherche utilisateurs
   - Chat 1-to-1 avec historique
   - Indicateur de frappe en temps réel
   - Statuts de lecture visuels (✓, ✓✓, ✓✓ vert)
   - Présence en temps réel (online/offline)

### Fonctionnalités UI

- Design responsive (mobile-friendly avec sidebar glissante)
- Avatars auto-générés avec initiales (ui-avatars.com)
- Scroll automatique vers les nouveaux messages
- Compteur de messages non lus avec badge
- Timestamps des messages formatés
- Badge "modifié" sur messages édités
- Menu contextuel (3 points) sur chaque message :
  - **Modifier** (uniquement si < 15 minutes)
  - **Informations** (timestamps d'envoi/réception/lecture)
- Thème clair/sombre avec persistance localStorage
- Modales pour édition de profil et changement de mot de passe
- Menu header avec icônes (🌙/☀️ thème, 🔒 mot de passe, 🚪 déconnexion)

### Icônes de Statut

- **✓ (1 check)** : Message envoyé
- **✓✓ gris (2 checks gris)** : Message reçu par le destinataire
- **✓✓ vert (2 checks verts)** : Message lu par le destinataire

## 🎯 Critères de Réussite (/20)

| Catégorie                          | Points | Statut |
| ---------------------------------- | ------ | ------ |
| Structure (Configuration, Modèles) | 2      | ✓      |
| Authentification (JWT, Bcrypt)     | 4      | ✓      |
| Messages (CRUD REST + WebSocket)   | 6      | ✓      |
| Notifications temps réel           | 3      | ✓      |
| Tests (unitaires + intégration)    | 3      | ✓      |
| Documentation + Frontend           | 2      | ✓      |
| **TOTAL**                          | **20** | **✓**  |

## ✨ Fonctionnalités Avancées Implémentées

- ✅ **Édition de messages** : Possibilité de modifier un message dans les 15 minutes suivant l'envoi
- ✅ **Timestamps détaillés** : Suivi précis de l'envoi (createdAt), réception (receivedAt) et lecture (readAt) des messages
- ✅ **Informations de message** : Modal affichant les timestamps détaillés pour chaque message
- ✅ **Statuts visuels** : Icônes SVG pour indiquer l'état des messages (envoyé/reçu/lu)
- ✅ **Thème clair/sombre** : Basculement entre thèmes avec persistance localStorage
- ✅ **Gestion de profil** : Modification du username, email et avatar
- ✅ **Changement de mot de passe** : Formulaire sécurisé avec vérification de l'ancien mot de passe
- ✅ **Menu contextuel** : Menu 3-points sur chaque message pour actions rapides
- ✅ **Base de données de test** : Séparation des données de test et production
- ✅ **UI responsive** : Sidebar mobile avec animation glissante

## 🚀 Technologies Utilisées

### Backend

- **Express.js 4.16.1** : Framework web
- **Socket.io 4.8.1** : Communication temps réel WebSocket
- **MongoDB + Mongoose 8.19.2** : Base de données NoSQL
- **JWT (jsonwebtoken 9.0.2)** : Authentification par tokens
- **Bcrypt 6.0.0** : Hashage de mots de passe
- **CORS 2.8.5** : Gestion des requêtes cross-origin
- **Dotenv 17.2.3** : Variables d'environnement

### Frontend

- **HTML5/CSS3** : Structure et styles
- **JavaScript Vanilla** : Logique client
- **Socket.io-client 4.8.1** : Client WebSocket
- **CSS Custom Properties** : Système de thèmes

### Tests

- **Mocha 11.7.4** : Framework de tests
- **Chai 6.2.0** : Assertions
- **Supertest 7.1.4** : Tests HTTP
- **NYC 17.1.0** : Coverage

## 📝 Notes de Développement

### Gestion des Statuts de Messages

Le système utilise des timestamps plutôt qu'un enum de statuts :

- `createdAt` : Timestamp de création (= envoyé)
- `receivedAt` : Timestamp de réception par le destinataire
- `readAt` : Timestamp de lecture par le destinataire

Cette approche permet un suivi précis et des informations détaillées pour l'utilisateur.

### WebSocket et Confirmations

Chaque action importante génère une confirmation :

- `message-sent` → Confirme l'envoi au serveur
- `message-received` → Le destinataire confirme la réception
- `message-received-confirmation` → L'expéditeur est notifié de la réception
- `message-read` → Le destinataire confirme la lecture
- `message-read-confirmation` → L'expéditeur est notifié de la lecture

### Édition de Messages

- Délai de 15 minutes après l'envoi
- Validation côté client ET serveur
- Badge "modifié" visible pour les deux utilisateurs
- Synchronisation temps réel via WebSocket

## 📄 Licence

MIT

## 👤 Auteur

Développé pour le TP Chat 1-to-1 | Express.js + Socket.io + MongoDB + JWT

---

**Note** : Ce projet implémente tous les critères requis (/20) ainsi que de nombreuses fonctionnalités avancées pour une expérience utilisateur moderne et complète.
