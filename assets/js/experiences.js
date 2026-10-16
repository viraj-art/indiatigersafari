/* Experiences listing (tours.php): show prices in one currency at a time. The choice is remembered in this
   browser only. Without this file every card simply shows all four currencies. */
(function () {
    'use strict';
    var root = document.querySelector('[data-xp]');
    var group = document.querySelector('[data-currency]');
    if (!root || !group) return;
    var buttons = group.querySelectorAll('[data-cur]');

    function choose(cur) {
        root.setAttribute('data-cur', cur);
        Array.prototype.forEach.call(buttons, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cur') === cur)); });
        try { localStorage.setItem('its-currency', cur); } catch (e) { /* private mode: not remembered */ }
    }

    var saved = null;
    try { saved = localStorage.getItem('its-currency'); } catch (e) { saved = null; }
    choose(/^(USD|CAD|EUR|GBP)$/.test(saved || '') ? saved : 'USD');

    group.addEventListener('click', function (event) {
        var chosen = event.target.closest('[data-cur]');
        if (chosen) choose(chosen.getAttribute('data-cur'));
    });
})();
