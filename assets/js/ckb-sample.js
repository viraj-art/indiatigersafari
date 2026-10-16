/* SAMPLE PAGE ONLY (/sample/corbett-kanha-bandhavgarh-tiger-safari): "Expand all / Collapse all" for the
   day-by-day itinerary, and every day opened for printing. Without this file each day still opens on its own. */
(function () {
    'use strict';
    var days = document.querySelectorAll('.ckb-day');
    var button = document.querySelector('[data-ckb-toggle-all]');
    if (!days.length || !button) return;

    function allOpen() { return Array.prototype.every.call(days, function (d) { return d.open; }); }
    function sync() {
        var open = allOpen();
        button.textContent = open ? 'Collapse all' : 'Expand all';
        button.setAttribute('aria-expanded', String(open));
    }
    button.hidden = false;
    button.setAttribute('aria-controls', Array.prototype.map.call(days, function (d) { return d.id; }).join(' '));
    button.addEventListener('click', function () {
        var open = !allOpen();
        Array.prototype.forEach.call(days, function (d) { d.open = open; });
        sync();
    });
    Array.prototype.forEach.call(days, function (d) { d.addEventListener('toggle', sync); });
    sync();

    var closed = [];
    window.addEventListener('beforeprint', function () {
        closed = Array.prototype.filter.call(document.querySelectorAll('.ckb details'), function (d) { return !d.open; });
        closed.forEach(function (d) { d.open = true; });
    });
    window.addEventListener('afterprint', function () { closed.forEach(function (d) { d.open = false; }); closed = []; });
})();
