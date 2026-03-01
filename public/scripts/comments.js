var SUPABASE_URL = '';
var SUPABASE_ANON_KEY = '';
var supabaseReady = false;
var clerkReady = false;
var db = null;
var currentUser = null;
var articleSlug = window.location.pathname.replace('/blog/', '').replace(/\/$/, '');

function waitForClerk() {
  if (window.Clerk && window.Clerk.user !== undefined) {
    clerkReady = true;
    currentUser = window.Clerk.user;
    updateAuthUI();
    setupContentLock();
    return;
  }
  document.addEventListener('clerk:loaded', function() {
    clerkReady = true;
    currentUser = window.Clerk.user;
    updateAuthUI();
    setupContentLock();
  });
  var attempts = 0;
  var poll = setInterval(function() {
    attempts++;
    if (window.Clerk && window.Clerk.user !== undefined) {
      clearInterval(poll);
      clerkReady = true;
      currentUser = window.Clerk.user;
      updateAuthUI();
      setupContentLock();
    }
    if (attempts > 50) clearInterval(poll);
  }, 200);
}

function setupContentLock() {
  var lock = document.getElementById('content-lock');
  var content = document.getElementById('locked-content');
  if (currentUser) {
    if (lock) lock.style.display = 'none';
    if (content) {
      content.style.filter = 'none';
      content.style.pointerEvents = 'auto';
      content.style.userSelect = 'auto';
    }
  } else {
    if (lock) lock.style.display = '';
    if (content) {
      content.style.filter = 'blur(5px)';
      content.style.pointerEvents = 'none';
      content.style.userSelect = 'none';
    }
  }
}

function updateAuthUI() {
  var loginPrompt = document.getElementById('login-prompt');
  var commentForm = document.getElementById('comment-form');
  var avatarEl = document.getElementById('user-avatar');
  var nameEl = document.getElementById('user-name');
  if (currentUser) {
    if (loginPrompt) loginPrompt.style.display = 'none';
    if (commentForm) commentForm.style.display = 'block';
    if (avatarEl) avatarEl.src = currentUser.imageUrl || '';
    if (nameEl) nameEl.textContent = currentUser.fullName || currentUser.firstName || 'User';
  } else {
    if (loginPrompt) loginPrompt.style.display = '';
    if (commentForm) commentForm.style.display = 'none';
  }
}

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    var el = document.getElementById('comments-loading');
    if (el) el.textContent = 'Comments coming soon!';
    return;
  }
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload = function() {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseReady = true;
    loadComments();
  };
  document.head.appendChild(s);
  }

function loadComments() {
  if (!supabaseReady) return;
  db.from('comments').select('*').eq('article_slug', articleSlug).order('created_at', { ascending: true }).then(function(result) {
    if (result.error) {
      var el = document.getElementById('comments-loading');
      if (el) el.textContent = 'Could not load comments.';
      return;
    }
    renderComments(result.data || []);
  });
}

function renderComments(comments) {
  var container = document.getElementById('comments-list');
  var noComments = document.getElementById('no-comments');
  var loading = document.getElementById('comments-loading');
  if (loading) loading.style.display = 'none';
  if (comments.length === 0) {
    if (container) container.innerHTML = '';
    if (noComments) noComments.style.display = 'block';
    return;
  }
  if (noComments) noComments.style.display = 'none';
  var topLevel = [];
  var replies = {};
  comments.forEach(function(c) {
    if (!c.parent_id) { topLevel.push(c); }
    else {
      if (!replies[c.parent_id]) replies[c.parent_id] = [];
      replies[c.parent_id].push(c);
    }
  });
  if (container) {
    container.innerHTML = '';
    topLevel.forEach(function(c) { container.appendChild(buildCommentEl(c, replies, 0)); });
  }
        }

function buildCommentEl(comment, replies, depth) {
  var div = document.createElement('div');
  div.className = 'comment' + (depth > 0 ? ' comment-reply' : '');
  div.setAttribute('data-id', comment.id);
  var timeAgo = getTimeAgo(new Date(comment.created_at));
  div.innerHTML = '<div class="comment-header"><img class="comment-avatar" src="' + (comment.user_avatar || '') + '" alt="" /><div class="comment-meta"><span class="comment-author">' + escapeHtml(comment.user_name) + '</span><span class="comment-time">' + timeAgo + '</span></div></div><div class="comment-body">' + escapeHtml(comment.content) + '</div><div class="comment-actions">' + (currentUser ? '<button class="reply-btn" data-id="' + comment.id + '" data-name="' + escapeHtml(comment.user_name) + '">Reply</button>' : '') + '</div>';
  if (replies[comment.id]) {
    var rd = document.createElement('div');
    rd.className = 'comment-replies';
    replies[comment.id].forEach(function(r) { rd.appendChild(buildCommentEl(r, replies, depth + 1)); });
    div.appendChild(rd);
  }
  return div;
}

function escapeHtml(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
  }

function getTimeAgo(date) {
  var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  var minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  var days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  var months = Math.floor(days / 30);
  if (months < 12) return months + 'mo ago';
  return Math.floor(months / 12) + 'y ago';
}

function setupEventListeners() {
  var signupBtn = document.getElementById('signup-btn');
  var signinBtn = document.getElementById('signin-btn');
  var discussionSignin = document.getElementById('discussion-signin');
  if (signupBtn) signupBtn.addEventListener('click', function() { if (window.Clerk) window.Clerk.openSignUp(); });
  if (signinBtn) signinBtn.addEventListener('click', function() { if (window.Clerk) window.Clerk.openSignIn(); });
  if (discussionSignin) discussionSignin.addEventListener('click', function() { if (window.Clerk) window.Clerk.openSignIn(); });
  var submitBtn = document.getElementById('submit-comment');
  if (submitBtn) submitBtn.addEventListener('click', submitComment);
  var cancelBtn = document.getElementById('cancel-reply');
  if (cancelBtn) cancelBtn.addEventListener('click', function() {
    document.getElementById('reply-to').value = '';
    cancelBtn.style.display = 'none';
    document.getElementById('comment-input').placeholder = 'Share your thoughts...';
  });
  document.addEventListener('click', function(e) {
    if (e.target.classList && e.target.classList.contains('reply-btn')) {
      var parentId = e.target.getAttribute('data-id');
      var parentName = e.target.getAttribute('data-name');
      document.getElementById('reply-to').value = parentId;
      document.getElementById('comment-input').placeholder = 'Replying to ' + parentName + '...';
      document.getElementById('comment-input').focus();
      document.getElementById('cancel-reply').style.display = 'inline-block';
    }
  });
                                          }

function submitComment() {
  if (!supabaseReady || !currentUser) return;
  var input = document.getElementById('comment-input');
  var content = input.value.trim();
  if (!content) return;
  var parentId = document.getElementById('reply-to').value || null;
  var btn = document.getElementById('submit-comment');
  btn.disabled = true;
  btn.textContent = 'Posting...';
  db.from('comments').insert({
    article_slug: articleSlug,
    user_id: currentUser.id,
    user_name: currentUser.fullName || currentUser.firstName || 'User',
    user_avatar: currentUser.imageUrl || '',
    parent_id: parentId,
    content: content
  }).then(function(result) {
    btn.disabled = false;
    btn.textContent = 'Post Comment';
    if (result.error) { alert('Could not post comment. Please try again.'); return; }
    input.value = '';
    document.getElementById('reply-to').value = '';
    document.getElementById('cancel-reply').style.display = 'none';
    input.placeholder = 'Share your thoughts...';
    loadComments();
  });
}

waitForClerk();
initSupabase();
setupEventListeners();
