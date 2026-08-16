// app.js — all frontend logic for PathFind
import {
  initAuth,
  getCurrentUser,
  signUp,
  logIn,
  logInWithGoogle,
  logOut,
  saveResult,
  loadSavedResults,
  deleteResult,
  submitFeedback,
  checkRedirectResult,
} from "./auth.js";

const state = {
  streamId: null,
  streamName: null,
  interestId: null,
  interestName: null,
  mode: null,
};

// ---------- Screen navigation ----------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", () => showScreen(btn.dataset.back));
});

document.getElementById("btn-start-guided").addEventListener("click", async () => {
  await loadStreams();
  showScreen("screen-stream");
});

document.getElementById("btn-start-chat").addEventListener("click", () => {
  showScreen("screen-chat");
  if (chatHistory.length === 0) startChat();
});

document.getElementById("btn-restart").addEventListener("click", () => {
  state.streamId = state.interestId = state.mode = null;
  showScreen("screen-hero");
});

// ---------- Step 1: Streams ----------
async function loadStreams() {
  const res = await fetch("/api/streams");
  const streams = await res.json();
  const wrap = document.getElementById("stream-list");
  wrap.innerHTML = "";
  streams.forEach((s) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = s.name;
    chip.addEventListener("click", async () => {
      state.streamId = s.id;
      state.streamName = s.name;
      await loadInterests(s.id);
      showScreen("screen-interest");
    });
    wrap.appendChild(chip);
  });
}

// ---------- Step 2: Interests ----------
async function loadInterests(streamId) {
  const res = await fetch(`/api/streams/${streamId}/interests`);
  const interests = await res.json();
  const wrap = document.getElementById("interest-list");
  wrap.innerHTML = "";
  interests.forEach((i) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = i.name;
    chip.addEventListener("click", () => {
      state.interestId = i.id;
      state.interestName = i.name;
      showScreen("screen-mode");
    });
    wrap.appendChild(chip);
  });
}

// ---------- Step 3: Mode ----------
document.querySelectorAll(".mode-card").forEach((card) => {
  card.addEventListener("click", async () => {
    state.mode = card.dataset.mode;
    await loadResults();
    showScreen("screen-results");
  });
});

// ---------- Step 4: Results ----------
async function loadResults() {
  const modeParam = state.mode === "both" ? "" : `?mode=${state.mode}`;
  const res = await fetch(
    `/api/streams/${state.streamId}/interests/${state.interestId}/careers${modeParam}`
  );
  const data = await res.json();
  state.lastResultsData = data; // keep for "Save this path"

  document.getElementById(
    "results-breadcrumb"
  ).textContent = `${data.stream} → ${data.interest} → ${state.mode === "both" ? "Government & Private" : state.mode}`;

  const grid = document.getElementById("results-grid");
  grid.innerHTML = "";

  if (!data.careers || data.careers.length === 0) {
    grid.innerHTML = `<p class="muted">No careers found for this combination yet. Try "Show me both" instead.</p>`;
    return;
  }

  data.careers.forEach((c) => {
    const card = document.createElement("div");
    card.className = "result-card";
    card.innerHTML = `
      <div class="result-top">
        <span class="result-title">${c.title}</span>
        <span class="mode-badge ${c.mode}">${c.mode}</span>
      </div>
      <div class="result-row"><span class="label">Exam</span><span class="value">${c.exam}</span></div>
      <div class="result-row"><span class="label">Syllabus</span><span class="value">${c.syllabus}</span></div>
      <div class="result-row"><span class="label">Scope</span><span class="value">${c.scope}</span></div>
      <div class="result-row"><span class="label">Day-to-day</span><span class="value">${c.description || ""}</span></div>
      <div class="result-row salary"><span class="label">Salary</span><span class="value">${c.salary_entry} → ${c.salary_senior}</span></div>
      <div class="result-row"><span class="label">Future</span><span class="value">${c.future}</span></div>
      <div class="result-row example-row"><span class="value">${c.example || ""}</span></div>
    `;
    grid.appendChild(card);
  });
}

// ---------- AI Chat (for confused students) ----------
let chatHistory = [];

