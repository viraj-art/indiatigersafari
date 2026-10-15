/*
 * SAMPLE PAGE ONLY (/sample/tiger-safari-golden-triangle-tour). Progressive enhancement: the page is
 * complete without this file (the stays table shows all three collections and every <details> works).
 */
(function () {
    'use strict';
    var root = document.documentElement;
    root.classList.add('sp-js');

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- Collections: one choice carried through the cards, the day "Stay" lines and the form ---- */
    var radios = document.querySelectorAll('input[name="sp-collection"]');
    var field = document.querySelector('[data-sp-collection-field]');

    function setCollection(id, updateUrl) {
        if (!document.querySelector('input[name="sp-collection"][value="' + id + '"]')) return;
        Array.prototype.forEach.call(radios, function (r) { r.checked = r.value === id; });
        Array.prototype.forEach.call(document.querySelectorAll('[data-sp-for]'), function (el) {
            el.hidden = el.getAttribute('data-sp-for') !== id;
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-sp-blurb]'), function (el) {
            el.hidden = el.getAttribute('data-sp-blurb') !== id;
        });
        if (field) {
            Array.prototype.forEach.call(field.options, function (o) { o.selected = o.getAttribute('data-id') === id; });
        }
        if (updateUrl && window.history && history.replaceState) {
            var url = new URL(window.location.href);
            url.searchParams.set('collection', id);
            history.replaceState(null, '', url.toString());
        }
    }
    Array.prototype.forEach.call(radios, function (r) {
        r.addEventListener('change', function () { if (r.checked) setCollection(r.value, true); });
    });
    // A collection chosen in the form also carries back through the page.
    if (field) {
        field.addEventListener('change', function () {
            var o = field.options[field.selectedIndex];
            if (o) setCollection(o.getAttribute('data-id'), true);
        });
    }
    var initial = new URL(window.location.href).searchParams.get('collection');
    if (initial) setCollection(initial, false);

    /* ---- Day by day: expand all / collapse all ---- */
    var days = document.querySelectorAll('.sp-day');
    var toggleAll = document.querySelector('[data-sp-toggle-all]');
    function syncToggle() {
        var allOpen = Array.prototype.every.call(days, function (d) { return d.open; });
        toggleAll.textContent = allOpen ? 'Collapse all' : 'Expand all';
        toggleAll.setAttribute('aria-expanded', allOpen ? 'true' : 'false');
    }
    if (toggleAll && days.length) {
        toggleAll.hidden = false;
        toggleAll.setAttribute('aria-controls', Array.prototype.map.call(days, function (d) { return d.id; }).join(' '));
        toggleAll.addEventListener('click', function () {
            var open = !Array.prototype.every.call(days, function (d) { return d.open; });
            Array.prototype.forEach.call(days, function (d) { d.open = open; });
            syncToggle();
        });
        Array.prototype.forEach.call(days, function (d) { d.addEventListener('toggle', syncToggle); });
        syncToggle();
    }

    /* ---- Print: open every day and reference section, then put them back ---- */
    var closedForPrint = [];
    window.addEventListener('beforeprint', function () {
        closedForPrint = Array.prototype.filter.call(document.querySelectorAll('.sp details'), function (d) { return !d.open; });
        closedForPrint.forEach(function (d) { d.open = true; });
    });
    window.addEventListener('afterprint', function () {
        closedForPrint.forEach(function (d) { d.open = false; });
        closedForPrint = [];
    });

    /* ---- Map key: hovering or focusing a stop lights up its number on the map ---- */
    var circles = document.querySelectorAll('.sp-map [data-part="stops"] circle');
    Array.prototype.forEach.call(document.querySelectorAll('[data-sp-stop]'), function (item) {
        var circle = circles[parseInt(item.getAttribute('data-sp-stop'), 10) - 1];
        if (!circle) return;
        function on() { item.classList.add('is-lit'); circle.classList.add('is-lit'); }
        function off() { item.classList.remove('is-lit'); circle.classList.remove('is-lit'); }
        item.addEventListener('mouseenter', on);
        item.addEventListener('mouseleave', off);
        item.addEventListener('focus', on);
        item.addEventListener('blur', off);
    });

    /* ---- Sticky call to action: never over the form or the footer. On phones it waits until the first
       screen has scrolled away; on larger screens the discreet edge tab shows from the start. ---- */
    var bar = document.querySelector('[data-sp-bar]');
    var head = document.getElementById('sp-top');
    var enquire = document.getElementById('sp-enquire');
    var foot = document.querySelector('footer');
    var wide = window.matchMedia('(min-width: 64rem)');
    if (bar && head && 'IntersectionObserver' in window) {
        var state = { past: false, form: false, foot: false };
        var update = function () { bar.hidden = !((state.past || wide.matches) && !state.form && !state.foot); };
        if (wide.addEventListener) wide.addEventListener('change', update);
        new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.target === head) state.past = !e.isIntersecting && e.boundingClientRect.top < 0;
                if (e.target === enquire) state.form = e.isIntersecting;
                if (e.target === foot) state.foot = e.isIntersecting;
            });
            update();
        }).observe(head);
        var watch = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.target === enquire) state.form = e.isIntersecting;
                if (e.target === foot) state.foot = e.isIntersecting;
            });
            update();
        });
        if (enquire) watch.observe(enquire);
        if (foot) watch.observe(foot);
    }

    // In-page links scroll gently (unless reduced motion is asked for) and move focus to the target.
    Array.prototype.forEach.call(document.querySelectorAll('.sp a[href^="#"], .sp-bar a[href^="#"]'), function (a) {
        a.addEventListener('click', function (event) {
            var target = document.getElementById(a.getAttribute('href').slice(1));
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            var focusable = target.id === 'sp-enquire' ? target.querySelector('input:not([type="hidden"]):not([tabindex="-1"])') : null;
            if (focusable) {
                setTimeout(function () { focusable.focus({ preventScroll: true }); }, reduceMotion ? 0 : 500);
            } else {
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }
            if (history.replaceState) history.replaceState(null, '', window.location.pathname + window.location.search + '#' + target.id);
        });
    });

    /* ---- Enquiry: sent to the site's /enquire endpoint and answered on the page ---- */
    var form = document.querySelector('[data-sp-form]');
    var sent = document.querySelector('[data-sp-sent]');
    if (form && window.fetch && window.FormData) {
        var send = form.querySelector('[type="submit"]');
        var clear = function () {
            Array.prototype.forEach.call(form.querySelectorAll('[data-error-for]'), function (el) { el.hidden = true; el.textContent = ''; });
            Array.prototype.forEach.call(form.querySelectorAll('.has-error'), function (el) { el.classList.remove('has-error'); });
            Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
        };
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            clear();
            send.disabled = true;
            send.textContent = 'Sending…';
            var fail = { ok: false, errors: { form: 'Your enquiry could not be sent just now. Please try again, or reach us on WhatsApp.' } };
            fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'fetch', Accept: 'application/json' } })
                .then(function (r) { return r.json(); })
                .catch(function () { return fail; })
                .then(function (result) {
                    send.disabled = false;
                    send.textContent = 'Send enquiry';
                    if (result && result.ok) {
                        form.hidden = true;
                        sent.hidden = false;
                        sent.focus();
                        return;
                    }
                    var first = null;
                    Object.keys((result && result.errors) || {}).forEach(function (name) {
                        var note = form.querySelector('[data-error-for="' + name + '"]');
                        if (note) { note.textContent = result.errors[name]; note.hidden = false; }
                        var input = form.elements[name];
                        if (input && input.setAttribute) {
                            input.setAttribute('aria-invalid', 'true');
                            if (input.closest('.form-field')) input.closest('.form-field').classList.add('has-error');
                            first = first || input;
                        }
                    });
                    if (first) first.focus();
                });
        });
    }
})();
