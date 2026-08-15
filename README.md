# PathFind — Student Career Guide App

Stream + Interest based career guidance app. Govt vs Private mode. AI chat for confused students.

---

## 📁 Project structure
```
career-guide/
├── server.js              -> backend (Express)
├── package.json
├── .env.example            -> copy this to .env
├── data/courses.json       -> career database (facts: exam, salary, syllabus, scope)
└── public/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

---

## 🖥️ STEP-BY-STEP: Run this on your own laptop (VS Code)

### Step 1 — Install Node.js
- Go to https://nodejs.org → download **LTS version** → install it (Next, Next, Finish).
- Check it worked: open terminal (VS Code me `Ctrl + ~` / `Cmd + ~`) and type:
  ```
  node -v
  npm -v
  ```
  Dono me version number aana chahiye.

### Step 2 — Open the project in VS Code
- VS Code kholo → `File → Open Folder` → `career-guide` folder select karo.

### Step 3 — Install dependencies
Terminal me (VS Code ke andar hi, `Ctrl + ~`):
```
npm install
```
Ye Express, dotenv, cors download karega.

### Step 4 — Get your FREE AI API key (Groq)
1. Jao https://console.groq.com
2. Sign up (free, no credit card)
3. Left sidebar me "API Keys" → "Create API Key"
4. Key copy kar lo (kuch aisi dikhegi: `gsk_xxxxxxxxxxxxx`)

### Step 5 — Add your key to the project
1. Project folder me `.env.example` file ko copy karke naam `.env` rakh do (VS Code me right-click → copy, paste, rename).
2. `.env` file kholo aur apni key paste karo:
   ```
   GROQ_API_KEY=gsk_xxxxxxxxxxxxx
   PORT=3000
   ```
3. Save karo (`Ctrl+S`). **Ye file kabhi GitHub pe mat daalna** — `.gitignore` already isko exclude karta hai.

### Step 6 — Run the app
Terminal me:
```
npm start
```
Terminal me dikhega: `✅ Career Guide server running at http://localhost:3000`

Browser me kholo → **http://localhost:3000**

App chalne lagega — stream select karo, interest choose karo, Govt/Private pick karo, results dekho. "I'm confused" wala button AI chat kholega.

Kuch bhi change karo code me → save karo → browser me refresh karo (`Ctrl+R`) — changes turant dikhenge.

---

## 🔐 STEP-BY-STEP: Set up Login / Authentication (Firebase — free)

Login is powered by **Firebase Authentication** (Google's free auth service) — email/password + Google sign-in, no backend password code needed. Logged-in users can also **save their results** (stored in **Firestore**, Firebase's free database).

### Step 1 — Create a free Firebase project
1. Go to https://console.firebase.google.com
2. **"Add project"** → give it a name (e.g. `pathfind`) → disable Google Analytics (not needed) → **Create project**.

### Step 2 — Register a Web App
1. On the project overview page, click the **`</>`** (web) icon.
2. Give it a nickname (e.g. `pathfind-web`) → **Register app**.
3. It'll show a `firebaseConfig` object with keys like `apiKey`, `authDomain`, etc. **Copy all of it.**

### Step 3 — Paste config into the project
1. Open `public/js/firebase-config.js` in VS Code.
2. Replace the placeholder values with what you copied in Step 2.
3. Save. (This file is safe to be public — Firebase's web config isn't a secret; real security comes from the rules in Step 5.)

### Step 4 — Turn on sign-in methods
1. In Firebase console, left sidebar → **Build → Authentication → Get started**.
2. Under **"Sign-in method"** tab, enable:
   - **Email/Password** → toggle Enable → Save
   - **Google** → toggle Enable → pick a support email → Save