function addMsg(role, text) {
  const win = document.getElementById("chat-window");
  const bubble = document.createElement("div");
  bubble.className = `msg ${role === "user" ? "user" : "bot"}`;
  bubble.textContent = text;
  win.appendChild(bubble);
  win.scrollTop = win.scrollHeight;
}

async function startChat() {
  addMsg("bot", "Hey! No stress — let's figure out what fits you. What subjects do you actually enjoy, or what do you find yourself doing in your free time?");
  chatHistory.push({
    role: "assistant",
    content: "Hey! No stress — let's figure out what fits you. What subjects do you actually enjoy, or what do you find yourself doing in your free time?",
  });
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  addMsg("user", text);
  chatHistory.push({ role: "user", content: text });
  input.value = "";

  const typing = document.createElement("div");
  typing.className = "msg bot";
  typing.id = "typing-indicator";
  typing.textContent = "typing...";
  document.getElementById("chat-window").appendChild(typing);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });
    const data = await res.json();
    document.getElementById("typing-indicator")?.remove();

    if (data.error) {
      addMsg("bot", `⚠️ ${data.error}`);
      return;
    }

    const reply = data.reply;

    if (reply.startsWith("RESULT:")) {
      const jsonStr = reply.replace("RESULT:", "").trim();
      try {
        const result = JSON.parse(jsonStr);
        addMsg("bot", result.reason || "Got it! Here's what fits you best 🎯");
        state.streamId = result.streamId;
        state.interestId = result.interestId;
        state.mode = "both";
        setTimeout(async () => {
          await loadResults();
          showScreen("screen-results");
        }, 1200);
      } catch (e) {
        addMsg("bot", reply);
      }
    } else {
      addMsg("bot", reply);
      chatHistory.push({ role: "assistant", content: reply });
    }
  } catch (err) {
    document.getElementById("typing-indicator")?.remove();
    addMsg("bot", "⚠️ Couldn't reach the server. Is it running?");
  }
}

document.getElementById("chat-send").addEventListener("click", sendChat);
document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

// ================= AUTH =================
let authMode = "login"; // or "signup"

function renderAuthArea(user) {
  const area = document.getElementById("auth-area");
  if (user) {
    const initial = (user.email || "?")[0].toUpperCase();
    area.innerHTML = `
      <button class="user-chip" id="btn-my-paths" style="background:none;border:none;cursor:pointer;">
        <span class="avatar">${initial}</span>
        <span>${user.email}</span>
      </button>
      <button class="btn btn-ghost btn-small" id="btn-logout">Log out</button>
    `;
    document.getElementById("btn-my-paths").addEventListener("click", openSavedPaths);
    document.getElementById("btn-logout").addEventListener("click", () => logOut());
  } else {
    area.innerHTML = `<button class="btn btn-ghost btn-small" id="btn-login-open">Log in</button>`;
    document.getElementById("btn-login-open").addEventListener("click", () => {
      setAuthMode("login");
      showScreen("screen-auth");
    });
  }
}

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById("auth-mode-label").textContent = mode === "login" ? "Log in" : "Sign up";
  document.getElementById("auth-title").textContent = mode === "login" ? "Welcome back" : "Create your account";
  document.getElementById("btn-auth-submit").textContent = mode === "login" ? "Log in" : "Sign up";
  document.getElementById("auth-toggle-text").textContent = mode === "login" ? "Don't have an account?" : "Already have an account?";
  document.getElementById("auth-toggle-link").textContent = mode === "login" ? "Sign up" : "Log in";
  document.getElementById("auth-error").textContent = "";
}

document.getElementById("auth-toggle-link").addEventListener("click", (e) => {
  e.preventDefault();
  setAuthMode(authMode === "login" ? "signup" : "login");
});

document.getElementById("btn-auth-submit").addEventListener("click", async () => {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const errorEl = document.getElementById("auth-error");
  errorEl.textContent = "";
  if (!email || !password) {
    errorEl.textContent = "Please fill in both fields.";
    return;
  }
  try {
    if (authMode === "login") {
      await logIn(email, password);
    } else {
      await signUp(email, password);
    }
    showScreen("screen-hero");
  } catch (err) {
    errorEl.textContent = friendlyAuthError(err);
  }
});

