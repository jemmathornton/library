// The family's shared code (dark mode, footer, Menu drawer: one copy in Jemma's Journals, site/family). Served (the family server,
// the Library's own server, online, the tests) it is at /family/; opened straight from the folder it is in Jemma's Journals'
// site/family beside this folder. Chosen here before anything is asked for (round 5: opened as a file the page asked /family/ first,
// which logged three errors and drew light before turning dark). Written into the page as it is read, so mode.js still runs before
// the stylesheet (no flash of the wrong mode) and family.js stays deferred, ahead of js/app.js.
(function () {
  var base = location.protocol === "file:" ? new URL("../../site/family/", location.href).href : "/family/";
  document.write('<script src="' + base + 'mode.js" data-old-key="jemmas-library-mode"><\/script>' +
    '<link rel="stylesheet" href="' + base + 'family.css">' +
    '<script src="' + base + 'family.js" defer><\/script>');
})();