### Step 5 — Set up Firestore (for "Save this path" feature)
1. Left sidebar → **Build → Firestore Database → Create database**.
2. Choose **"Start in production mode"** → pick a location close to India (e.g. `asia-south1`) → Enable.
3. Go to the **"Rules"** tab and replace the rules with this (only lets users read/write their own saved paths):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /savedPaths/{docId} {
         allow read, delete: if request.auth != null && request.auth.uid == resource.data.uid;
         allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
       }
     }
   }
   ```
4. Click **Publish**.

### Step 6 — Test it
1. Run `npm start`, open `localhost:3000`.
2. Click **"Log in"** (top right) → **Sign up** → create an account with any email/password.
3. Go through the guided flow → on the results page click **"💾 Save this path"**.
4. Click your email (top right) → **"My saved paths"** should show what you just saved.

> ⚠️ First time using Google sign-in on `localhost`, Firebase might ask you to add `localhost` to **Authentication → Settings → Authorized domains** — it's usually already there by default. When you deploy live (Render), add your live URL (e.g. `pathfind-app.onrender.com`) to that same list, or Google sign-in will fail on the live site.

---

## ✏️ Customization ideas (jab basic version chal jaye)

- **More careers/streams:** `data/courses.json` open karke naye stream/interest/career entries add karo — same JSON pattern follow karo.
- **Colors/fonts:** `public/css/style.css` ke top pe `:root { }` block me saare colors hain — wahan change karo.
- **AI personality:** `server.js` me `systemPrompt` variable ke andar ka text edit karo — AI kaise baat karega wo yahan control hota hai.

---

## 🌐 STEP-BY-STEP: Go LIVE (free hosting on Render)

### Step 1 — Push code to GitHub
1. https://github.com pe account banao (agar nahi hai).
2. New repository banao (e.g. `pathfind-app`), **public** rakho.
3. VS Code terminal me:
   ```
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pathfind-app.git
   git push -u origin main
   ```
   (GitHub sign-in mangega browser me — allow kar dena)

### Step 2 — Deploy on Render (free)
1. https://render.com pe jao → "Get Started" → GitHub se sign up karo.
2. Dashboard me **"New +" → "Web Service"**.
3. Apna GitHub repo (`pathfind-app`) select karo → "Connect".
4. Settings:
   - **Name:** pathfind-app (ya kuch bhi)
   - **Region:** Singapore (India ke sabse paas)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Scroll down → **"Environment Variables"** section me add karo:
   - Key: `GROQ_API_KEY`  →  Value: apni Groq key paste karo
6. **"Create Web Service"** click karo.
7. 2-3 minute wait karo — Render build + deploy karega.
8. Upar ek live URL milega jaise: `https://pathfind-app.onrender.com` — **ye tumhara live app hai!** Kisi ko bhi bhej sakte ho.

> ⚠️ Free tier note: Render free service 15 min inactivity ke baad "sleep" ho jaati hai, next request pe 30-50 sec me wapas jaag jaati hai. Ye normal hai free tier ke liye.

---

## 🐛 Common problems

| Problem | Fix |
|---|---|
| `npm: command not found` | Node.js install nahi hua sahi se — Step 1 dobara karo |
| Port 3000 already in use | `.env` me `PORT=3001` kar do |
| AI chat "GROQ_API_KEY missing" bolta hai | `.env` file check karo — key sahi paste hui ya nahi, aur server restart karo |
| Render pe deploy fail | Render ke "Logs" tab me error dekho — usually missing env variable hoti hai |
| "Firebase isn't set up yet" error on login | `public/js/firebase-config.js` me apni real keys paste karna bhool gaye ho |
| Google login works on localhost but fails live | Firebase console → Authentication → Settings → Authorized domains me apna live Render URL add karo |
| "Missing or insufficient permissions" on save | Firestore Rules (Step 5 in auth section) publish nahi hui ya galat paste hui — dobara check karo |

---

## 🚀 Next-level ideas (jab ye chal jaye)
- User accounts + save results (needs a database like MongoDB Atlas — free tier available)
- Real college/exam dates via a college-finder API
- Regional language support (Hindi UI toggle)
- WhatsApp share button for results

Good luck bhai — is project ko live karke seedha apne resume/LinkedIn me daal dena, ekdam solid full-stack project hai 🔥
