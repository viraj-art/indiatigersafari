/**
 * India Tiger Safari: public site behaviour.
 * Everything here is an enhancement; the pages read and navigate without it.
 */
(() => {
    'use strict';

    const root = document.documentElement;
    const header = document.querySelector('[data-site-header]');
    const toggle = document.querySelector('[data-nav-toggle]');
    const nav = document.querySelector('[data-nav]');
    const label = document.querySelector('[data-nav-label]');
    const smallScreen = window.matchMedia('(max-width: 1023.98px)');

    // Header condenses once the page has moved.
    if (header) {
        // Two thresholds, well apart, so the bar never flickers between its
        // two states when the page rests near the point of change.
        let condensed = false;
        const condense = () => {
            const y = window.scrollY;
            if (!condensed && y > 90) {
                condensed = true;
            } else if (condensed && y < 30) {
                condensed = false;
            } else {
                return;
            }
            header.classList.toggle('is-condensed', condensed);
        };
        window.addEventListener('scroll', condense, { passive: true });
        condense();
    }

    // Full-screen menu on small screens.
    if (toggle && nav) {
        const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

        const setOpen = (open) => {
            toggle.setAttribute('aria-expanded', String(open));
            root.classList.toggle('menu-open', open);
            if (label) {
                label.textContent = open ? 'Close' : 'Menu';
            }
        };

        // While closed, the panel's links stay out of the tab order.
        const syncInert = () => {
            nav.inert = smallScreen.matches && !isOpen();
        };

        toggle.addEventListener('click', () => {
            setOpen(!isOpen());
            syncInert();
            if (isOpen()) {
                nav.querySelector('a')?.focus();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (!isOpen()) {
                return;
            }
            if (event.key === 'Escape') {
                setOpen(false);
                syncInert();
                toggle.focus();
                return;
            }
            // Keep focus within the toggle and the panel while it is open.
            if (event.key === 'Tab') {
                const stops = [toggle, ...nav.querySelectorAll('a')];
                const first = stops[0];
                const last = stops[stops.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        });

        // Following a link (including same-page anchors) closes the panel.
        nav.addEventListener('click', (event) => {
            if (event.target.closest('a') && isOpen()) {
                setOpen(false);
                syncInert();
            }
        });

        smallScreen.addEventListener('change', () => {
            setOpen(false);
            syncInert();
        });
        syncInert();
    }

    // Hero film: never plays for visitors who prefer reduced motion, and can
    // always be paused by everyone else.
    const film = document.querySelector('[data-hero-video]');
    const pause = document.querySelector('[data-hero-pause]');
    if (film) {
        // Visitors saving data, or on a very slow connection, keep the still image instead of downloading the film.
        const connection = navigator.connection || {};
        const saveData = connection.saveData === true || /(^|-)2g$/.test(connection.effectiveType || '');
        if (saveData) {
            film.removeAttribute('autoplay');
            film.pause();
            film.querySelectorAll('source').forEach((source) => source.remove());
            film.load();
            film.hidden = true;
        } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            film.removeAttribute('autoplay');
            film.pause();
        } else if (pause) {
            pause.hidden = false;
            pause.addEventListener('click', () => {
                const paused = !film.paused;
                if (paused) {
                    film.pause();
                } else {
                    film.play();
                }
                // The control is an icon; its name for screen readers says what it will do.
                pause.setAttribute('aria-label', paused ? 'Play film' : 'Pause film');
                pause.classList.toggle('is-paused', paused);
            });
        }
    }

    // Sliding rows. Every group of more than one photograph (card grids, photo pairs and trios, the
    // About gallery, tour stays) is a swipeable row; larger screens also get previous / next arrows
    // beneath it. The home page strips have their arrows in the section heading already.
    const rowSelector = '.card-grid, .tour-figures--pair, .tour-figures--three, .about-gallery, .stays, .alternatives';
    const arrow = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
    let rowCount = 0;
    document.querySelectorAll(rowSelector).forEach((row) => {
        if (row.children.length < 2) {
            return;
        }
        row.id = row.id || `slide-row-${++rowCount}`;
        const controls = document.createElement('div');
        controls.className = 'strip-controls strip-controls--after';
        controls.dataset.stripControls = row.id;
        controls.hidden = true;
        controls.innerHTML = `<button type="button" class="strip-controls__btn" data-strip-prev aria-controls="${row.id}" aria-label="Scroll back">${arrow('M15 5l-7 7 7 7')}</button>`
            + `<button type="button" class="strip-controls__btn" data-strip-next aria-controls="${row.id}" aria-label="Scroll for more">${arrow('M9 5l7 7-7 7')}</button>`;
        row.after(controls);
    });

    // Previous / next move by about a screenful, and each arrow rests at its end of the row.
    document.querySelectorAll('[data-strip-controls]').forEach((controls) => {
        const strip = document.getElementById(controls.dataset.stripControls);
        if (!strip) {
            return;
        }
        const prev = controls.querySelector('[data-strip-prev]');
        const next = controls.querySelector('[data-strip-next]');
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const update = () => {
            const max = strip.scrollWidth - strip.clientWidth - 2;
            prev.disabled = strip.scrollLeft <= 2;
            next.disabled = strip.scrollLeft >= max;
            controls.hidden = max <= 0;   // nothing to slide when everything already fits
        };
        const step = () => Math.max(strip.clientWidth * 0.8, 280);
        prev.addEventListener('click', () => strip.scrollBy({ left: -step(), behavior: smooth ? 'smooth' : 'auto' }));
        next.addEventListener('click', () => strip.scrollBy({ left: step(), behavior: smooth ? 'smooth' : 'auto' }));
        let timer = null;
        strip.addEventListener('scroll', () => {
            clearTimeout(timer);
            timer = setTimeout(update, 60);
        }, { passive: true });
        window.addEventListener('resize', update);
        // Rows that start hidden (a filtered group, a closed section) are measured again once they show.
        if ('ResizeObserver' in window) {
            new ResizeObserver(update).observe(strip);
        }
        update();
    });

    // Experiences page: show all groups, or one.
    const filters = document.querySelector('[data-filters]');
    if (filters) {
        const buttons = filters.querySelectorAll('[data-filter]');
        const groups = document.querySelectorAll('[data-group]');
        filters.addEventListener('click', (event) => {
            const chosen = event.target.closest('[data-filter]');
            if (!chosen) {
                return;
            }
            buttons.forEach((button) => button.setAttribute('aria-pressed', String(button === chosen)));
            groups.forEach((group) => {
                group.hidden = chosen.dataset.filter !== 'all' && group.dataset.group !== chosen.dataset.filter;
            });
        });
    }

    // Tour page: mark the section being read in the page navigation.
    const tourNav = document.querySelector('[data-tour-nav]');
    if (tourNav) {
        const links = new Map();
        tourNav.querySelectorAll('a[href^="#"]').forEach((link) => {
            const section = document.getElementById(link.getAttribute('href').slice(1));
            if (section) {
                links.set(section, link);
            }
        });
        const sections = [...links.keys()];
        let marked = null;

        // The current section is the last one whose top has passed just below
        // the sticky header; at the very foot of the page it is the last one.
        const mark = () => {
            // Just below where a section lands when its link is followed
            // (see scroll-padding-top and .tour-section in site.css).
            const line = smallScreen.matches ? 200 : 150;
            let current = sections[0];
            sections.forEach((section) => {
                if (section.getBoundingClientRect().top <= line) {
                    current = section;
                }
            });
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
                current = sections[sections.length - 1];
            }
            if (current === marked) {
                return;
            }
            marked = current;
            links.forEach((link) => link.removeAttribute('aria-current'));
            const link = links.get(current);
            link.setAttribute('aria-current', 'true');
            // On small screens the navigation is a horizontal strip: keep the current item in view.
            if (tourNav.scrollWidth > tourNav.clientWidth) {
                tourNav.scrollTo({ left: link.offsetLeft - 16, behavior: 'auto' });
            }
        };

        window.addEventListener('scroll', mark, { passive: true });
        window.addEventListener('resize', mark);
        mark();
    }

    // Journal: filter the posts as the visitor types. Without this script the
    // form still works, by loading /blog?q=… from the server.
    const blogSearch = document.querySelector('[data-blog-search]');
    const blogList = document.querySelector('[data-blog-list]');
    const blogStatus = document.querySelector('[data-blog-status]');
    if (blogSearch && blogList && blogStatus) {
        const box = blogSearch.querySelector('input[type="search"]');
        // A page that arrived already filtered holds only its matches, so a
        // new search is left to the server; otherwise every post is here.
        const complete = !new URLSearchParams(window.location.search).has('q');
        const cards = [...blogList.querySelectorAll('[data-search]')];

        const filter = () => {
            const typed = box.value.trim();
            const words = typed.toLowerCase().split(/\s+/).filter(Boolean);
            let shown = 0;
            cards.forEach((card) => {
                const match = words.every((word) => card.dataset.search.includes(word));
                card.hidden = !match;
                shown += match ? 1 : 0;
            });
            if (words.length === 0) {
                blogStatus.textContent = '';
            } else if (shown === 0) {
                blogStatus.textContent = `No posts match “${typed}”. Try a park, a season or a single word.`;
            } else {
                blogStatus.textContent = `${shown} ${shown === 1 ? 'post matches' : 'posts match'} “${typed}”.`;
            }
        };

        if (complete) {
            box.addEventListener('input', filter);
            blogSearch.addEventListener('submit', (event) => {
                event.preventDefault();
                filter();
            });
        }
    }

    // "Speak to a safari specialist": the side tab, and the enquiry buttons on
    // tour and park pages, open a pop-up with a short form and a WhatsApp link.
    const enquire = document.querySelector('[data-enquire-dialog]');
    if (enquire && typeof enquire.showModal === 'function') {
        const form = enquire.querySelector('[data-enquire-form]');
        const body = enquire.querySelector('[data-enquire-body]');
        const done = enquire.querySelector('[data-enquire-done]');
        const interest = enquire.querySelector('[data-enquire-interest]');
        const send = form.querySelector('[type="submit"]');

        const clearErrors = () => {
            form.querySelectorAll('[data-error-for]').forEach((el) => {
                el.hidden = true;
                el.textContent = '';
            });
            form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
        };

        document.addEventListener('click', (event) => {
            const opener = event.target.closest('[data-enquire], .tour-bar a, .tour-aside__cta, .hero .btn');
            if (!opener) {
                return;
            }
            event.preventDefault();
            clearErrors();
            body.hidden = false;
            done.hidden = true;
            // Tell the specialists which page the visitor was reading.
            interest.value = (document.querySelector('h1')?.textContent || document.title).trim();
            enquire.showModal();
        });

        enquire.addEventListener('click', (event) => {
            // A click on the dimmed area outside the panel, or on a close button.
            if (event.target === enquire || event.target.closest('[data-enquire-close]')) {
                enquire.close();
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearErrors();
            send.disabled = true;
            send.textContent = 'Sending…';
            let result = { ok: false, errors: { form: 'Your enquiry could not be sent just now. Please try again, or reach us on WhatsApp.' } };
            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { 'X-Requested-With': 'fetch', Accept: 'application/json' },
                });
                result = await response.json();
            } catch (error) { /* the message above is shown */ }
            send.disabled = false;
            send.textContent = 'Send enquiry';

            if (result.ok) {
                form.reset();
                body.hidden = true;
                done.hidden = false;
                done.focus();
                return;
            }
            let first = null;
            Object.entries(result.errors || {}).forEach(([field, message]) => {
                const note = form.querySelector(`[data-error-for="${field}"]`);
                if (note) {
                    note.textContent = message;
                    note.hidden = false;
                }
                const input = form.elements[field];
                if (input && input.setAttribute) {
                    input.setAttribute('aria-invalid', 'true');
                    first = first || input;
                }
            });
            if (first) {
                first.focus();
            }
        });
    }

    // Home page: the side tab stays away while the film fills the screen, and
    // appears once the film has mostly scrolled out of view.
    const sideTab = document.querySelector('.enquire-tab');
    const filmSection = document.querySelector('.page-home .hero');
    if (sideTab && filmSection) {
        const placeTab = () => {
            // Shown once no more than the last quarter of the film is still on screen.
            sideTab.classList.toggle('is-shown', filmSection.getBoundingClientRect().bottom < window.innerHeight * 0.25);
        };
        window.addEventListener('scroll', placeTab, { passive: true });
        window.addEventListener('resize', placeTab);
        placeTab();
    }

    // Sections ease in as they enter view.
    const reveals = document.querySelectorAll('.reveal');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
        reveals.forEach((el) => el.classList.add('is-visible'));
    } else {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        reveals.forEach((el) => observer.observe(el));
    }
})();
