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
        const condense = () => header.classList.toggle('is-condensed', window.scrollY > 24);
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
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
                pause.setAttribute('aria-pressed', String(paused));
                pause.textContent = paused ? 'Play film' : 'Pause film';
            });
        }
    }

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
