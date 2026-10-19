/*
	Portfolio interactions: Md. Nafiul Islam
	No dependencies. Everything here is an enhancement; the page reads fine without it.
*/

(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

	var now = new Date();

	// Footer year.
	$$('[data-year]').forEach(function (el) { el.textContent = now.getFullYear(); });

	// Experience timeline: place bars on a shared month axis that always runs to today.
	(function () {
		var timeline = $('.timeline');
		if (!timeline) return;

		var start = timeline.dataset.start.split('-').map(Number);
		var y0 = start[0], m0 = start[1];
		var monthIndex = function (y, m) { return (y - y0) * 12 + (m - m0); };
		var parse = function (s) { return s.split('-').map(Number); };

		var today = monthIndex(now.getFullYear(), now.getMonth() + 1) + (now.getDate() - 1) / 31;
		var endYear = Math.max(now.getFullYear(), Number(timeline.dataset.endYear) || 0);
		var span = (endYear - y0 + 1) * 12;

		timeline.style.setProperty('--span', span);
		timeline.style.setProperty('--today', today.toFixed(2));

		var axis = $('.axis', timeline);
		if (axis) {
			axis.textContent = '';
			for (var y = y0; y <= endYear; y++) {
				var tick = document.createElement('span');
				tick.style.setProperty('--at', monthIndex(y, 1));
				tick.textContent = y;
				axis.appendChild(tick);
			}
			var marker = document.createElement('span');
			marker.className = 'axis-today';
			marker.style.setProperty('--at', today.toFixed(2));
			marker.textContent = 'Today';
			axis.appendChild(marker);
		}

		$$('.bar', timeline).forEach(function (bar, i) {
			var from = parse(bar.dataset.from);
			var to = bar.dataset.to === 'present' ? today : (function (t) { return monthIndex(t[0], t[1]) + 1; })(parse(bar.dataset.to));
			bar.style.setProperty('--from', monthIndex(from[0], from[1]));
			bar.style.setProperty('--to', to.toFixed(2));
			bar.style.setProperty('--i', i);
		});

		// Keep "Present" durations current, counted the way LinkedIn does (inclusive months).
		$$('[data-duration-from]', timeline).forEach(function (el) {
			var from = parse(el.dataset.durationFrom);
			var months = (now.getFullYear() - from[0]) * 12 + (now.getMonth() + 1 - from[1]) + 1;
			var yrs = Math.floor(months / 12), mos = months % 12;
			var parts = [];
			if (yrs) parts.push(yrs + ' yr' + (yrs > 1 ? 's' : ''));
			if (mos) parts.push(mos + ' mo' + (mos > 1 ? 's' : ''));
			el.textContent = '· ' + parts.join(' ');
		});

		if ('IntersectionObserver' in window) {
			var io = new IntersectionObserver(function (entries) {
				if (entries.some(function (e) { return e.isIntersecting; })) {
					timeline.classList.add('is-visible');
					io.disconnect();
				}
			}, { threshold: 0.15 });
			io.observe(timeline);
		} else {
			timeline.classList.add('is-visible');
		}
	})();

	// Section tabs: underline the section currently being read.
	(function () {
		var links = $$('.tabs a');
		if (!links.length || !('IntersectionObserver' in window)) return;

		var tabs = $('.tabs');
		var byId = {};
		links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

		var setActive = function (id) {
			links.forEach(function (a) { a.removeAttribute('aria-current'); });
			var link = byId[id];
			if (!link) return;
			link.setAttribute('aria-current', 'true');
			// On narrow screens the tab strip scrolls sideways; keep the active tab in view.
			if (tabs.scrollWidth > tabs.clientWidth) {
				tabs.scrollTo({ left: Math.max(0, link.offsetLeft - 16), behavior: 'smooth' });
			}
		};

		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (e.isIntersecting) setActive(e.target.id);
			});
		}, { rootMargin: '-40% 0px -55% 0px' });

		$$('main > section[id]').forEach(function (s) { io.observe(s); });
	})();

	// Project cards: "Read more" only where the description is actually cut off.
	var syncMore = function (card) {
		var desc = $('.desc', card), btn = $('.more', card);
		if (!desc || !btn || desc.classList.contains('is-open')) return;
		btn.hidden = desc.scrollHeight <= desc.clientHeight + 2;
	};

	$$('.project').forEach(function (card, i) {
		var desc = $('.desc', card), btn = $('.more', card);
		if (!desc || !btn) return;
		desc.id = desc.id || 'desc-' + i;
		btn.setAttribute('aria-controls', desc.id);
		btn.addEventListener('click', function () {
			var open = desc.classList.toggle('is-open');
			btn.setAttribute('aria-expanded', String(open));
			btn.textContent = open ? 'Show less' : 'Read more';
		});
	});

	var syncAllMore = function () { $$('.project:not([hidden])').forEach(syncMore); };

	if ('ResizeObserver' in window) {
		var ro = new ResizeObserver(function (entries) {
			entries.forEach(function (e) { syncMore(e.target.closest('.project')); });
		});
		$$('.project .desc').forEach(function (d) { ro.observe(d); });
	} else {
		window.addEventListener('resize', syncAllMore);
	}
	syncAllMore();
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncAllMore);

	// Project filter (styled as a Power BI tile slicer).
	(function () {
		var slicer = $('.slicer');
		if (!slicer) return;

		var cards = $$('.project');
		var note = $('#project-count');
		var buttons = $$('button[data-filter]', slicer);
		var matches = function (card, f) { return f === 'all' || card.dataset.tags.split(' ').indexOf(f) !== -1; };

		buttons.forEach(function (btn) {
			var f = btn.dataset.filter;
			var count = cards.filter(function (c) { return matches(c, f); }).length;
			var badge = $('.count', btn);
			if (badge) badge.textContent = count;
		});

		slicer.addEventListener('click', function (e) {
			var btn = e.target.closest('button[data-filter]');
			if (!btn) return;
			var f = btn.dataset.filter;

			buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });

			var shown = 0;
			cards.forEach(function (c) {
				var on = matches(c, f);
				c.hidden = !on;
				if (on) shown++;
			});

			if (note) {
				note.textContent = f === 'all'
					? 'Showing all ' + cards.length + ' projects'
					: 'Showing ' + shown + ' of ' + cards.length + ' projects';
			}
		});
	})();

	// Thumbnails: don't stretch small source images; show them at real size instead.
	$$('.shot img').forEach(function (img) {
		var check = function () {
			if (!img.naturalWidth || !img.clientWidth) return;
			if (img.naturalWidth < img.clientWidth * 0.9 || img.naturalHeight < img.clientHeight * 0.9) {
				img.classList.add('is-lowres');
			}
		};
		if (img.complete) check(); else img.addEventListener('load', check, { once: true });
	});

	// Screenshot viewer.
	(function () {
		var dlg = $('#lightbox');
		if (!dlg || typeof dlg.showModal !== 'function') return;

		var img = $('img', dlg);
		var caption = $('.lb-caption', dlg);
		var counter = $('.lb-counter', dlg);
		var items = [], index = 0, opener = null;

		var render = function () {
			var link = items[index];
			var thumb = $('img', link);
			var title = $('.project-title', link.closest('.project'));
			img.src = link.getAttribute('href');
			img.alt = thumb ? thumb.alt : '';
			caption.textContent = title ? title.textContent : '';
			counter.textContent = (index + 1) + ' / ' + items.length;
		};

		var step = function (d) {
			if (!items.length) return;
			index = (index + d + items.length) % items.length;
			render();
		};

		document.addEventListener('click', function (e) {
			var link = e.target.closest('.shot');
			if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
			e.preventDefault();
			items = $$('.project:not([hidden]) .shot');
			index = Math.max(0, items.indexOf(link));
			opener = link;
			render();
			dlg.showModal();
			$('.lb-close', dlg).focus();
		});

		$('.lb-close', dlg).addEventListener('click', function () { dlg.close(); });
		$('.lb-prev', dlg).addEventListener('click', function () { step(-1); });
		$('.lb-next', dlg).addEventListener('click', function () { step(1); });

		// Click on the dark backdrop closes the viewer.
		dlg.addEventListener('click', function (e) {
			if (e.target === dlg) dlg.close();
		});

		dlg.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
			if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
		});

		dlg.addEventListener('close', function () {
			img.removeAttribute('src');
			if (opener) opener.focus();
		});
	})();

	// Copy email address.
	$$('[data-copy]').forEach(function (btn) {
		var label = $('span', btn);
		var status = $('#copy-status');
		var timer;

		var done = function (ok) {
			if (label) label.textContent = ok ? 'Copied' : 'Copy failed';
			if (status) status.textContent = ok ? 'Email address copied to clipboard' : 'Could not copy. Select the address and copy it manually.';
			clearTimeout(timer);
			timer = setTimeout(function () { if (label) label.textContent = 'Copy'; }, 2000);
		};

		var fallback = function (text) {
			var ta = document.createElement('textarea');
			ta.value = text;
			ta.setAttribute('readonly', '');
			ta.style.position = 'absolute';
			ta.style.left = '-9999px';
			document.body.appendChild(ta);
			ta.select();
			var ok = false;
			try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
			document.body.removeChild(ta);
			return ok;
		};

		btn.addEventListener('click', function () {
			var text = btn.dataset.copy;
			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallback(text)); });
			} else {
				done(fallback(text));
			}
		});
	});
})();
