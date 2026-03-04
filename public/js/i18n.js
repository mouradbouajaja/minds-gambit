(function() {
  var translations = null;
  var currentLang = 'en';

  function getDefaultLang() {
    var saved = localStorage.getItem('site-lang');
    if (saved && (saved === 'en' || saved === 'fr' || saved === 'ar')) return saved;
    var browserLang = (navigator.language || '').substring(0, 2);
    if (browserLang === 'fr') return 'fr';
    if (browserLang === 'ar') return 'ar';
    return 'en';
  }

  function applyTranslations(lang) {
    if (!translations || !translations[lang]) return;
    var t = translations[lang];
    var elements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
      var key = elements[i].getAttribute('data-i18n');
      if (t[key]) {
        if (elements[i].tagName === 'INPUT' || elements[i].tagName === 'TEXTAREA') {
          elements[i].placeholder = t[key];
        } else {
          elements[i].textContent = t[key];
        }
      }
    }
    var html = document.documentElement;
    html.setAttribute('lang', lang);
    if (lang === 'ar') {
      html.setAttribute('dir', 'rtl');
      document.body.classList.add('rtl');
    } else {
      html.setAttribute('dir', 'ltr');
      document.body.classList.remove('rtl');
    }
    var items = document.querySelectorAll('.lang-option');
    for (var j = 0; j < items.length; j++) {
      items[j].classList.toggle('active', items[j].getAttribute('data-lang') === lang);
    }
    currentLang = lang;
    localStorage.setItem('site-lang', lang);
  }

  function loadAndApply(lang) {
    if (translations) {
      applyTranslations(lang);
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/i18n/translations.json', true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        translations = JSON.parse(xhr.responseText);
        applyTranslations(lang);
      }
    };
    xhr.send();
  }

  window.toggleLangDropdown = function() {
    var dd = document.getElementById('lang-dropdown');
    if (dd) dd.classList.toggle('open');
  };

  document.addEventListener('click', function(e) {
    var switcher = document.getElementById('lang-switcher');
    var dd = document.getElementById('lang-dropdown');
    if (switcher && dd && !switcher.contains(e.target)) {
      dd.classList.remove('open');
    }
  });

  window.switchLang = function(lang) {
    loadAndApply(lang);
    var dd = document.getElementById('lang-dropdown');
    if (dd) dd.classList.remove('open');
  };

  // Bind event listeners for language switcher
  function bindLangEvents() {
    var btn = document.querySelector('.lang-btn');
    if (btn) btn.addEventListener('click', function() { window.toggleLangDropdown(); });
    var options = document.querySelectorAll('.lang-option');
    for (var i = 0; i < options.length; i++) {
      options[i].addEventListener('click', function() {
        window.switchLang(this.getAttribute('data-lang'));
      });
    }
  }

  // Bind events when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLangEvents);
  } else {
    bindLangEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      var lang = getDefaultLang();
      if (lang !== 'en') loadAndApply(lang);
    });
  } else {
    var lang = getDefaultLang();
    if (lang !== 'en') loadAndApply(lang);
  }
})();
