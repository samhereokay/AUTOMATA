// Global state
let currentPage = 1;
let currentFilters = {
  search: '',
  category: '',
  severity: ''
};

const ITEMS_PER_PAGE = 10;

// Exported for potential testing/reuse
export function buildApiUrl(base, filters, page) {
  let url = new URL(`${base}/api/news`);
  if (filters.search) {
    url = new URL(`${base}/api/news/search`);
    url.searchParams.set('query', filters.search);
  }

  if (filters.category) url.searchParams.set('category', filters.category);
  if (filters.severity) url.searchParams.set('severity', filters.severity);
  url.searchParams.set('page', page);
  url.searchParams.set('limit', ITEMS_PER_PAGE);

  return url.toString();
}

export function formatSeverity(severity) {
  if (!severity) return '';
  const s = severity.toLowerCase();
  let icon = '';
  if (s === 'critical') icon = '🔴';
  if (s === 'high') icon = '🟠';
  if (s === 'medium') icon = '🟡';
  if (s === 'low') icon = '🟢';
  return `<span class="severity-${s}">${icon} ${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
}

export function renderFeedItem(item) {
  const published = new Date(item.item.publishedAt).toLocaleString();
  const severityHtml = formatSeverity(item.analysis?.severity);
  const tagsHtml = (item.analysis?.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  
  return `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">
          <a href="#" onclick="window.app.viewStory('${item.item.id}'); return false;">
            ${escapeHtml(item.item.title)}
          </a>
        </h3>
        <div>${severityHtml}</div>
      </div>
      <div class="card-meta">
        ${escapeHtml(item.item.source)} &bull; ${published}
      </div>
      <div class="card-summary">
        ${escapeHtml(item.analysis?.summary || 'No summary available.')}
      </div>
      <div class="tags">
        ${tagsHtml}
      </div>
    </div>
  `;
}

export function renderStoryDetail(item) {
  const published = new Date(item.item.publishedAt).toLocaleString();
  const severityHtml = formatSeverity(item.analysis?.severity);
  const tagsHtml = (item.analysis?.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  
  const keyPointsHtml = (item.analysis?.keyPoints || []).map(kp => `<li>${escapeHtml(kp)}</li>`).join('');
  const entitiesHtml = (item.analysis?.entities || []).map(e => `<span class="tag">${escapeHtml(e)}</span>`).join('');
  const technologiesHtml = (item.analysis?.technologies || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  
  const relatedSourcesHtml = (item.item.relatedSources || []).map(s => 
    `<li>${escapeHtml(s)}</li>`
  ).join('');

  return `
    <article class="card">
      <div class="card-header">
        <h2 class="card-title">${escapeHtml(item.item.title)}</h2>
        <div>${severityHtml}</div>
      </div>
      
      <div class="story-meta">
        <span><strong>Source:</strong> <a href="${item.item.url}" target="_blank">${escapeHtml(item.item.source)}</a></span>
        <span><strong>Published:</strong> ${published}</span>
        <span><strong>Status:</strong> ${item.validation?.valid ? 'Verified' : 'Unverified'}</span>
      </div>

      <div class="story-section">
        <h3>Summary</h3>
        <p>${escapeHtml(item.analysis?.summary || 'No summary available.')}</p>
      </div>

      <div class="story-section">
        <h3>Key Points</h3>
        <ul>${keyPointsHtml}</ul>
      </div>

      <div class="story-section">
        <h3>Entities & Technologies</h3>
        <div class="tags" style="margin-bottom: 0.5rem;">${entitiesHtml}</div>
        <div class="tags">${technologiesHtml}</div>
      </div>

      <div class="story-section">
        <h3>Tags</h3>
        <div class="tags">${tagsHtml}</div>
      </div>

      ${item.item.relatedSources && item.item.relatedSources.length > 0 ? `
      <div class="story-section">
        <h3>Related Sources</h3>
        <ul>${relatedSourcesHtml}</ul>
      </div>` : ''}
    </article>
  `;
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Browser environment mounting logic
if (typeof window !== 'undefined') {
  window.app = {
    viewStory: async (id) => {
      document.getElementById('view-feed').style.display = 'none';
      document.getElementById('view-story').style.display = 'block';
      const container = document.getElementById('story-container');
      container.innerHTML = '<div class="status-msg">Loading story...</div>';
      
      try {
        const res = await fetch(`${window.NEWS_API_BASE}/api/news/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        container.innerHTML = renderStoryDetail(data);
      } catch (err) {
        container.innerHTML = `<div class="status-msg">Error loading story: ${err.message}</div>`;
      }
    },
    
    loadFeed: async () => {
      const container = document.getElementById('feed-container');
      const status = document.getElementById('feed-status');
      
      container.innerHTML = '';
      status.innerHTML = 'Loading news...';
      
      try {
        const url = buildApiUrl(window.NEWS_API_BASE, currentFilters, currentPage);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        
        if (data.items.length === 0) {
          status.innerHTML = 'No news found matching criteria.';
        } else {
          status.innerHTML = '';
          container.innerHTML = data.items.map(renderFeedItem).join('');
        }
        
        // Update pagination
        document.getElementById('page-info').textContent = `Page ${currentPage}`;
        document.getElementById('btn-prev').disabled = currentPage <= 1;
        document.getElementById('btn-next').disabled = data.items.length < ITEMS_PER_PAGE;
      } catch (err) {
        status.innerHTML = `Error loading feed: ${err.message}`;
      }
    }
  };

  // Wire up events on DOM Load
  window.addEventListener('DOMContentLoaded', () => {
    const btnSearch = document.getElementById('filter-search');
    const selCategory = document.getElementById('filter-category');
    const selSeverity = document.getElementById('filter-severity');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnBack = document.getElementById('btn-back');
    const navHome = document.getElementById('nav-home');

    // Debounce search slightly
    let searchTimeout;
    btnSearch.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentFilters.search = e.target.value.trim();
        currentPage = 1;
        window.app.loadFeed();
      }, 300);
    });

    selCategory.addEventListener('change', (e) => {
      currentFilters.category = e.target.value;
      currentPage = 1;
      window.app.loadFeed();
    });

    selSeverity.addEventListener('change', (e) => {
      currentFilters.severity = e.target.value;
      currentPage = 1;
      window.app.loadFeed();
    });

    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        window.app.loadFeed();
      }
    });

    btnNext.addEventListener('click', () => {
      currentPage++;
      window.app.loadFeed();
    });

    const goHome = () => {
      document.getElementById('view-story').style.display = 'none';
      document.getElementById('view-feed').style.display = 'block';
      if (document.getElementById('feed-container').innerHTML === '') {
        window.app.loadFeed();
      }
    };

    btnBack.addEventListener('click', goHome);
    navHome.addEventListener('click', (e) => {
      e.preventDefault();
      goHome();
    });

    // Initial load
    window.app.loadFeed();
  });
}
