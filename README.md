# Paname Consulting

🌍 **Plateforme complète d'accompagnement pour l'immigration et les études à l'étranger**

---

## 📋 Table des matières

- [🎯 Présentation](#-présentation)
- [🚀 Fonctionnalités](#-fonctionnalités)
- [🛠️ Stack Technique](#️-stack-technique)
- [📁 Structure du Projet](#-structure-du-projet)
- [⚙️ Installation](#️-installation)
- [🔧 Configuration](#-configuration)
- [🚀 Déploiement](#-déploiement)
- [📊 État Actuel](#-état-actuel)
- [🔐 Sécurité](#-sécurité)
- [🤝 Contribuer](#-contribuer)

---

## 🎯 Présentation

Paname Consulting est une plateforme web complète permettant aux étudiants de :

- 📚 **Postuler à des universités à l'étranger**
- 🎓 **Obtenir un accompagnement personnalisé**
- 📋 **Suivre leurs procédures d'immigration**
- 📅 **Prendre rendez-vous avec des conseillers**
- 📊 **Accéder à des documents informatifs**

La plateforme se divise en 3 zones distinctes :

- 🔓 **Public** : Pages d'information et prise de rendez-vous
- 👤 **Utilisateur** : Espace personnel pour suivre ses démarches
- 🛡️ **Administrateur** : Panneau de gestion complet

---

## 🚀 Fonctionnalités

### 🌐 Pages Publiques

- ✅ **Page d'accueil** avec présentation des services
- ✅ **Services** détaillés (immigration, études, orientation)
- ✅ **Prise de rendez-vous** en ligne
- ✅ **Documents PDF** par pays (Russie, Chine, Turquie, etc.)
- ✅ **Contact** et formulaire de demande
- ✅ **À propos** de l'entreprise

### 👤 Espace Utilisateur

- ✅ **Profil personnel** modifiable
- ✅ **Mes rendez-vous** : consultation et annulation
- ✅ **Mes procédures** : suivi en temps réel
- ✅ **Progression** des démarches étape par étape
- ✅ **Notifications** automatiques

### 🛡️ Administration

- ✅ **Tableau de bord** avec statistiques en temps réel
- ✅ **Gestion des utilisateurs** (CRUD complet)
- ✅ **Gestion des destinations** universitaires
- ✅ **Gestion des rendez-vous** avec validation
- ✅ **Gestion des procédures** et suivi des étapes
- ✅ **Système de messages** interne
- ✅ **Export CSV** des données
- ✅ **Protection du compte admin**

### 📊 Statistiques et Analytics

- 📈 **Statistiques utilisateurs** : totaux, actifs, inactifs
- 📊 **Statistiques rendez-vous** : par statut, période, destination
- 📋 **Statistiques procédures** : taux de complétion, destinations populaires
- 📅 **Vue d'ensemble** avec graphiques et métriques clés

---

## 🛠️ Stack Technique

### Frontend (React + TypeScript)

```text
📦 Framework : React 19 + TypeScript
🎨 UI : TailwindCSS + Lucide Icons + Ant Design
🔄 State : React Hooks + Context API
🛣️ Routing : React Router v7
📝 Forms : Gestion native avec validation
🔔 Notifications : React Hot Toast
📱 Responsive : Mobile-first design
🔍 SEO : React Helmet Async
⚡ Performance : Lazy loading + Code splitting
📊 Graphiques : Recharts
```

### Backend (NestJS + TypeScript)

```text
🏗️ Framework : NestJS (Node.js)
🗄️ Base : PostgreSQL + Prisma ORM
🔐 Auth : JWT + Guards + Rôles
📧 Emails : Queue + Templates
📊 Validation : Class-validator + DTOs
🛡️ Sécurité : BCrypt + CORS + Helmet
📝 Logs : Winston + Structured logging
🚀 Performance : Caching + Pagination
🔍 API : Swagger/OpenAPI documentation
```

### Infrastructure & DevOps

```text
🐳 Conteneur : Docker
☁️ Déploiement : Railway + Vercel
🔧 CI/CD : GitHub Actions (si configuré)
📊 Monitoring : Logs centralisés
🔍 SEO : Robots.txt + Sitemap.xml
📝 Documentation : Code commenté
```

---

## 📁 Structure du Projet

```text
panameconsulting/
├── 📁 frontend/                 # Application React
│   ├── 📁 public/              # Fichiers statiques
│   │   ├── 📄 robots.txt       # SEO robots
│   │   ├── 📄 sitemap.xml      # SEO sitemap
│   │   └── 📁 documents/       # PDFs par pays
│   ├── 📁 src/
│   │   ├── 📁 components/       # Composants réutilisables
│   │   │   ├── 📁 shared/      # Composants communs
│   │   │   ├── 📁 admin/       # Composants admin
│   │   │   └── 📁 user/        # Composants utilisateur
│   │   ├── 📁 context/         # Context API (Auth)
│   │   ├── 📁 hooks/           # Hooks personnalisés
│   │   ├── 📁 services/        # Services API
│   │   ├── 📁 types/           # Types TypeScript
│   │   ├── 📁 pages/           # Routes de l'application
│   │   │   ├── 📁 (main)/       # Pages publiques
│   │   │   ├── 📁 auth/         # Authentification
│   │   │   ├── 📁 user/         # Espace utilisateur
│   │   │   └── 📁 gestionnaire/ # Administration
│   │   └── 📄 App.tsx           # Router principal
│   ├── 📄 package.json
│   └── 📄 vite.config.ts
├── 📁 backend/                  # API NestJS
│   ├── 📁 src/
│   │   ├── 📁 auth/             # Authentification
│   │   ├── 📁 users/            # Gestion utilisateurs
│   │   ├── 📁 destinations/     # Gestion destinations
│   │   ├── 📁 rendezvous/       # Gestion rendez-vous
│   │   ├── 📁 procedures/       # Gestion procédures
│   │   ├── 📁 mail/             # Service emails
│   │   ├── 📁 queue/            # File d'attente
│   │   ├── 📁 common/           # Utilitaires communs
│   │   ├── 📄 app.module.ts     # Module principal
│   │   └── 📄 main.ts           # Point d'entrée
│   ├── 📁 prisma/               # Schéma base de données
│   ├── 📄 package.json
│   └── 📄 nest-cli.json
├── 📄 README.md                 # Ce fichier
├── 📄 .gitignore
├── 📄 nixpacks.toml            # Configuration Railway
└── 📄 railway.toml              # Configuration Railway
```

---

## ⚙️ Installation

### Prérequis

- **Node.js** >= 18.0.0
- **npm** ou **pnpm**
- **PostgreSQL** (local ou distant)
- **Git**

### 1. Cloner le projet

```bash
git clone <repository-url>
cd panameconsulting
```

### 2. Backend

```bash
cd backend
npm install
# ou
pnpm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# Générer Prisma Client
npx prisma generate

# Lancer les migrations
npx prisma migrate dev

# Démarrer le serveur
npm run dev
# ou
pnpm dev
```

### 3. Frontend

```bash
cd frontend
npm install
# ou
pnpm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec l'URL de l'API

# Démarrer le serveur de développement
npm run dev
# ou
pnpm dev
```

### 4. Accès à l'application

- **Frontend** : <http://localhost:5173>
- **Backend API** : <http://localhost:10000>
- **Documentation API** : <http://localhost:10000/api>

---

## 🔧 Configuration

### Variables d'environnement Backend (.env)

```env
# Base de données
DATABASE_URL="postgresql://username:password@localhost:5432/panameconsulting"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Email
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Admin
ADMIN_EMAIL="admin@panameconsulting.com"
ADMIN_PASSWORD="admin123"

# Application
PORT=10000
NODE_ENV="development"

# Bcrypt
BCRYPT_ROUNDS="12"
```

### Variables d'environnement Frontend (.env)

```env
VITE_API_URL="http://localhost:10000/api"
VITE_APP_NAME="Paname Consulting"
VITE_APP_DESCRIPTION="Votre partenaire pour l'immigration et les études à l'étranger"
```

---

## 🚀 Déploiement

### Railway (Backend)

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Déployer
railway up
```

### Vercel (Frontend)

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
cd frontend
vercel --prod
```

### Configuration automatique

- **Backend** : Configuré via `railway.toml`
- **Frontend** : Configuré via `vercel.json`
- **Domaines** : Configurés dans les dashboards respectifs

---

## 📊 État Actuel

### ✅ Fonctionnalités Implémentées

#### 🔐 Authentification & Sécurité

- ✅ **JWT complet** avec refresh token
- ✅ **Rôles** : ADMIN, USER
- ✅ **Guards** de protection des routes
- ✅ **Hashage** des mots de passe (BCrypt)
- ✅ **Protection admin** contre suppression/désactivation
- ✅ **Emails de notification** automatiques

#### 👥 Gestion Utilisateurs

- ✅ **CRUD complet** des utilisateurs
- ✅ **Statistiques utilisateurs** en temps réel
- ✅ **Activation/désactivation** des comptes
- ✅ **Modification mot de passe** par l'admin
- ✅ **Profil utilisateur** modifiable
- ✅ **Messages d'erreur** optimisés

#### 🎓 Gestion Destinations

- ✅ **CRUD complet** des destinations universitaires
- ✅ **Recherche** et filtrage
- ✅ **Upload d'images** avec validation
- ✅ **Nettoyage automatique** des images orphelines
- ✅ **Pagination** et tri

#### 📅 Gestion Rendez-vous

- ✅ **Prise de RDV** en ligne (public)
- ✅ **Gestion admin** complète
- ✅ **Statuts** : PENDING, CONFIRMED, COMPLETED, CANCELLED
- ✅ **Créneaux horaires** disponibles
- ✅ **Validation admin** avec avis
- ✅ **Export CSV** des données
- ✅ **Statistiques détaillées**

#### 📋 Gestion Procédures

- ✅ **Création automatique** depuis rendez-vous
- ✅ **Suivi des étapes** (9 étapes possibles)
- ✅ **Progression** en temps réel
- ✅ **Mise à jour** des statuts
- ✅ **Statistiques** des procédures
- ✅ **Filtrage** avancé

#### 🎨 Interface & UX

- ✅ **Design responsive** complet
- ✅ **Theme cohérent** (sky/bleu)
- ✅ **Loading states** sur toutes les pages
- ✅ **Empty states** informatifs
- ✅ **Notifications** toast
- ✅ **Error boundaries** robustes

#### 📈 Administration

- ✅ **Tableau de bord** avec cartes statistiques
- ✅ **Gestion complète** de toutes les entités
- ✅ **Export de données** en CSV
- ✅ **Recherche** et filtrage avancés
- ✅ **Pagination** optimisée
- ✅ **Audit trail** des modifications

#### 🔍 SEO & Performance

- ✅ **Meta tags** optimisés (Helmet)
- ✅ **Robots.txt** configuré
- ✅ **Sitemap.xml** à jour
- ✅ **Lazy loading** des composants
- ✅ **Code splitting** automatique
- ✅ **Cache optimisé**

### 🚧 En cours de développement

- 📧 **Templates emails** avancés
- 📊 **Dashboard analytics** amélioré
- 🌍 **Multi-langues** (français/anglais)
- 📱 **Application mobile** (future)

### 🎯 Perspectives d'amélioration

#### 🔮 Fonctionnalités futures

- 🔔 **Notifications push** pour mobile
- 💬 **Chat intégré** admin-utilisateur
- 📊 **Rapports automatiques** et export PDF
- 🎓 **Partenariats universités** avec API
- 🌐 **Internationalisation** complète

#### 🚀 Améliorations techniques

- ⚡ **PWA** pour expérience mobile native
- 🔄 **WebSockets** pour temps réel
- 📱 **Application mobile** React Native
- 🤖 **IA** pour recommandations
- 🔗 **API Marketplace** pour partenaires

#### 📈 Évolutions business

- 🎓 **E-learning** intégré
- � **Paiement en ligne** sécurisé
- 📋 **Formulaires intelligents** avec validation
- 🌍 **Expansion** vers nouveaux pays
- 🤝 **Partenariats** avec universités

---

## �🔐 Sécurité

### 🛡️ Mesures de sécurité implémentées

- **JWT** avec expiration et refresh
- **BCrypt** pour les mots de passe (12 rounds)
- **CORS** configuré
- **Rate limiting** sur les endpoints sensibles
- **Input validation** avec class-validator
- **SQL injection** protégée (Prisma ORM)
- **XSS protection** avec Helmet
- **Guards** d'authentification et rôles
- **Audit logs** des actions admin

### 🔐 Bonnes pratiques

- **Pas de secrets** dans le code
- **Variables d'environnement** pour la config
- **HTTPS** obligatoire en production
- **Mots de passe** forts requis
- **Session timeout** configurable
- **Protection admin** renforcée

---

## 🤝 Contribuer

### 📋 Prérequis pour contribuer

- Connaissance de **React** et **TypeScript**
- Expérience avec **NestJS** et **Prisma**
- Compréhension des **best practices** SEO
- Respect du **code style** existant

### 🔄 Processus de contribution

1. **Fork** le projet
2. **Créer une branche** feature/nom-de-la-feature
3. **Commiter** avec des messages clairs
4. **Pusher** vers votre fork
5. **Ouvrir une Pull Request**

### 📝 Conventions de code

- **TypeScript strict** activé
- **Components** en PascalCase
- **Fichiers** en kebab-case
- **Imports** organisés par type
- **Comments** pour les fonctions complexes

---

## 📞 Contact

- **Email** : <contact@panameconsulting.com>
- **Site web** : <https://panameconsulting.com>
- **Documentation** : <https://docs.panameconsulting.com>

---

## 📄 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- **React Team** pour le framework incroyable
- **NestJS Team** pour l'excellence du backend
- **Prisma Team** pour l'ORM moderne
- **Vercel & Railway** pour l'hébergement
- **Tous les contributeurs** et testeurs

---

_🚀 **Paname Consulting** - Votre avenir international commence ici !_
