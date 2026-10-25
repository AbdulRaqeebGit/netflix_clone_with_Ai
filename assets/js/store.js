/*
 * Cineflix local account store.
 *
 * Everything lives in localStorage so the demo runs without a backend.
 * Passwords are salted + hashed before storage, but this is still a
 * client-side demo and not a replacement for real server authentication.
 */
(function () {
  "use strict";

  const KEYS = {
    users: "cineflix_users_v1",
    session: "cineflix_session_v1",
    myList: "cineflix_mylist_v1_",
    itemCache: "cineflix_item_cache_v1",
    notifications: "cineflix_notifications_read_v1_",
    pendingEmail: "cineflix_pending_email_v1"
  };

  const AVATARS = [
    "assets/img/avatars/avatar-1.svg",
    "assets/img/avatars/avatar-2.svg",
    "assets/img/avatars/avatar-3.svg",
    "assets/img/avatars/avatar-4.svg"
  ];

  const DEMO_ACCOUNT = {
    id: "usr_demo",
    name: "Ayesha Khan",
    email: "demo@cineflix.com",
    password: "Demo@123",
    avatar: "assets/img/avatars/avatar-2.svg",
    plan: "Premium",
    createdAt: "2025-08-12T10:30:00.000Z"
  };

  function read(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("Cineflix could not persist data:", error);
      return false;
    }
  }

  function remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      /* Storage can be unavailable in private modes. */
    }
  }

  function normaliseEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  /*
   * Small, deterministic hash for the offline demo. It keeps plaintext
   * passwords out of localStorage; a production app must hash server-side.
   */
  function hashPassword(password) {
    const input = "cineflix-local-demo-v1::" + String(password) + "::salt-2026";
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    let h3 = 0x85ebca6b;

    for (let round = 0; round < 300; round += 1) {
      for (let i = 0; i < input.length; i += 1) {
        const code = input.charCodeAt(i) + round;
        h1 = Math.imul(h1 ^ code, 16777619);
        h2 = Math.imul(h2 ^ (code + 31), 2246822519);
        h3 = Math.imul(h3 + code, 2654435761);
      }
      h1 = (h1 ^ (h2 >>> 13)) >>> 0;
      h2 = (h2 ^ (h3 >>> 7)) >>> 0;
      h3 = (h3 ^ (h1 >>> 11)) >>> 0;
    }

    return (
      "cf1$" +
      h1.toString(16).padStart(8, "0") +
      h2.toString(16).padStart(8, "0") +
      h3.toString(16).padStart(8, "0")
    );
  }

  function getUsers() {
    const users = read(KEYS.users, []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    write(KEYS.users, users);
  }

  function findUserByEmail(email) {
    const normalised = normaliseEmail(email);
    return getUsers().find(function (user) {
      return normaliseEmail(user.email) === normalised;
    }) || null;
  }

  function createId(prefix) {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function seedDemoAccount() {
    const users = getUsers();
    let changed = false;

    if (!users.some(function (user) { return user.id === DEMO_ACCOUNT.id; })) {
      users.push({
        id: DEMO_ACCOUNT.id,
        name: DEMO_ACCOUNT.name,
        email: DEMO_ACCOUNT.email,
        passwordHash: hashPassword(DEMO_ACCOUNT.password),
        avatar: DEMO_ACCOUNT.avatar,
        plan: DEMO_ACCOUNT.plan,
        createdAt: DEMO_ACCOUNT.createdAt
      });
      changed = true;
    }

    if (changed) saveUsers(users);

    const demoListKey = KEYS.myList + DEMO_ACCOUNT.id;
    if (read(demoListKey, null) === null) {
      write(demoListKey, ["interstellar", "stranger-things", "parasite"]);
    }
  }

  function createUser(data) {
    const name = String(data.name || "").trim();
    const email = normaliseEmail(data.email);
    const password = String(data.password || "");
    const duplicate = findUserByEmail(email);

    if (duplicate) {
      return { ok: false, error: "An account with this email already exists. Try signing in instead." };
    }

    if (name.length < 2) {
      return { ok: false, error: "Please enter your name." };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return { ok: false, error: "Please enter a valid email address." };
    }

    if (password.length < 6) {
      return { ok: false, error: "Your password must be at least 6 characters." };
    }

    const users = getUsers();
    const avatar = AVATARS[users.length % AVATARS.length];
    const user = {
      id: createId("usr"),
      name: name,
      email: email,
      passwordHash: hashPassword(password),
      avatar: avatar,
      plan: "Premium",
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);
    write(KEYS.myList + user.id, []);
    return { ok: true, user: user };
  }

  function authenticate(email, password) {
    const user = findUserByEmail(email);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return { ok: false, error: "Sorry, we can't find an account with those details. Please try again." };
    }
    return { ok: true, user: user };
  }

  function resetPassword(email, newPassword) {
    const user = findUserByEmail(email);
    if (!user) {
      return { ok: false, error: "We couldn't find an account with that email." };
    }
    if (String(newPassword).length < 6) {
      return { ok: false, error: "Your new password must be at least 6 characters." };
    }

    const users = getUsers().map(function (entry) {
      if (entry.id === user.id) {
        return Object.assign({}, entry, {
          passwordHash: hashPassword(newPassword),
          passwordUpdatedAt: new Date().toISOString()
        });
      }
      return entry;
    });

    saveUsers(users);
    return { ok: true, user: user };
  }

  function setSession(userId) {
    const session = {
      userId: userId,
      signedInAt: new Date().toISOString()
    };
    write(KEYS.session, session);
    return session;
  }

  function getSession() {
    const session = read(KEYS.session, null);
    if (!session || !session.userId) return null;
    const user = getUsers().find(function (entry) { return entry.id === session.userId; });
    if (!user) {
      remove(KEYS.session);
      return null;
    }
    return { session: session, user: user };
  }

  function currentUser() {
    const active = getSession();
    return active ? active.user : null;
  }

  function updateCurrentUser(patch) {
    const active = getSession();
    if (!active) return null;
    let updated = null;
    const users = getUsers().map(function (user) {
      if (user.id !== active.user.id) return user;
      updated = Object.assign({}, user, patch);
      return updated;
    });
    saveUsers(users);
    return updated;
  }

  function signOut() {
    remove(KEYS.session);
  }

  function listKey() {
    const user = currentUser();
    return KEYS.myList + (user ? user.id : "guest");
  }

  function getMyList() {
    const list = read(listKey(), []);
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

  function isInMyList(id) {
    return getMyList().indexOf(id) !== -1;
  }

  function cacheItem(item) {
    if (!item || !item.id) return;
    const map = read(KEYS.itemCache, {});
    map[item.id] = item;
    write(KEYS.itemCache, map);
  }

  function getCachedItem(id) {
    const map = read(KEYS.itemCache, {});
    return map[id] || null;
  }

  function addToMyList(id, item) {
    if (!id) return false;
    const list = getMyList();
    if (item) cacheItem(item);
    if (list.indexOf(id) === -1) {
      list.push(id);
      write(listKey(), list);
      return true;
    }
    return false;
  }

  function removeFromMyList(id) {
    const list = getMyList().filter(function (entry) { return entry !== id; });
    write(listKey(), list);
    return true;
  }

  function toggleMyList(id, item) {
    if (isInMyList(id)) {
      removeFromMyList(id);
      return false;
    }
    addToMyList(id, item);
    return true;
  }

  function getKnownItem(id) {
    if (window.NF_DATA && window.NF_DATA.get(id)) return window.NF_DATA.get(id);
    return getCachedItem(id);
  }

  function getSavedItems() {
    return getMyList()
      .map(function (id) { return getKnownItem(id); })
      .filter(Boolean);
  }

  function notificationsWereRead() {
    const user = currentUser();
    return !!read(KEYS.notifications + (user ? user.id : "guest"), false);
  }

  function markNotificationsRead() {
    const user = currentUser();
    write(KEYS.notifications + (user ? user.id : "guest"), true);
  }

  function setPendingEmail(email) {
    write(KEYS.pendingEmail, normaliseEmail(email));
  }

  function getPendingEmail() {
    return read(KEYS.pendingEmail, "");
  }

  function clearPendingEmail() {
    remove(KEYS.pendingEmail);
  }

  function getInitials(name) {
    return String(name || "C")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join("");
  }

  function memberSince(isoDate) {
    const date = new Date(isoDate || Date.now());
    try {
      return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
    } catch (error) {
      return date.toDateString();
    }
  }

  seedDemoAccount();

  window.NFStore = {
    KEYS: KEYS,
    AVATARS: AVATARS,
    DEMO_ACCOUNT: { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password, name: DEMO_ACCOUNT.name },
    hashPassword: hashPassword,
    getUsers: getUsers,
    findUserByEmail: findUserByEmail,
    createUser: createUser,
    authenticate: authenticate,
    resetPassword: resetPassword,
    setSession: setSession,
    getSession: getSession,
    currentUser: currentUser,
    updateCurrentUser: updateCurrentUser,
    signOut: signOut,
    getMyList: getMyList,
    isInMyList: isInMyList,
    addToMyList: addToMyList,
    removeFromMyList: removeFromMyList,
    toggleMyList: toggleMyList,
    cacheItem: cacheItem,
    getCachedItem: getCachedItem,
    getKnownItem: getKnownItem,
    getSavedItems: getSavedItems,
    notificationsWereRead: notificationsWereRead,
    markNotificationsRead: markNotificationsRead,
    setPendingEmail: setPendingEmail,
    getPendingEmail: getPendingEmail,
    clearPendingEmail: clearPendingEmail,
    getInitials: getInitials,
    memberSince: memberSince
  };
})();