document.getElementById("btn-google")?.addEventListener("click", async () => {
  const errorEl = document.getElementById("auth-error");
  try {
    await logInWithGoogle();
    showScreen("screen-hero");
  } catch (err) {
    errorEl.textContent = friendlyAuthError(err);
  }
});

function friendlyAuthError(err) {
  const msg = err.message || "";
  if (msg.includes("auth/email-already-in-use")) return "This email is already registered — try logging in instead.";
  if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password")) return "Wrong email or password.";
  if (msg.includes("auth/weak-password")) return "Password should be at least 6 characters.";
  if (msg.includes("Firebase not configured")) return "Firebase isn't set up yet — check public/js/firebase-config.js (see README).";
  return "Something went wrong. Try again.";
}

// ---------- Save this path ----------
document.getElementById("btn-save-result").addEventListener("click", async () => {
  const user = getCurrentUser();
  if (!user) {
    setAuthMode("login");
    showScreen("screen-auth");
    return;
  }
  const data = state.lastResultsData;
  if (!data) return;
  const btn = document.getElementById("btn-save-result");
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    await saveResult({
      streamName: data.stream,
      interestName: data.interest,
      mode: state.mode,
      careers: data.careers,
    });
    btn.textContent = "✅ Saved!";
  } catch (err) {
    btn.textContent = "⚠️ Failed — try again";
    console.error(err);
  }
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = "💾 Save this path";
  }, 2000);
});

// ---------- My saved paths ----------
async function openSavedPaths() {
  showScreen("screen-saved");
  const grid = document.getElementById("saved-grid");
  grid.innerHTML = `<p class="muted">Loading...</p>`;
  try {
    const saved = await loadSavedResults();
    if (saved.length === 0) {
      grid.innerHTML = `<p class="muted">No saved paths yet — go save one from your results page!</p>`;
      return;
    }
    grid.innerHTML = "";
    saved.forEach((s) => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <div class="result-top">
          <span class="result-title">${s.streamName} → ${s.interestName}</span>
          <span class="mode-badge ${s.mode === "both" ? "both" : s.mode}">${s.mode}</span>
        </div>
        ${s.careers.map((c) => `<div class="result-row"><span class="label">${c.title}</span><span class="value">${c.salary_entry} → ${c.salary_senior}</span></div>`).join("")}
        <button class="btn btn-ghost btn-small delete-btn" data-id="${s.id}">🗑️ Remove</button>
      `;
      card.querySelector(".delete-btn").addEventListener("click", async (e) => {
        e.target.textContent = "Removing...";
        await deleteResult(s.id);
        openSavedPaths();
      });
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<p class="muted">Couldn't load saved paths. Try logging in again.</p>`;
    console.error(err);
  }
}

// Init auth listener on load
initAuth(renderAuthArea);

// ---------- Feedback widget ----------
let selectedRating = 0;
document.querySelectorAll("#star-row span").forEach((star) => {
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.star);
    document.querySelectorAll("#star-row span").forEach((s, i) => {
      s.classList.toggle("active", i < selectedRating);
    });
  });
});
document.getElementById("feedback-fab").addEventListener("click", () => {
  document.getElementById("feedback-modal").classList.remove("hidden");
});
document.getElementById("feedback-close").addEventListener("click", () => {
  document.getElementById("feedback-modal").classList.add("hidden");
});
document.getElementById("feedback-submit").addEventListener("click", async () => {
  const text = document.getElementById("feedback-text").value.trim();
  try {
    await submitFeedback({ rating: selectedRating, text });
    alert("Thanks for the feedback! 🙌");
    document.getElementById("feedback-modal").classList.add("hidden");
    document.getElementById("feedback-text").value = "";
  } catch (e) {
    alert("Couldn't submit — try again.");
    console.error(e);
  }
});

// ---------- Handle Google redirect login result ----------
checkRedirectResult().then((result) => {
  if (result && result.user) {
    console.log("✅ Redirect login success:", result.user.email);
    renderAuthArea(result.user);
  } else {
    console.log("ℹ️ No redirect result (normal on first page load / non-Google login)");
  }
});