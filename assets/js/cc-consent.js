/*
 * Cookie consent (cc-). Stores the visitor's choice in one first-party cookie, cc_consent, for six months,
 * and nothing else. Content in a non-essential category is held back until that category is allowed:
 *   <script type="text/plain" data-cc-category="analytics" src="…">  becomes a real script;
 *   <template data-cc-category="marketing">…</template>             is put into the page in its place
 *     (an element marked data-cc-placeholder just before it is removed).
 * Withdrawing consent deletes the first-party analytics/marketing cookies the browser lets it reach and
 * reloads the page, so nothing held back keeps running.
 */
(function () {
    'use strict';

    var NAME = 'cc_consent';
    var MAX_AGE = 60 * 60 * 24 * 182;   // about six months, then the visitor is asked again
    var CATEGORIES = ['analytics', 'marketing'];
    // First-party cookies set by common analytics and advertising tags, removed when consent is withdrawn.
    var NON_ESSENTIAL = /^(_ga|_gid|_gat|_gcl|_fbp|_fbc|_hj|_clck|_clsk|_uet|_ttp|li_)/;

    var banner = document.querySelector('[data-cc-banner]');
    var panel = document.querySelector('[data-cc-panel]');
    if (!banner || !panel) return;

    function read() {
        var match = document.cookie.match(/(?:^|;\s*)cc_consent=([^;]*)/);
        if (!match) return null;
        var choice = {};
        decodeURIComponent(match[1]).split('.').forEach(function (part) {
            var kv = part.split(':');
            if (CATEGORIES.indexOf(kv[0]) !== -1) choice[kv[0]] = kv[1] === '1';
        });
        return choice;
    }

    function write(choice) {
        var value = CATEGORIES.map(function (c) { return c + ':' + (choice[c] ? '1' : '0'); }).join('.');
        document.cookie = NAME + '=' + encodeURIComponent(value) + '; Max-Age=' + MAX_AGE + '; Path=/; SameSite=Lax'
            + (location.protocol === 'https:' ? '; Secure' : '');
    }

    function deleteNonEssential() {
        var host = location.hostname;
        var domains = ['', host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
        document.cookie.split(';').forEach(function (pair) {
            var name = pair.split('=')[0].trim();
            if (!NON_ESSENTIAL.test(name)) return;
            domains.forEach(function (d) {
                document.cookie = name + '=; Max-Age=0; Path=/' + (d ? '; Domain=' + d : '');
            });
        });
    }

    // Put held-back content into the page for each allowed category.
    function activate(choice) {
        CATEGORIES.forEach(function (cat) {
            if (!choice[cat]) return;
            Array.prototype.forEach.call(document.querySelectorAll('script[type="text/plain"][data-cc-category="' + cat + '"]'), function (old) {
                var s = document.createElement('script');
                Array.prototype.forEach.call(old.attributes, function (a) {
                    if (a.name !== 'type' && a.name !== 'data-cc-category') s.setAttribute(a.name, a.value);
                });
                if (!old.src) s.textContent = old.textContent;
                old.replaceWith(s);
            });
            Array.prototype.forEach.call(document.querySelectorAll('template[data-cc-category="' + cat + '"]'), function (tpl) {
                var placeholder = tpl.previousElementSibling;
                if (placeholder && placeholder.hasAttribute('data-cc-placeholder')) placeholder.remove();
                tpl.replaceWith(tpl.content.cloneNode(true));
            });
        });
    }

    function syncToggles(choice) {
        Array.prototype.forEach.call(panel.querySelectorAll('[data-cc-toggle]'), function (input) {
            input.checked = !!(choice && choice[input.getAttribute('data-cc-toggle')]);
        });
    }

    // The banner's height, so the enquiry button can sit just above it on small screens.
    function measure() {
        document.documentElement.style.setProperty('--cc-banner-h', banner.hidden ? '0px' : banner.offsetHeight + 'px');
    }
    window.addEventListener('resize', measure);

    function showBanner(show) {
        banner.hidden = !show;
        document.documentElement.classList.toggle('cc-banner-open', show);
        measure();
    }

    var lastFocus = null;
    function openPanel() {
        syncToggles(read());
        lastFocus = document.activeElement;
        if (typeof panel.showModal === 'function') panel.showModal(); else panel.setAttribute('open', '');
        var first = panel.querySelector('[data-cc-toggle]');
        if (first) first.focus();
    }
    function closePanel() {
        if (typeof panel.close === 'function' && panel.open) panel.close(); else panel.removeAttribute('open');
    }
    panel.addEventListener('close', function () {
        if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    });

    function decide(choice) {
        var before = read() || {};
        write(choice);
        closePanel();
        showBanner(false);
        var withdrawn = CATEGORIES.some(function (c) { return before[c] && !choice[c]; });
        if (withdrawn) {
            deleteNonEssential();
            location.reload();   // anything already running from that category stops
            return;
        }
        activate(choice);
    }

    var all = { analytics: true, marketing: true };
    var none = { analytics: false, marketing: false };

    document.addEventListener('click', function (event) {
        var t = event.target.closest('[data-cc-accept],[data-cc-reject],[data-cc-manage],[data-cc-save],[data-cc-close],[data-cc-settings]');
        if (!t) return;
        if (t.hasAttribute('data-cc-accept')) decide(all);
        else if (t.hasAttribute('data-cc-reject')) decide(none);
        else if (t.hasAttribute('data-cc-save')) {
            var choice = {};
            Array.prototype.forEach.call(panel.querySelectorAll('[data-cc-toggle]'), function (input) {
                choice[input.getAttribute('data-cc-toggle')] = input.checked;
            });
            decide(choice);
        } else if (t.hasAttribute('data-cc-close')) closePanel();
        else {
            event.preventDefault();
            openPanel();
        }
    });

    // Without native <dialog>, keep focus inside the panel and close it with Escape.
    panel.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && typeof panel.showModal !== 'function') { closePanel(); return; }
        if (event.key !== 'Tab') return;
        var stops = panel.querySelectorAll('button, input, a[href]');
        var first = stops[0], last = stops[stops.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    // A click on the dimmed area outside the panel closes it.
    panel.addEventListener('click', function (event) { if (event.target === panel) closePanel(); });

    var saved = read();
    if (saved) activate(saved); else showBanner(true);
})();
