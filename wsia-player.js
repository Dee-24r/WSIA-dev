/* WSIA embedded player. Configure with WSIA's verified direct HTTPS MP3/AAC stream. */
(() => {
  'use strict';
  const STREAM_URL = ''; // e.g. 'https://station.example/live.mp3' (replace with verified WSIA endpoint)
  const header = document.querySelector('header.site');
  if (!header || document.getElementById('wsia-live-player')) return;

  const section = document.createElement('section');
  section.id = 'wsia-live-player';
  section.className = 'wsia-player-bar';
  section.setAttribute('aria-label', 'WSIA live radio player');
  section.innerHTML = `
    <div class="wsia-player-inner">
      <div class="wsia-player-brand">
        <span class="wsia-player-signal" aria-hidden="true">♫</span>
        <div><strong>WSIA 88.9 FM</strong><span>Staten Island · Live radio</span></div>
      </div>
      <div class="wsia-player-actions">
        <button id="wsia-toggle" type="button" aria-label="Play WSIA radio">▶ Listen Live</button>
        <label class="wsia-volume">Volume <input id="wsia-volume" aria-label="Volume" type="range" min="0" max="100" value="70"></label>
      </div>
      <p id="wsia-status" class="wsia-player-status" role="status" aria-live="polite">Ready to connect</p>
    </div>`;
  header.insertAdjacentElement('afterend', section);

  const audio = new Audio();
  audio.preload = 'none';
  audio.volume = 0.7;
  audio.setAttribute('playsinline', '');
  const button = document.getElementById('wsia-toggle');
  const status = document.getElementById('wsia-status');
  const volume = document.getElementById('wsia-volume');
  let requestedPlayback = false;

  function setStatus(text, state = '') {
    status.textContent = text;
    section.dataset.state = state;
  }
  function setButton(playing) {
    button.textContent = playing ? '❚❚ Pause' : '▶ Listen Live';
    button.setAttribute('aria-label', playing ? 'Pause WSIA radio' : 'Play WSIA radio');
    button.setAttribute('aria-pressed', String(playing));
  }
  button.addEventListener('click', async () => {
    if (!audio.paused) {
      requestedPlayback = false;
      audio.pause();
      return;
    }
    if (!STREAM_URL) {
      setStatus('Stream not configured — add an HTTPS audio URL in wsia-player.js', 'error');
      return;
    }
    if (location.protocol === 'https:' && !STREAM_URL.startsWith('https://')) {
      setStatus('This site needs an HTTPS audio stream to avoid mixed-content blocking.', 'error');
      return;
    }
    if (!audio.src) audio.src = STREAM_URL;
    requestedPlayback = true;
    setStatus('Connecting…', 'loading');
    try { await audio.play(); }
    catch (err) {
      requestedPlayback = false;
      setButton(false);
      setStatus('Unable to play stream. Check the stream URL and station availability.', 'error');
      console.warn('WSIA stream playback error:', err);
    }
  });
  volume.addEventListener('input', () => { audio.volume = Number(volume.value) / 100; });
  audio.addEventListener('playing', () => { setButton(true); setStatus('On air · Listening live', 'live'); });
  audio.addEventListener('waiting', () => { if (requestedPlayback) setStatus('Buffering…', 'loading'); });
  audio.addEventListener('pause', () => { setButton(false); if (!audio.ended) setStatus('Paused'); });
  audio.addEventListener('ended', () => { requestedPlayback = false; setButton(false); setStatus('Stream ended'); });
  audio.addEventListener('error', () => { requestedPlayback = false; setButton(false); setStatus('Stream unavailable. Confirm the station is online.', 'error'); });

  // Site navigation uses fetch to replace ONLY <main>, keeping this <audio> instance alive.
  // Works on a local HTTP server / deployed site (not with file:// URLs).
  const cleanURL = (url) => new URL(url, window.location.href);
  let pageLoading = false;
  async function navigate(url, push = true) {
    if (pageLoading) return;
    pageLoading = true;
    try {
      const response = await fetch(url.href, { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const nextDoc = new DOMParser().parseFromString(html, 'text/html');
      const nextMain = nextDoc.querySelector('main');
      const currentMain = document.querySelector('main');
      if (!nextMain || !currentMain) throw new Error('Missing main element');
      currentMain.replaceWith(document.importNode(nextMain, true));
      if (push) history.pushState(null, '', url.href);
      document.title = nextDoc.title || document.title;
      document.querySelectorAll('nav.main a').forEach(a => {
        const matches = cleanURL(a.href).pathname === url.pathname;
        a.classList.toggle('active', matches);
        if (matches) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      // The homepage's prototype has an obsolete, nonfunctional mock player.
      removePrototypePlayer();
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      console.warn('Could not navigate without reloading:', err);
      window.location.assign(url.href); // reliable fallback; audio will stop on reload
    } finally { pageLoading = false; }
  }
  function removePrototypePlayer() {
    document.querySelectorAll('main section.card').forEach(card => {
      if (card.querySelector('.player') && card.querySelector('h2')?.textContent.trim() === 'Listen Live') card.remove();
    });
  }
  removePrototypePlayer();
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    const url = cleanURL(anchor.href);
    if (url.origin !== location.origin || !/\.html$/i.test(url.pathname) || location.protocol === 'file:') return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    event.preventDefault();
    navigate(url);
  });
  window.addEventListener('popstate', () => navigate(cleanURL(location.href), false));
})();
