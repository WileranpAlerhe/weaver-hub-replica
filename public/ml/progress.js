(function () {
  var KEY = "funnel_progress_v1";
  var ENTRY = ["/ml/", "/ml/index.html", "/ml/start.html"];
  var path = window.location.pathname.replace(/\/+$/, "/") || "/";
  var search = window.location.search || "";

  function isEntry(p) {
    var n = p.replace(/\/index\.html$/, "/");
    return ENTRY.some(function (e) {
      return e.replace(/\/index\.html$/, "/") === n;
    });
  }

  try {
    // Permite reiniciar o funil: ?restart=1
    if (/[?&]restart=1/.test(search)) {
      localStorage.removeItem(KEY);
      return;
    }

    if (isEntry(path)) {
      var saved = localStorage.getItem(KEY);
      if (saved && saved.indexOf("/ml/") === 0 && !isEntry(saved) && saved !== path) {
        window.location.replace(saved + search);
        return;
      }
    } else if (path.indexOf("/ml/") === 0) {
      localStorage.setItem(KEY, path);
    }
  } catch (e) {
    /* localStorage indisponível */
  }
})();
