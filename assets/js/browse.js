/*
 * Cineflix browse experience: dynamic hero, rows, catalogue views, OMDb-powered
 * search, detail modals, trailer player, My List, notifications and profiles.
 */
(function () {
  "use strict";

  if (!window.NFStore || !window.NFUI || !window.NF_DATA) return;

  let user = NFStore.currentUser();
  if (!user) return;

  const state = {
    view: "home",
    genre: "All",
    searchMode: false,
    searchQuery: "",
    searchResults: [],
    searchToken: 0,
    searchAbort: null,
    activeItem: null,
    detailEditAvatar: user.avatar,
    omdbDown: false,
    rowScroll: {}
  };

  const icons = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5"></path></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m16 16 5 5"></path></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
    playCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="m10 8 6 4-6 4z" fill="currentColor" stroke="none"></path></svg>'
  };

  const notifications = [
    {
      id: "n1",
      itemId: "dune-part-two",
      title: "Dune: Part Two is now streaming",
      text: "Return to Arrakis. The epic continues, ready when you are.",
      time: "2 hours ago"
    },
    {
      id: "n2",
      itemId: "stranger-things",
      title: "Stranger Things: The Final Season",
      text: "One last trip to Hawkins. Catch up before the end.",
      time: "Yesterday"
    },
    {
      id: "n3",
      itemId: "wednesday",
      title: "Wednesday returns",
      text: "Nevermore has a new mystery — and Wednesday is on the case.",
      time: "3 days ago"
    }
  ];

  const dom = {};

  function cacheDom() {
    dom.nav = document.getElementById("browseNav");
    dom.hero = document.getElementById("heroSection");
    dom.rows = document.getElementById("rowsContainer");
    dom.viewSection = document.getElementById("viewSection");
    dom.viewKicker = document.getElementById("viewKicker");
    dom.viewTitle = document.getElementById("viewTitle");
    dom.viewSubtitle = document.getElementById("viewSubtitle");
    dom.viewCount = document.getElementById("viewCount");
    dom.viewChips = document.getElementById("viewChips");
    dom.viewGrid = document.getElementById("viewGrid");
    dom.viewEmpty = document.getElementById("viewEmpty");
    dom.searchSection = document.getElementById("searchSection");
    dom.searchTitle = document.getElementById("searchTitle");
    dom.searchSubtitle = document.getElementById("searchSubtitle");
    dom.searchCount = document.getElementById("searchCount");
    dom.searchGrid = document.getElementById("searchGrid");
    dom.searchSkeleton = document.getElementById("searchSkeleton");
    dom.searchEmpty = document.getElementById("searchEmpty");
    dom.searchNote = document.getElementById("searchNote");
    dom.searchNoteText = document.getElementById("searchNoteText");
    dom.searchWrap = document.getElementById("searchWrap");
    dom.searchToggle = document.getElementById("searchToggle");
    dom.searchInput = document.getElementById("searchInput");
    dom.searchClear = document.getElementById("searchClear");
    dom.searchClose = document.getElementById("searchClose");
    dom.notifBtn = document.getElementById("notificationsBtn");
    dom.notifPanel = document.getElementById("notificationsPanel");
    dom.notifDot = document.getElementById("notifDot");
    dom.profileBtn = document.getElementById("profileBtn");
    dom.profilePanel = document.getElementById("profilePanel");
    dom.navAvatar = document.getElementById("navAvatar");
    dom.panelAvatar = document.getElementById("panelAvatar");
    dom.panelName = document.getElementById("profilePanelName");
    dom.panelEmail = document.getElementById("profilePanelEmail");
    dom.panelPlan = document.getElementById("profilePanelPlan");
    dom.panelListCount = document.getElementById("profileListCount");
    dom.detailModal = document.getElementById("detailModal");
    dom.detailContent = document.getElementById("detailContent");
    dom.playerModal = document.getElementById("playerModal");
    dom.playerTitle = document.getElementById("playerTitle");
    dom.playerBody = document.getElementById("playerBody");
    dom.profileModal = document.getElementById("profileModal");
    dom.profileModalTitle = document.getElementById("profileModalTitle");
    dom.avatarPicker = document.getElementById("avatarPicker");
    dom.profileNameInput = document.getElementById("profileNameInput");
    dom.profileAccountEmail = document.getElementById("profileAccountEmail");
    dom.profileAccountPlan = document.getElementById("profileAccountPlan");
    dom.profileMemberSince = document.getElementById("profileMemberSince");
    dom.profileForm = document.getElementById("profileForm");
  }

  function esc(value) {
    return NFUI.escapeHtml(value);
  }

  function firstName() {
    return String(user.name || "there").trim().split(/\s+/)[0];
  }

  function yearText(item) {
    if (item.yearLabel) return item.yearLabel;
    return NF_DATA.yearLabel(item);
  }

  function matchScore(item) {
    if (!item || !item.rating) return 95;
    return Math.max(88, Math.min(99, Math.round(82 + Number(item.rating) * 1.7)));
  }

  function posterSrc(item) {
    return item.poster || NFUI.posterFallback(item.title, item.accent);
  }

  function posterMarkup(item, options) {
    const opts = options || {};
    return (
      '<img class="nf-card__img" src="' +
      esc(posterSrc(item)) +
      '" alt="' +
      esc(item.title + " poster") +
      '" loading="' +
      (opts.eager ? "eager" : "lazy") +
      '" decoding="async" referrerpolicy="no-referrer" data-fallback-title="' +
      esc(item.title) +
      '" data-accent="' +
      esc(item.accent || "#8b1e24") +
      '">'
    );
  }

  function listIcon(item) {
    return NFStore.isInMyList(item.id) ? icons.check : icons.plus;
  }

  function listLabel(item) {
    return NFStore.isInMyList(item.id) ? "Remove from My List" : "Add to My List";
  }

  function cardHTML(item, options) {
    const opts = options || {};
    const added = NFStore.isInMyList(item.id);
    const isOriginal = item.netflixOriginal;
    const progress = opts.progress;
    const metaParts = [
      '<span class="match">' + matchScore(item) + "% Match</span>",
      "<span>" + esc(yearText(item)) + "</span>"
    ];
    if (item.maturity) metaParts.push("<span>" + esc(item.maturity) + "</span>");

    return (
      '<article class="nf-card' +
      (progress !== undefined ? " nf-card--progress" : "") +
      '" data-item-id="' +
      esc(item.id) +
      '" tabindex="0" role="button" aria-label="' +
      esc("View details for " + item.title) +
      '">' +
      posterMarkup(item, { eager: opts.eager }) +
      (isOriginal
        ? '<span class="nf-card__badge nf-card__badge--original">C Original</span>'
        : "") +
      '<div class="nf-card__overlay">' +
      '<div class="nf-card__actions">' +
      '<button class="card-action card-action--play" type="button" data-action="play" data-id="' +
      esc(item.id) +
      '" aria-label="' +
      esc("Play trailer for " + item.title) +
      '">' +
      icons.play +
      "</button>" +
      '<button class="card-action" type="button" data-action="list" data-id="' +
      esc(item.id) +
      '" aria-label="' +
      esc(listLabel(item)) +
      '">' +
      (added ? icons.check : icons.plus) +
      "</button>" +
      '<button class="card-action" type="button" data-action="detail" data-id="' +
      esc(item.id) +
      '" aria-label="' +
      esc("More information about " + item.title) +
      '">' +
      icons.info +
      "</button>" +
      "</div>" +
      (opts.episode ? '<p class="card-episode">' + esc(opts.episode) + "</p>" : "") +
      '<p class="nf-card__title">' +
      esc(item.title) +
      "</p>" +
      '<div class="nf-card__meta">' +
      metaParts[0] +
      '<span class="dot">' +
      esc(yearText(item)) +
      "</span>" +
      (item.maturity ? "<span>" + esc(item.maturity) + "</span>" : "") +
      "</div>" +
      "</div>" +
      (progress !== undefined
        ? '<div class="card-progress" aria-hidden="true"><span style="width:' +
          Math.max(4, Math.min(100, Number(progress) || 0)) +
          '%"></span></div>'
        : "") +
      "</article>"
    );
  }

  function allItems() {
    return NF_DATA.catalogue.slice();
  }

  function itemsByIds(ids) {
    return ids.map(function (id) { return NF_DATA.get(id); }).filter(Boolean);
  }

  function getItem(id) {
    return (
      NF_DATA.get(id) ||
      NFStore.getCachedItem(id) ||
      state.searchResults.find(function (item) { return item.id === id; }) ||
      null
    );
  }

  function hydrateHeader() {
    user = NFStore.currentUser() || user;
    if (!user) return;
    dom.navAvatar.src = user.avatar;
    dom.panelAvatar.src = user.avatar;
    dom.panelName.textContent = user.name;
    dom.panelEmail.textContent = user.email;
    dom.panelPlan.textContent = user.plan || "Premium";
    dom.profileBtn.setAttribute("aria-label", "Account menu for " + user.name);
    updateListCount();
  }

  function updateListCount() {
    const count = NFStore.getMyList().length;
    dom.panelListCount.textContent = count ? count + (count === 1 ? " title" : " titles") : "";
  }

  function notificationWasRead() {
    return NFStore.notificationsWereRead();
  }

  function updateNotificationBadge() {
    const unread = notificationWasRead() ? 0 : notifications.length;
    dom.notifDot.textContent = String(unread);
    dom.notifDot.hidden = unread === 0;
  }

  function renderNotifications() {
    const read = notificationWasRead();
    dom.notifPanel.innerHTML =
      '<div class="panel-head">' +
      "<h2>Notifications</h2>" +
      '<button type="button" id="markNotificationsRead">' +
      (read ? "All caught up" : "Mark all as read") +
      "</button>" +
      "</div>" +
      notifications
        .map(function (entry) {
          const item = getItem(entry.itemId);
          if (!item) return "";
          return (
            '<button class="notification-item" type="button" data-notification-id="' +
            esc(entry.id) +
            '">' +
            '<img class="notification-item__poster" src="' +
            esc(posterSrc(item)) +
            '" alt="" loading="lazy" data-fallback-title="' +
            esc(item.title) +
            '" data-accent="' +
            esc(item.accent || "#8b1e24") +
            '">' +
            '<span class="notification-item__copy">' +
            "<strong>" +
            esc(entry.title) +
            "</strong>" +
            "<span>" +
            esc(entry.text) +
            "</span>" +
            "<small>" +
            esc(entry.time) +
            "</small>" +
            "</span>" +
            (read ? "" : '<span class="notification-dot" aria-label="Unread"></span>') +
            "</button>"
          );
        })
        .join("");
    updateNotificationBadge();
  }

  function closePopovers() {
    dom.profilePanel.classList.remove("is-open");
    dom.notifPanel.classList.remove("is-open");
    dom.profileBtn.setAttribute("aria-expanded", "false");
    dom.notifBtn.setAttribute("aria-expanded", "false");
    dom.profilePanel.setAttribute("aria-hidden", "true");
    dom.notifPanel.setAttribute("aria-hidden", "true");
  }

  function togglePopover(which) {
    const isProfile = which === "profile";
    const panel = isProfile ? dom.profilePanel : dom.notifPanel;
    const button = isProfile ? dom.profileBtn : dom.notifBtn;
    const wasOpen = panel.classList.contains("is-open");
    closePopovers();
    if (!wasOpen) {
      panel.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      button.setAttribute("aria-expanded", "true");
    }
  }

  function updateNavSolid() {
    const solid = state.view !== "home" || state.searchMode || window.scrollY > 26;
    dom.nav.classList.toggle("is-solid", solid);
  }

  function renderHero() {
    const item = NF_DATA.get("dune-part-two");
    if (!item) return;

    const colon = item.title.indexOf(":");
    const titleMain = colon > -1 ? item.title.slice(0, colon) : item.title;
    const titleSub = colon > -1 ? item.title.slice(colon + 1).trim() : "";

    dom.hero.innerHTML =
      '<div class="hero__bg" aria-hidden="true"></div>' +
      '<div class="hero__glow" aria-hidden="true"></div>' +
      '<div class="hero__content">' +
      '<div class="hero__eyebrow"><span class="hero__n">C</span> Cineflix Film' +
      '<span class="hero__rank">#1 in Pakistan today</span></div>' +
      '<h1 class="hero__title">' +
      esc(titleMain) +
      (titleSub ? "<span>" + esc(titleSub) + "</span>" : "") +
      "</h1>" +
      '<div class="hero__meta">' +
      '<span class="hero__match">' +
      matchScore(item) +
      "% Match</span>" +
      "<span>" +
      esc(yearText(item)) +
      "</span>" +
      '<span class="hero__rating">' +
      esc(item.maturity) +
      "</span>" +
      "<span>" +
      esc(item.runtime) +
      "</span>" +
      '<span class="hero__hd">HD</span>' +
      "</div>" +
      '<p class="hero__desc">' +
      esc(item.description) +
      "</p>" +
      '<div class="hero__actions">' +
      '<button class="btn-play" type="button" data-action="play" data-id="' +
      esc(item.id) +
      '">' +
      icons.play +
      "Play</button>" +
      '<button class="btn-more" type="button" data-action="detail" data-id="' +
      esc(item.id) +
      '">' +
      icons.info +
      "More Info</button>" +
      '<button class="btn-round" type="button" data-action="list" data-id="' +
      esc(item.id) +
      '" aria-label="' +
      esc(listLabel(item)) +
      '" title="' +
      esc(listLabel(item)) +
      '">' +
      listIcon(item) +
      "</button>" +
      "</div>" +
      '<p class="hero__cast"><strong>Starring:</strong> ' +
      esc(item.cast.slice(0, 4).join(", ")) +
      "</p>" +
      "</div>" +
      '<div class="hero__maturity"><span>' +
      esc(item.maturity) +
      "</span> Mild violence, thematic elements</div>" +
      '<div class="hero__fade" aria-hidden="true"></div>';
  }

  function buildRows() {
    const all = allItems();
    const continueItems = NF_DATA.collections.continueWatching
      .map(function (entry) {
        const item = getItem(entry.id);
        return item
          ? { item: item, progress: entry.progress, episode: entry.episode }
          : null;
      })
      .filter(Boolean);

    const newItems = all
      .slice()
      .sort(function (a, b) { return (b.year || 0) - (a.year || 0); })
      .slice(0, 12);

    const series = all.filter(function (item) { return item.type === "tv"; });
    const movies = all.filter(function (item) { return item.type === "movie"; });

    const awardTV = series
      .filter(function (item) { return item.rating >= 8.5; })
      .sort(function (a, b) { return b.rating - a.rating; })
      .slice(0, 12);

    const action = all
      .filter(function (item) { return item.genres.indexOf("Action") !== -1; })
      .slice(0, 12);

    const scifi = all
      .filter(function (item) {
        return item.genres.indexOf("Sci-Fi") !== -1 || item.genres.indexOf("Fantasy") !== -1;
      })
      .slice(0, 12);

    const acclaimed = movies
      .filter(function (item) { return item.rating >= 8.5; })
      .sort(function (a, b) { return b.rating - a.rating; })
      .slice(0, 12);

    const myList = NFStore.getSavedItems();

    const rows = [
      {
        key: "top10",
        title: "Top 10 Movies in Pakistan Today",
        style: "top10",
        items: itemsByIds(NF_DATA.collections.top10),
        explore: "movies"
      },
      {
        key: "continue",
        title: "Continue Watching for " + esc(firstName()),
        style: "continue",
        items: continueItems,
        explore: null
      }
    ];

    if (myList.length) {
      rows.push({
        key: "mylist",
        title: "My List",
        style: "standard",
        items: myList,
        explore: "list"
      });
    }

    rows.push(
      {
        key: "new",
        title: "New Releases",
        style: "standard",
        items: newItems,
        explore: "new"
      },
      {
        key: "originals",
        title: "Only on Cineflix",
        style: "standard",
        items: itemsByIds(NF_DATA.collections.netflixOriginals),
        explore: "tv"
      },
      {
        key: "award-tv",
        title: "Award-Winning TV Shows",
        style: "standard",
        items: awardTV,
        explore: "tv"
      },
      {
        key: "action",
        title: "Action & Adventure",
        style: "standard",
        items: action,
        explore: "movies"
      },
      {
        key: "scifi",
        title: "Sci-Fi & Fantasy",
        style: "standard",
        items: scifi,
        explore: "new"
      },
      {
        key: "acclaimed",
        title: "Critically Acclaimed Movies",
        style: "standard",
        items: acclaimed,
        explore: "movies"
      }
    );

    return rows.filter(function (row) { return row.items.length > 0; });
  }

  function captureRowScroll() {
    document.querySelectorAll(".row-track[data-row-key]").forEach(function (track) {
      state.rowScroll[track.dataset.rowKey] = track.scrollLeft;
    });
  }

  function rowHTML(row) {
    const itemsHTML =
      row.style === "top10"
        ? row.items
            .map(function (item, index) {
              return (
                '<div class="top10-item" data-rank="' +
                (index + 1) +
                '">' +
                '<span class="top10-rank" aria-hidden="true">' +
                (index + 1) +
                "</span>" +
                cardHTML(item, { eager: index < 4 }) +
                "</div>"
              );
            })
            .join("")
        : row.style === "continue"
        ? row.items
            .map(function (entry) {
              return cardHTML(entry.item, {
                progress: entry.progress,
                episode: entry.episode,
                eager: false
              });
            })
            .join("")
        : row.items
            .map(function (item) { return cardHTML(item); })
            .join("");

    return (
      '<section class="movie-row" data-row="' +
      esc(row.key) +
      '" aria-labelledby="row-title-' +
      esc(row.key) +
      '">' +
      '<div class="movie-row__header"><h2 class="movie-row__title" id="row-title-' +
      esc(row.key) +
      '">' +
      row.title +
      "</h2>" +
      (row.explore
        ? '<button class="movie-row__explore" type="button" data-view-target="' +
          esc(row.explore) +
          '">Explore All &rsaquo;</button>'
        : "") +
      "</div>" +
      '<div class="row-shell">' +
      '<button class="row-arrow row-arrow--left" type="button" data-direction="-1" aria-label="Scroll left">' +
      icons.chevronLeft +
      "</button>" +
      '<div class="row-track" data-row-key="' +
      esc(row.key) +
      '">' +
      itemsHTML +
      "</div>" +
      '<button class="row-arrow row-arrow--right" type="button" data-direction="1" aria-label="Scroll right">' +
      icons.chevronRight +
      "</button>" +
      "</div>" +
      "</section>"
    );
  }

  function updateArrowState(track) {
    const shell = track.closest(".row-shell");
    if (!shell) return;
    const left = shell.querySelector(".row-arrow--left");
    const right = shell.querySelector(".row-arrow--right");
    if (left) left.disabled = track.scrollLeft <= 4;
    if (right) right.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  }

  function bindRowScrolling() {
    document.querySelectorAll(".row-track[data-row-key]").forEach(function (track) {
      const shell = track.closest(".row-shell");
      if (!shell) return;
      const left = shell.querySelector(".row-arrow--left");
      const right = shell.querySelector(".row-arrow--right");
      const scrollBy = function (direction) {
        track.scrollBy({ left: direction * track.clientWidth * 0.86, behavior: "smooth" });
      };
      if (left) left.addEventListener("click", function () { scrollBy(-1); });
      if (right) right.addEventListener("click", function () { scrollBy(1); });
      track.addEventListener("scroll", function () { updateArrowState(track); }, { passive: true });
      updateArrowState(track);
      const saved = state.rowScroll[track.dataset.rowKey];
      if (saved) track.scrollLeft = saved;
    });
  }

  function renderRows() {
    captureRowScroll();
    const rows = buildRows();
    dom.rows.innerHTML = rows.map(rowHTML).join("");
    bindRowScrolling();
  }

  function setNavActive(view) {
    document.querySelectorAll(".nav-link[data-view-link]").forEach(function (link) {
      const mapped = link.dataset.viewLink === "list" ? "list" : link.dataset.viewLink;
      link.classList.toggle("is-active", mapped === view);
    });
  }

  function showHome(scroll) {
    state.searchMode = false;
    dom.searchSection.hidden = true;
    dom.viewSection.hidden = true;
    dom.hero.hidden = false;
    dom.rows.hidden = false;
    renderHero();
    renderRows();
    updateNavSolid();
    if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
  }

  function viewMeta(view) {
    if (view === "tv") {
      return {
        kicker: "Cineflix Series",
        title: "TV Shows",
        subtitle: "Prestige dramas, addictive thrillers and stories worth staying up for.",
        emptyTitle: "No series found",
        emptyText: "Try another genre."
      };
    }
    if (view === "movies") {
      return {
        kicker: "Cineflix Films",
        title: "Movies",
        subtitle: "Blockbusters, award winners and modern classics — all in one place.",
        emptyTitle: "No films found",
        emptyText: "Try another genre."
      };
    }
    if (view === "new") {
      return {
        kicker: "Fresh on Cineflix",
        title: "New & Popular",
        subtitle: "The latest arrivals and the titles everyone is talking about.",
        emptyTitle: "Nothing new here yet",
        emptyText: "Check back soon for fresh releases."
      };
    }
    return {
      kicker: "Saved for later",
      title: "My List",
      subtitle: "Everything you've saved, ready for the perfect watch next.",
      emptyTitle: "Your list is waiting",
      emptyText: "Add films and series with the + button and they'll show up here, ready for your next movie night."
    };
  }

  function getViewItems(view) {
    let items;
    if (view === "tv") {
      items = allItems().filter(function (item) { return item.type === "tv"; });
    } else if (view === "movies") {
      items = allItems().filter(function (item) { return item.type === "movie"; });
    } else if (view === "new") {
      items = allItems().slice().sort(function (a, b) { return (b.year || 0) - (a.year || 0); });
    } else if (view === "list") {
      items = NFStore.getSavedItems();
    } else {
      items = allItems();
    }

    if (state.genre !== "All") {
      items = items.filter(function (item) { return item.genres.indexOf(state.genre) !== -1; });
    }
    return items;
  }

  function availableGenres(items) {
    const available = new Set();
    items.forEach(function (item) {
      item.genres.forEach(function (genre) { available.add(genre); });
    });
    return NF_DATA.genres.filter(function (genre) {
      return genre === "All" || available.has(genre);
    });
  }

  function renderGrid(view) {
    const meta = viewMeta(view);
    const allViewItems = getViewItems(view);
    const items = allViewItems;
    const empty = view === "list" ? NFStore.getSavedItems().length === 0 : items.length === 0;

    state.view = view;
    dom.hero.hidden = true;
    dom.rows.hidden = true;
    dom.searchSection.hidden = true;
    dom.viewSection.hidden = false;
    dom.viewKicker.textContent = meta.kicker;
    dom.viewTitle.textContent = meta.title;
    dom.viewSubtitle.textContent = meta.subtitle;
    dom.viewCount.textContent = items.length + (items.length === 1 ? " title" : " titles");

    const genres = availableGenres(items);
    if (genres.length > 2) {
      dom.viewChips.hidden = false;
      dom.viewChips.innerHTML = genres
        .map(function (genre) {
          return (
            '<button class="filter-chip' +
            (state.genre === genre ? " is-active" : "") +
            '" type="button" data-genre="' +
            esc(genre) +
            '">' +
            esc(genre) +
            "</button>"
          );
        })
        .join("");
    } else {
      dom.viewChips.hidden = true;
      dom.viewChips.innerHTML = "";
    }

    if (empty) {
      dom.viewGrid.innerHTML = "";
      dom.viewGrid.hidden = true;
      dom.viewEmpty.hidden = false;
      const heading = dom.viewEmpty.querySelector("h2");
      const copy = dom.viewEmpty.querySelector("p");
      const cta = dom.viewEmpty.querySelector("[data-view-link]");
      if (heading) heading.textContent = meta.emptyTitle;
      if (copy) copy.textContent = meta.emptyText;
      if (cta) {
        cta.textContent = view === "list" ? "Find something to watch" : "Browse movies";
        cta.dataset.viewLink = view === "list" ? "home" : "movies";
      }
    } else {
      dom.viewEmpty.hidden = true;
      dom.viewGrid.hidden = false;
      dom.viewGrid.innerHTML = items
        .map(function (item) { return cardHTML(item); })
        .join("");
    }

    updateNavSolid();
  }

  function navigate(view, options) {
    const opts = options || {};
    const target = ["home", "tv", "movies", "new", "list"].indexOf(view) !== -1 ? view : "home";
    state.view = target;
    state.genre = "All";
    state.searchMode = false;
    closeSearchUi({ clear: true, restore: false, collapse: true });
    setNavActive(target);

    if (target === "home") {
      showHome(!!opts.scroll);
    } else {
      renderGrid(target);
      if (opts.scroll) window.scrollTo({ top: 0, behavior: "auto" });
    }

    if (opts.push !== false) {
      const hash = target === "home" ? "#home" : "#" + (target === "list" ? "my-list" : target);
      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }
    }
    updateNavSolid();
  }

  function viewFromHash() {
    const raw = (window.location.hash || "").replace(/^#/, "").toLowerCase();
    if (raw === "my-list") return "list";
    if (raw === "tv" || raw === "movies" || raw === "new") return raw;
    return "home";
  }

  function showSearchArea() {
    state.searchMode = true;
    dom.hero.hidden = true;
    dom.rows.hidden = true;
    dom.viewSection.hidden = true;
    dom.searchSection.hidden = false;
    updateNavSolid();
  }

  function searchLocal(query) {
    const q = String(query || "").trim().toLowerCase();
    if (q.length < 2) return [];
    const scored = allItems()
      .map(function (item) {
        const title = item.title.toLowerCase();
        const genres = item.genres.join(" ").toLowerCase();
        const cast = item.cast.join(" ").toLowerCase();
        const director = String(item.director || "").toLowerCase();
        let score = 0;
        if (title === q) score = 5;
        else if (title.indexOf(q) === 0) score = 4;
        else if (title.indexOf(q) !== -1) score = 3;
        else if (genres.indexOf(q) !== -1 || cast.indexOf(q) !== -1 || director.indexOf(q) !== -1) score = 2;
        return { item: item, score: score };
      })
      .filter(function (entry) { return entry.score > 0; })
      .sort(function (a, b) {
        return b.score - a.score || (b.item.rating || 0) - (a.item.rating || 0);
      })
      .map(function (entry) { return entry.item; });
    return scored;
  }

  function mergeSearchResults(localResults, apiResults) {
    const merged = [];
    const seen = new Set();

    localResults.forEach(function (item) {
      const key = item.imdbID || item.id;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    apiResults.forEach(function (item) {
      const key = item.imdbID || item.id;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    return merged.slice(0, 36);
  }

  function setSearchLoading(loading) {
    dom.searchSkeleton.hidden = !loading;
    if (loading) {
      dom.searchSkeleton.innerHTML = new Array(10)
        .fill('<div class="skeleton-card" aria-hidden="true"></div>')
        .join("");
      dom.searchGrid.innerHTML = "";
      dom.searchGrid.hidden = true;
      dom.searchEmpty.hidden = true;
    }
  }

  function showSearchNote(kind, message) {
    if (!message) {
      dom.searchNote.hidden = true;
      return;
    }
    dom.searchNote.hidden = false;
    dom.searchNoteText.textContent = message;
  }

  function renderSearchResults(query, results, source) {
    state.searchQuery = query;
    state.searchResults = results;
    dom.searchTitle.textContent = "Results for “" + query + "”";
    dom.searchSubtitle.textContent =
      results.length +
      (results.length === 1 ? " title" : " titles") +
      (source === "omdb" ? " found across Cineflix and OMDb." : " found in the Cineflix catalogue.");
    dom.searchCount.textContent = results.length + (results.length === 1 ? " result" : " results");

    setSearchLoading(false);
    dom.searchGrid.innerHTML = results.map(function (item) { return cardHTML(item); }).join("");
    dom.searchGrid.hidden = results.length === 0;
    dom.searchEmpty.hidden = results.length !== 0;

    if (source === "omdb") {
      showSearchNote("online", "Live results from OMDb, matched with the Cineflix catalogue.");
    } else {
      showSearchNote(
        "offline",
        "Live OMDb search is unavailable right now — showing matches from the Cineflix catalogue."
      );
    }
  }

  async function performSearch(query) {
    const trimmed = String(query || "").trim();
    const token = ++state.searchToken;
    if (state.searchAbort) state.searchAbort.abort();

    if (trimmed.length < 2) {
      if (!trimmed) {
        restoreAfterSearch();
      } else {
        showSearchArea();
        dom.searchTitle.textContent = "Search Cineflix";
        dom.searchSubtitle.textContent = "Keep typing — enter at least 2 characters to search.";
        dom.searchCount.textContent = "";
        dom.searchGrid.innerHTML = "";
        dom.searchGrid.hidden = true;
        dom.searchSkeleton.hidden = true;
        dom.searchEmpty.hidden = true;
        showSearchNote(null, "");
      }
      return;
    }

    showSearchArea();
    dom.searchTitle.textContent = "Searching for “" + trimmed + "”";
    dom.searchSubtitle.textContent = "Looking across the Cineflix catalogue and OMDb…";
    dom.searchCount.textContent = "";
    showSearchNote(null, "");
    setSearchLoading(true);

    state.searchAbort = new AbortController();

    const localResults = searchLocal(trimmed);
    let apiResults = [];
    let source = "offline";

    try {
      apiResults = await OMDB.search(trimmed, { signal: state.searchAbort.signal });
      source = "omdb";
      state.omdbDown = false;
    } catch (error) {
      if (error.name === "AbortError") return;
      state.omdbDown = true;
      console.warn("OMDb search unavailable:", error.message);
    }

    if (token !== state.searchToken) return;
    const merged = mergeSearchResults(localResults, apiResults);
    renderSearchResults(trimmed, merged, source);
  }

  const debouncedSearch = NFUI.debounce(function () {
    performSearch(dom.searchInput.value);
  }, 430);

  function openSearchUi() {
    closePopovers();
    dom.searchWrap.classList.add("is-open");
    dom.searchToggle.setAttribute("aria-expanded", "true");
    window.setTimeout(function () { dom.searchInput.focus(); }, 40);
  }

  function closeSearchUi(options) {
    const opts = options || {};
    state.searchToken += 1;
    if (state.searchAbort) state.searchAbort.abort();
    dom.searchWrap.classList.remove("is-open");
    dom.searchToggle.setAttribute("aria-expanded", "false");
    if (opts.clear) {
      dom.searchInput.value = "";
      dom.searchWrap.classList.remove("has-value");
      dom.searchClear.hidden = true;
      state.searchQuery = "";
    }
    if (opts.restore !== false) {
      restoreAfterSearch();
    }
    if (opts.collapse) {
      dom.searchInput.blur();
    }
  }

  function restoreAfterSearch() {
    state.searchMode = false;
    dom.searchSection.hidden = true;
    dom.searchSkeleton.hidden = true;
    if (state.view === "home") {
      dom.hero.hidden = false;
      dom.rows.hidden = false;
      dom.viewSection.hidden = true;
      renderRows();
    } else {
      dom.hero.hidden = true;
      dom.rows.hidden = true;
      dom.viewSection.hidden = false;
      renderGrid(state.view);
    }
    updateNavSolid();
  }

  function bindSearch() {
    dom.searchToggle.addEventListener("click", function () {
      if (dom.searchWrap.classList.contains("is-open")) {
        closeSearchUi({ clear: true, restore: true, collapse: true });
      } else {
        openSearchUi();
      }
    });

    dom.searchInput.addEventListener("focus", function () {
      if (!dom.searchWrap.classList.contains("is-open")) openSearchUi();
    });

    dom.searchInput.addEventListener("input", function () {
      const value = dom.searchInput.value;
      dom.searchWrap.classList.toggle("has-value", value.length > 0);
      dom.searchClear.hidden = value.length === 0;
      if (!value.trim()) {
        state.searchToken += 1;
        if (state.searchAbort) state.searchAbort.abort();
        restoreAfterSearch();
        dom.searchInput.focus();
        return;
      }
      if (value.trim().length < 2) {
        performSearch(value);
        return;
      }
      state.searchToken += 1;
      if (state.searchAbort) state.searchAbort.abort();
      dom.searchTitle.textContent = "Searching for “" + value.trim() + "”";
      dom.searchSubtitle.textContent = "Looking across the Cineflix catalogue and OMDb…";
      showSearchArea();
      setSearchLoading(true);
      debouncedSearch();
    });

    dom.searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        performSearch(dom.searchInput.value);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        closeSearchUi({ clear: true, restore: true, collapse: true });
      }
    });

    dom.searchClear.addEventListener("click", function () {
      dom.searchInput.value = "";
      dom.searchWrap.classList.remove("has-value");
      dom.searchClear.hidden = true;
      state.searchToken += 1;
      if (state.searchAbort) state.searchAbort.abort();
      restoreAfterSearch();
      dom.searchInput.focus();
    });

    dom.searchClose.addEventListener("click", function () {
      closeSearchUi({ clear: true, restore: true, collapse: true });
    });
  }

  function syncListButtons(id) {
    const item = getItem(id);
    const added = NFStore.isInMyList(id);
    document.querySelectorAll('[data-action="list"]').forEach(function (button) {
      if (button.dataset.id !== id) return;
      button.innerHTML = added ? icons.check : icons.plus;
      button.setAttribute("aria-label", added ? "Remove from My List" : "Add to My List");
      button.title = added ? "Remove from My List" : "Add to My List";
    });
    updateListCount();
    if (state.activeItem && state.activeItem.id === id && item) {
      const detailButton = dom.detailContent.querySelector('[data-action="list"][data-id="' + id + '"]');
      if (detailButton) {
        detailButton.innerHTML = added ? icons.check : icons.plus;
        detailButton.setAttribute("aria-label", added ? "Remove from My List" : "Add to My List");
      }
    }
  }

  function toggleMyList(id) {
    const item = getItem(id);
    if (!item) return;
    const added = NFStore.toggleMyList(id, item);
    syncListButtons(id);
    updateListCount();

    if (state.view === "home" && !state.searchMode) {
      renderRows();
    } else if (state.view === "list" && !state.searchMode) {
      renderGrid("list");
    }

    NFUI.toast(added ? "Added to My List" : "Removed from My List", {
      title: added ? item.title : "Removed",
      duration: 2800
    });
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    closePopovers();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    const close = modal.querySelector(".modal-close");
    if (close) window.setTimeout(function () { close.focus(); }, 60);
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (id === "detailModal") {
      state.activeItem = null;
      state.detailToken = (state.detailToken || 0) + 1;
      dom.detailContent.innerHTML = "";
    }
    if (id === "playerModal") {
      dom.playerBody.innerHTML = "";
    }
    if (!document.querySelector(".cf-modal.is-open")) {
      document.body.classList.remove("no-scroll");
    }
  }

  function detailHeroBackground(item) {
    const fallback = item.id === "dune-part-two" ? "assets/img/backdrop-desert-2.jpg" : item.poster;
    const url = fallback || NFUI.posterFallback(item.title, item.accent);
    return String(url).replace(/"/g, "%22").replace(/'/g, "%27");
  }

  function detailContentHTML(item) {
    const added = NFStore.isInMyList(item.id);
    const genres = item.genres && item.genres.length ? item.genres : [item.type === "tv" ? "Series" : "Film"];
    const runtime = item.type === "tv" ? item.seasons || item.runtime || "Series" : item.runtime || "Feature";
    const rating = item.rating ? Number(item.rating).toFixed(1) + "/10" : "Not rated";
    const cast = item.cast && item.cast.length ? item.cast.join(", ") : "Cast information unavailable.";
    const source = item.omdb
      ? "Live metadata from OMDb · Poster: Cineflix catalogue"
      : item.isOmdbOnly
      ? "Metadata from OMDb"
      : "Cineflix catalogue metadata · Live details from OMDb when available";

    return (
      '<div class="detail-hero">' +
      '<div class="detail-hero__bg" style="background-image:url(\'' +
      detailHeroBackground(item) +
      '\')" aria-hidden="true"></div>' +
      '<div class="detail-hero__copy">' +
      '<p class="detail-kicker">' +
      esc(item.netflixOriginal ? "Cineflix Original" : item.type === "tv" ? "Cineflix Series" : "Cineflix Film") +
      "</p>" +
      '<h2 class="detail-title" id="detailTitle">' +
      esc(item.title) +
      "</h2>" +
      '<div class="detail-meta">' +
      '<span class="detail-match">' +
      matchScore(item) +
      "% Match</span>" +
      "<span>" +
      esc(yearText(item)) +
      "</span>" +
      (item.maturity ? '<span class="detail-badge">' + esc(item.maturity) + "</span>" : "") +
      "<span>" +
      esc(runtime) +
      "</span>" +
      '<span class="detail-badge">HD</span>' +
      "</div>" +
      '<div class="detail-actions">' +
      '<button class="btn-play" type="button" data-action="play" data-id="' +
      esc(item.id) +
      '">' +
      icons.play +
      "Play Trailer</button>" +
      '<button class="btn-round" type="button" data-action="list" data-id="' +
      esc(item.id) +
      '" aria-label="' +
      esc(added ? "Remove from My List" : "Add to My List") +
      '">' +
      (added ? icons.check : icons.plus) +
      "</button>" +
      "</div>" +
      "</div>" +
      '<div class="detail-poster"><img src="' +
      esc(posterSrc(item)) +
      '" alt="' +
      esc(item.title + " poster") +
      '" data-fallback-title="' +
      esc(item.title) +
      '" data-accent="' +
      esc(item.accent || "#8b1e24") +
      '"></div>' +
      "</div>" +
      '<div class="detail-body">' +
      "<div>" +
      '<p class="detail-description">' +
      (item.description
        ? esc(item.description)
        : "A synopsis for this title isn't available yet. Try again in a moment or open OMDb for more information.") +
      "</p>" +
      (item.tagline ? '<p class="detail-copy-block" style="font-style:italic;color:#c9b28e;">“' + esc(item.tagline) + '”</p>' : "") +
      '<div class="detail-copy-block"><strong>Cast:</strong> ' +
      esc(cast) +
      "</div>" +
      '<div class="detail-copy-block"><strong>' +
      (item.type === "tv" ? "Created by:" : "Director:") +
      "</strong> " +
      esc(item.director || "Not available") +
      "</div>" +
      '<p class="detail-source">' +
      esc(source) +
      "</p>" +
      "</div>" +
      '<dl class="detail-side">' +
      '<div class="detail-side__group"><dt>Genres</dt><dd><div class="detail-genres">' +
      genres
        .map(function (genre) { return '<span class="genre-tag">' + esc(genre) + "</span>"; })
        .join("") +
      "</div></dd></div>" +
      '<div class="detail-side__group"><dt>IMDb rating</dt><dd>' +
      esc(rating) +
      "</dd></div>" +
      '<div class="detail-side__group"><dt>' +
      (item.type === "tv" ? "Seasons" : "Runtime") +
      "</dt><dd>" +
      esc(runtime) +
      "</dd></div>" +
      '<div class="detail-side__group"><dt>Maturity rating</dt><dd>' +
      esc(item.maturity || "Not rated") +
      "</dd></div>" +
      '<div class="detail-side__group"><dt>Format</dt><dd>' +
      esc(item.type === "tv" ? "Series" : "Film") +
      "</dd></div>" +
      "</dl>" +
      "</div>"
    );
  }

  function crossCheckApiDetails(item) {
    if (!item || !item.imdbID || state.omdbDown) return;
    const token = (state.detailToken || 0) + 1;
    state.detailToken = token;
    OMDB.getById(item.imdbID)
      .then(function (live) {
        if (token !== state.detailToken) return;
        if (!dom.detailModal.classList.contains("is-open")) return;
        if (!state.activeItem || state.activeItem.imdbID !== item.imdbID) return;

        const current = state.activeItem;
        const merged = Object.assign({}, current, {
          rating: live.rating || current.rating,
          maturity: live.maturity || current.maturity,
          runtime: live.runtime || current.runtime,
          seasons: live.seasons || current.seasons,
          genres: live.genres && live.genres.length ? live.genres : current.genres,
          director: live.director || current.director,
          cast: live.cast && live.cast.length ? live.cast : current.cast,
          description: live.description || current.description,
          poster: current.poster || live.poster,
          omdb: live.omdb,
          isOmdbOnly: false
        });
        state.activeItem = merged;
        NFStore.cacheItem(merged);
        dom.detailContent.innerHTML = detailContentHTML(merged);
        syncListButtons(merged.id);
      })
      .catch(function (error) {
        if (error.name !== "AbortError") {
          state.omdbDown = true;
          console.warn("OMDb details unavailable:", error.message);
        }
      });
  }

  function openDetail(idOrItem) {
    const item = typeof idOrItem === "string" ? getItem(idOrItem) : idOrItem;
    if (!item) return;
    state.activeItem = item;
    state.detailToken = (state.detailToken || 0) + 1;
    NFStore.cacheItem(item);
    dom.detailContent.innerHTML = detailContentHTML(item);
    openModal("detailModal");
    crossCheckApiDetails(item);
  }

  function openPlayer(idOrItem) {
    const item = typeof idOrItem === "string" ? getItem(idOrItem) : idOrItem;
    if (!item) return;
    closeModal("detailModal");
    dom.playerTitle.textContent = item.title;

    if (item.trailer) {
      dom.playerBody.innerHTML =
        '<div class="player-frame">' +
        '<div class="player-frame__backdrop" style="background-image:url(\'' +
        detailHeroBackground(item) +
        '\')" aria-hidden="true"></div>' +
        '<div class="player-frame__loading" aria-hidden="true"><span></span>Loading official trailer…</div>' +
        '<iframe src="https://www.youtube-nocookie.com/embed/' +
        encodeURIComponent(item.trailer) +
        '?autoplay=1&rel=0&modestbranding=1" title="' +
        esc(item.title + " official trailer") +
        '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' +
        '<div class="player-caption"><span>Official trailer · If the player is blocked, open it on YouTube</span><a href="https://www.youtube.com/watch?v=' +
        encodeURIComponent(item.trailer) +
        '" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a></div>';
    } else {
      const query = encodeURIComponent(item.title + " official trailer");
      dom.playerBody.innerHTML =
        '<div class="player-placeholder">' +
        icons.playCircle +
        "<h3>Trailer not linked for this title</h3>" +
        "<p>We couldn't find a local trailer for “" +
        esc(item.title) +
        "”. You can still search for it on YouTube.</p>" +
        '<a class="btn-cf" href="https://www.youtube.com/results?search_query=' +
        query +
        '" target="_blank" rel="noopener noreferrer">Search YouTube</a>' +
        "</div>";
    }

    openModal("playerModal");
  }

  function handleAction(action, id) {
    if (action === "play") {
      openPlayer(id);
    } else if (action === "detail") {
      openDetail(id);
    } else if (action === "list") {
      toggleMyList(id);
    }
  }

  function bindGlobalClicks() {
    document.addEventListener("click", function (event) {
      const viewLink = event.target.closest("[data-view-link]");
      if (viewLink) {
        event.preventDefault();
        closePopovers();
        navigate(viewLink.dataset.viewLink, { push: true, scroll: true });
        return;
      }

      const viewTarget = event.target.closest("[data-view-target]");
      if (viewTarget) {
        event.preventDefault();
        navigate(viewTarget.dataset.viewTarget, { push: true, scroll: true });
        return;
      }

      const closeTarget = event.target.closest("[data-close]");
      if (closeTarget) {
        event.preventDefault();
        closeModal(closeTarget.dataset.close);
        return;
      }

      const action = event.target.closest("[data-action]");
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        handleAction(action.dataset.action, action.dataset.id);
        return;
      }

      const card = event.target.closest(".nf-card");
      if (card) {
        openDetail(card.dataset.itemId);
        return;
      }

      if (!event.target.closest(".nav-dropdown")) {
        closePopovers();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        const card = event.target.closest && event.target.closest(".nf-card");
        if (card && event.target === card) {
          event.preventDefault();
          openDetail(card.dataset.itemId);
        }
      }
    });
  }

  function bindNav() {
    dom.profileBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      togglePopover("profile");
    });

    dom.notifBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      renderNotifications();
      togglePopover("notifications");
    });

    dom.notifPanel.addEventListener("click", function (event) {
      const mark = event.target.closest("#markNotificationsRead");
      if (mark) {
        NFStore.markNotificationsRead();
        renderNotifications();
        NFUI.toast("You're all caught up.", { title: "Notifications", duration: 2200 });
        return;
      }
      const entry = event.target.closest("[data-notification-id]");
      if (entry) {
        const notification = notifications.find(function (n) { return n.id === entry.dataset.notificationId; });
        closePopovers();
        if (notification) openDetail(notification.itemId);
      }
    });

    document.getElementById("manageProfileBtn").addEventListener("click", function () {
      closePopovers();
      openProfileModal("profile");
    });

    document.getElementById("accountBtn").addEventListener("click", function () {
      closePopovers();
      openProfileModal("account");
    });

    document.getElementById("panelMyListBtn").addEventListener("click", function () {
      closePopovers();
      navigate("list", { push: true, scroll: true });
    });

    document.getElementById("helpBtn").addEventListener("click", function () {
      closePopovers();
      NFUI.toast("Help Centre isn't connected in this demo. Check the FAQ on the home page for answers.", {
        title: "Help Centre",
        duration: 3600
      });
    });

    document.getElementById("signOutBtn").addEventListener("click", function () {
      NFStore.signOut();
      window.location.href = "index.html?signedout=1";
    });

    window.addEventListener("scroll", updateNavSolid, { passive: true });
    window.addEventListener("resize", function () {
      document.querySelectorAll(".row-track").forEach(updateArrowState);
    });
  }

  function renderAvatarPicker(selected) {
    state.detailEditAvatar = selected;
    dom.avatarPicker.innerHTML = NFStore.AVATARS.map(function (avatar, index) {
      return (
        '<button class="avatar-option' +
        (avatar === selected ? " is-selected" : "") +
        '" type="button" data-avatar="' +
        esc(avatar) +
        '" aria-label="Avatar option ' +
        (index + 1) +
        '" aria-pressed="' +
        (avatar === selected ? "true" : "false") +
        '">' +
        '<img src="' +
        esc(avatar) +
        '" alt="" width="100" height="100">' +
        "</button>"
      );
    }).join("");
  }

  function openProfileModal(source) {
    user = NFStore.currentUser() || user;
    dom.profileModalTitle.textContent = source === "account" ? "Account settings" : "Edit profile";
    dom.profileNameInput.value = user.name;
    dom.profileNameInput.classList.add("is-filled");
    dom.profileAccountEmail.textContent = user.email;
    dom.profileAccountPlan.textContent = (user.plan || "Premium") + " plan";
    dom.profileMemberSince.textContent = NFStore.memberSince(user.createdAt);
    renderAvatarPicker(user.avatar);
    openModal("profileModal");
    window.setTimeout(function () {
      dom.avatarPicker.querySelector(".avatar-option.is-selected")?.focus();
    }, 70);
  }

  function bindProfileModal() {
    dom.avatarPicker.addEventListener("click", function (event) {
      const button = event.target.closest("[data-avatar]");
      if (!button) return;
      renderAvatarPicker(button.dataset.avatar);
      dom.avatarPicker.querySelector('[data-avatar="' + button.dataset.avatar + '"]')?.focus();
    });

    dom.profileForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const name = dom.profileNameInput.value.trim();
      NFUI.clearFieldError(dom.profileNameInput);
      if (name.length < 2) {
        NFUI.setFieldError(dom.profileNameInput, "Please enter a name with at least 2 characters.");
        return;
      }
      const updated = NFStore.updateCurrentUser({ name: name, avatar: state.detailEditAvatar });
      if (!updated) {
        NFUI.toast("Your profile couldn't be saved. Storage may be unavailable.", { type: "error" });
        return;
      }
      user = updated;
      hydrateHeader();
      if (state.view === "home" && !state.searchMode) renderRows();
      closeModal("profileModal");
      NFUI.toast("Your profile has been updated.", { title: "Profile saved", duration: 2600 });
    });
  }

  function bindModalClosing() {
    document.querySelectorAll(".cf-modal").forEach(function (modal) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) closeModal(modal.id);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        const openModalEl = document.querySelector(".cf-modal.is-open");
        if (openModalEl) {
          event.preventDefault();
          closeModal(openModalEl.id);
          return;
        }
        if (dom.searchWrap.classList.contains("is-open")) {
          closeSearchUi({ clear: true, restore: true, collapse: true });
          return;
        }
        closePopovers();
      }

      if (event.key === "Tab") {
        const modal = document.querySelector(".cf-modal.is-open");
        if (!modal) return;
        const focusable = Array.from(
          modal.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(function (el) {
          return el.offsetParent !== null;
        });
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  function handleInitialRoute() {
    const view = viewFromHash();
    if (!window.location.hash) {
      navigate("home", { push: false, scroll: false });
    } else {
      navigate(view, { push: false, scroll: false });
      if (view === "home" && window.location.hash !== "#home") {
        window.history.replaceState(null, "", "#home");
      }
    }
  }

  function init() {
    cacheDom();
    hydrateHeader();
    bindNav();
    bindSearch();
    bindGlobalClicks();
    bindProfileModal();
    bindModalClosing();
    renderHero();
    renderNotifications();
    updateNotificationBadge();
    handleInitialRoute();

    window.addEventListener("hashchange", function () {
      const view = viewFromHash();
      if (view !== state.view || state.searchMode) {
        navigate(view, { push: false, scroll: true });
      }
    });

    document.addEventListener("keydown", function (event) {
      const tag = (event.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || event.target.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearchUi();
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        openSearchUi();
      }
    });

    if (NFUI.getParam("welcome") === "1") {
      NFUI.toast("Your account is ready. Welcome to the movie night.", {
        title: "Welcome, " + firstName() + "!",
        duration: 4200
      });
      const clean = new URL(window.location.href);
      clean.searchParams.delete("welcome");
      window.history.replaceState(null, "", clean.pathname.split("/").pop() + clean.search + clean.hash);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
