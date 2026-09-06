import { matchDocument, type PeekMatchSummary } from './matching/dom-matcher.js';
import type {
  PeekBootstrap,
  PeekEntry,
  PeekNodeRef,
  PeekPageManifest,
  PeekReference,
  PeekRegion,
} from './types.js';
import { clear, copy, el, formatDate, relative } from './ui/dom.js';
import { OVERLAY_STYLES } from './ui/styles.js';

type PeekState = 'dormant' | 'loading' | 'armed' | 'locked' | 'xray' | 'degraded' | 'error';

/** Below this, the overlay says so rather than pretending the page is mostly understood. */
const LOW_COVERAGE = 0.6;

/** How far a pointer may travel before a press on the pill counts as a drag, not a click. */
const DRAG_SLOP = 4;

/**
 * Resolve a file shipped alongside the bundle in `wwwroot/App_Plugins/Peek`.
 *
 * The argument is a variable on purpose: Vite rewrites `new URL('./literal', import.meta.url)` into
 * a build-time asset reference, which would look for the file next to the TypeScript source instead
 * of next to the bundle. Going through a parameter keeps the resolution where it belongs — at run
 * time, relative to the loaded script — so the overlay still finds its icons on a site hosted in a
 * virtual directory.
 */
function pluginAsset(file: string): string {
  return new URL(file, import.meta.url).href;
}

const ICONS = {
  idle: pluginAsset('icons/PeekIconUnactive.png'),
  active: pluginAsset('icons/PeekIconActive.png'),
};

const KIND_TONE: Record<string, string> = {
  OwnedProperty: 'owned',
  Block: 'block',
  Shared: 'shared',
  Media: 'media',
};

const KIND_LABEL: Record<string, string> = {
  OwnedProperty: 'This page',
  Block: 'Block',
  Shared: 'Shared',
  Media: 'Media',
};

export class PeekOverlay {
  readonly #root: ShadowRoot;
  readonly #host: HTMLElement;
  readonly #bootstrap: PeekBootstrap;

  #state: PeekState = 'dormant';
  #manifest: PeekPageManifest | null = null;
  #summary: PeekMatchSummary | null = null;

  #layer!: HTMLDivElement;
  #pill!: HTMLDivElement;
  #pillRow!: HTMLDivElement;
  #badge!: HTMLButtonElement;
  #tray!: HTMLDivElement;
  #trayInner!: HTMLDivElement;
  #statusLabel!: HTMLSpanElement;
  #inspectButton!: HTMLButtonElement;
  #xrayButton!: HTMLButtonElement;
  #stopButton!: HTMLButtonElement;

  /** The tray only exists once asked for: at rest the pill is the icon and nothing else. */
  #trayOpen = false;
  /** Set while a press on the pill turned into a drag, so the release does not also toggle it. */
  #dragMoved = false;

  /**
   * Inspect and X-ray are independent switches the user can combine, even though X-ray always needs
   * the same hover engine Inspect turns on. These track which of the two the user actually pressed,
   * so turning one off only disarms the engine when the other isn't still asking for it — and the
   * two buttons never light up together just because the engine happens to be running for one of
   * them.
   */
  #inspectOn = false;
  #xrayOn = false;
  #card: HTMLDivElement | null = null;
  #panel: HTMLDivElement | null = null;

  /**
   * Where the pill sat before the panel unfurled underneath it. Expanding has to pull the pill up
   * the page so the panel fits on screen; collapsing puts it back exactly where the user left it,
   * unless they moved it in the meantime — a drag clears this.
   */
  #collapsedPosition: { top: string; bottom: string; left: string; right: string } | null = null;

  #activeRegion: PeekRegion | null = null;
  #pinned = false;
  #candidateIndex = 0;
  #hiddenKinds = new Set<string>();
  #showUnattributed = false;

  /** Usage counts are fetched lazily per node — the manifest should not pay for them. */
  readonly #usageCache = new Map<string, PeekReference[] | 'pending' | 'error'>();

  constructor(bootstrap: PeekBootstrap) {
    this.#bootstrap = bootstrap;

    this.#host = el('div', { 'data-peek-ui': 'root' });
    this.#root = this.#host.attachShadow({ mode: 'open' });
    this.#root.append(el('style', { text: OVERLAY_STYLES }));

    document.body.append(this.#host);

    this.#buildChrome();
    this.#bindGlobalEvents();
  }

  // ------------------------------------------------------------------ chrome

  #buildChrome(): void {
    this.#layer = el('div', { class: 'peek-layer' });

    // Both marks live in the DOM and cross-fade. Swapping a single src would flash on the first
    // toggle, which is exactly the moment the user is watching the thing they just clicked.
    this.#badge = el(
      'button',
      {
        type: 'button',
        class: 'peek-badge',
        'aria-expanded': 'false',
        'aria-label': 'Peek content inspector',
        title: 'Peek',
      },
      el('img', { class: 'peek-mark', 'data-variant': 'idle', src: ICONS.idle, alt: '', draggable: 'false' }),
      el('img', { class: 'peek-mark', 'data-variant': 'active', src: ICONS.active, alt: '', draggable: 'false' }),
    );

    this.#statusLabel = el('span', { class: 'peek-status', hidden: '' });

    this.#inspectButton = el('button', {
      type: 'button',
      'data-action': 'toggle',
      'aria-pressed': 'false',
      text: 'Inspect',
    });
    this.#xrayButton = el('button', {
      type: 'button',
      'data-action': 'xray',
      'aria-pressed': 'false',
      text: 'X-ray',
    });
    this.#stopButton = el('button', { type: 'button', 'data-action': 'stop', hidden: '', text: 'Stop' });

    this.#trayInner = el(
      'div',
      { class: 'peek-tray-inner' },
      this.#statusLabel,
      this.#inspectButton,
      this.#xrayButton,
      this.#stopButton,
    );

    this.#tray = el('div', { class: 'peek-tray', 'aria-hidden': 'true' }, this.#trayInner);

    // The badge and the tray are their own row inside the pill, so the X-ray panel can be a second
    // row underneath it: one element, one position, one thing to drag.
    this.#pillRow = el('div', { class: 'peek-pill-row' }, this.#badge, this.#tray);

    this.#pill = el(
      'div',
      {
        class: 'peek-pill',
        'data-state': 'dormant',
        'data-active': 'false',
        'data-open': 'false',
        'data-expanded': 'false',
        'data-side': 'right',
        role: 'group',
        'aria-label': 'Peek content inspector',
      },
      this.#pillRow,
    );

    this.#badge.addEventListener('click', (event) => {
      event.stopPropagation();

      // The press that just ended was a drag across the page, not a tap on the icon.
      if (this.#dragMoved) {
        this.#dragMoved = false;
        return;
      }

      this.#setTrayOpen(!this.#trayOpen);
    });

    this.#inspectButton.addEventListener('click', (event) => {
      event.stopPropagation();
      void this.toggle();
    });

    this.#xrayButton.addEventListener('click', (event) => {
      event.stopPropagation();
      void this.toggleXray();
    });

    this.#stopButton.addEventListener('click', (event) => {
      event.stopPropagation();
      this.disarm();
    });

    this.#makeDraggable(this.#pill);

    this.#root.append(this.#layer, this.#pill);
  }

  // ------------------------------------------------------------------ tray

  /**
   * The tray animates on an explicit pixel width because `auto` is not an animatable value. It is
   * measured from the laid-out content rather than guessed, so a longer status line still unfurls
   * to exactly the width it needs.
   */
  #setTrayOpen(open: boolean): void {
    this.#trayOpen = open;
    this.#pill.dataset.open = String(open);
    this.#badge.setAttribute('aria-expanded', String(open));
    this.#tray.setAttribute('aria-hidden', String(!open));
    this.#syncTrayWidth();
  }

  #syncTrayWidth(): void {
    // Expanded, the row is as wide as the panel below it and the tray just fills what is left of
    // the row — an explicit pixel width would fight that, and there is nothing to unfurl anyway.
    if (this.#panel) {
      this.#tray.style.width = '';
      return;
    }

    this.#tray.style.width = this.#trayOpen ? `${this.#trayInner.offsetWidth}px` : '0px';
  }

  /**
   * Keep the pill anchored to whichever edge it was dropped nearest, and unfurl the tray away from
   * that edge. Anchoring by `right` on the right-hand side is what keeps the icon still while the
   * tray grows: anchored by `left`, opening the tray would push the icon sideways instead.
   */
  #anchorPill(): void {
    const rect = this.#pill.getBoundingClientRect();
    const onRight = rect.left + rect.width / 2 > window.innerWidth / 2;

    this.#pill.dataset.side = onRight ? 'right' : 'left';

    if (onRight) {
      this.#pill.style.right = `${Math.round(window.innerWidth - rect.right)}px`;
      this.#pill.style.left = 'auto';
    } else {
      this.#pill.style.left = `${Math.round(rect.left)}px`;
      this.#pill.style.right = 'auto';
    }

    this.#pill.style.top = `${Math.round(rect.top)}px`;
    this.#pill.style.bottom = 'auto';
  }

  /**
   * Keep the whole pill — row plus whatever panel is unfurled under it — inside the viewport.
   *
   * The panel grows downwards from a chip that usually sits near the bottom of the page, so on
   * expanding there is rarely room below it. Anchoring by `top` and pulling that top up is what
   * keeps the row and the panel one object: the alternative, letting the panel find its own place
   * on screen, is the detached card this replaced.
   */
  #fitPill(): void {
    const height = this.#pill.offsetHeight;
    const rect = this.#pill.getBoundingClientRect();
    const top = Math.max(12, Math.min(rect.top, window.innerHeight - height - 12));

    this.#pill.style.top = `${Math.round(top)}px`;
    this.#pill.style.bottom = 'auto';
  }

  /**
   * The pill will end up on top of somebody's chat widget. It has to be movable.
   *
   * The icon is now both the drag handle and the tray toggle, so a press only becomes a drag once
   * the pointer has travelled past `DRAG_SLOP`. Below that it stays a click and the tray toggles.
   */
  #makeDraggable(pill: HTMLElement): void {
    let pressed = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;

    pill.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement;

      // Tray buttons and everything in the panel are targets in their own right; a press there is
      // never a drag. Without the panel in this list, dragging its scrollbar or swiping its list
      // would haul the whole pill across the page instead.
      if (target.closest?.('.peek-tray, .peek-panel')) {
        return;
      }

      pressed = true;
      dragging = false;
      this.#dragMoved = false;
      startX = event.clientX;
      startY = event.clientY;

      const rect = pill.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;

      // Captured on the pressed element itself (the badge) rather than the pill. Capturing on an
      // ancestor would redirect the compatibility click that follows pointerup to that ancestor
      // instead of the badge, so a plain click would never reach the badge's own listener.
      // Capturing here still keeps every pointermove reaching this handler: those events bubble
      // from the badge up through the pill regardless of where the cursor strays mid-drag, which a
      // 44px hit target could not otherwise guarantee at real mouse speeds.
      target.setPointerCapture(event.pointerId);
    });

    pill.addEventListener('pointermove', (event) => {
      if (!pressed) {
        return;
      }

      if (!dragging) {
        if (Math.hypot(event.clientX - startX, event.clientY - startY) < DRAG_SLOP) {
          return;
        }

        dragging = true;
        this.#dragMoved = true;
        pill.dataset.dragging = 'true';

        // Wherever this ends up is the pill's home now; collapsing must not undo the move.
        this.#collapsedPosition = null;
      }

      const left = Math.min(Math.max(0, event.clientX - offsetX), window.innerWidth - pill.offsetWidth);
      const top = Math.min(Math.max(0, event.clientY - offsetY), window.innerHeight - pill.offsetHeight);
      pill.style.left = `${left}px`;
      pill.style.top = `${top}px`;
      pill.style.right = 'auto';
      pill.style.bottom = 'auto';
    });

    const end = (event: PointerEvent) => {
      if (!pressed) {
        return;
      }

      pressed = false;
      (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);

      if (!dragging) {
        return;
      }

      dragging = false;
      delete pill.dataset.dragging;
      this.#anchorPill();
    };

    pill.addEventListener('pointerup', end);
    pill.addEventListener('pointercancel', end);
  }

  #bindGlobalEvents(): void {
    document.addEventListener('keydown', (event) => this.#onKeyDown(event), true);
    document.addEventListener('mousemove', (event) => this.#onMouseMove(event), { passive: true });
    document.addEventListener('click', (event) => this.#onClick(event), true);

    let frame = 0;
    const reflow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => this.#reposition());
    };

    window.addEventListener('resize', reflow, { passive: true });
    window.addEventListener('scroll', reflow, { passive: true, capture: true });
  }

  // ------------------------------------------------------------------ state

  get #armed(): boolean {
    return (
      this.#state === 'armed' ||
      this.#state === 'locked' ||
      this.#state === 'xray' ||
      this.#state === 'degraded'
    );
  }

  #setState(state: PeekState): void {
    this.#state = state;
    this.#pill.dataset.state = state;

    const labels: Record<PeekState, string> = {
      dormant: 'Peek',
      loading: 'Reading page…',
      armed: 'Hover anything',
      locked: 'Pinned',
      xray: 'X-ray on',
      degraded: 'Partial coverage',
      error: 'Peek unavailable',
    };

    const active = this.#armed;

    // The mark is the state indicator now: it goes active the moment Peek is actually inspecting.
    this.#pill.dataset.active = String(active);
    this.#badge.title = labels[state];
    this.#badge.setAttribute('aria-label', `Peek content inspector — ${labels[state]}`);

    // Dormant needs no caption; the icon says it. Armed, X-ray and degraded need none either —
    // each is already said by a button's own pressed state or the pill's border colour, so a
    // caption repeating that would just be the same fact twice.
    this.#statusLabel.textContent = labels[state];
    this.#statusLabel.hidden =
      state === 'dormant' || state === 'armed' || state === 'xray' || state === 'degraded';

    this.#syncButtons();
    this.#stopButton.hidden = !active;

    // A state the user did not ask for — a slow read, a page Peek only half understands — has to
    // surface on its own rather than wait for them to open the tray and find it.
    if (state === 'loading' || state === 'degraded' || state === 'error') {
      this.#setTrayOpen(true);
    } else {
      this.#syncTrayWidth();
    }
  }

  /** Reflects Inspect and X-ray's own on/off state onto their buttons — independent of each other. */
  #syncButtons(): void {
    this.#inspectButton.setAttribute('aria-pressed', String(this.#inspectOn));
    this.#xrayButton.setAttribute('aria-pressed', String(this.#xrayOn));
  }

  async toggle(): Promise<void> {
    if (this.#inspectOn) {
      this.#inspectOn = false;

      if (this.#xrayOn) {
        // X-ray still wants the hover engine running; only Inspect's own indicator goes off.
        this.#syncButtons();
      } else {
        this.disarm();
      }

      return;
    }

    if (this.#armed) {
      // Already armed because X-ray asked for it; just light up Inspect's own indicator.
      this.#inspectOn = true;
      this.#syncButtons();
      return;
    }

    await this.arm();
    if (this.#state !== 'error') {
      this.#inspectOn = true;
      this.#syncButtons();
    }
  }

  async arm(): Promise<void> {
    if (!this.#manifest) {
      this.#setState('loading');
      const loaded = await this.#loadManifest();
      if (!loaded) {
        this.#setState('error');
        this.#showNotice('Peek could not read this page. It may not be an Umbraco-routed document.');
        return;
      }
    }

    this.#summary = matchDocument(this.#manifest!);
    this.#setState(this.#summary.coverage < LOW_COVERAGE ? 'degraded' : 'armed');
    this.#renderHighlights();
  }

  disarm(): void {
    this.#pinned = false;
    this.#activeRegion = null;
    this.#inspectOn = false;
    this.#xrayOn = false;
    this.#setState('dormant');
    clear(this.#layer);
    this.#closeCard();
    this.#closePanel();
  }

  async toggleXray(): Promise<void> {
    if (this.#xrayOn) {
      this.#xrayOn = false;
      this.#closePanel();

      if (this.#inspectOn) {
        // Inspect is still explicitly on; drop back to its state rather than disarming outright,
        // and redraw without the unattributed outlines only X-ray asks for.
        this.#setState(this.#summary && this.#summary.coverage < LOW_COVERAGE ? 'degraded' : 'armed');
        this.#renderHighlights();
      } else {
        // disarm() already cleared the layer, and the summary it drew from is still in hand:
        // redrawing here would put every outline straight back on a page Peek has left.
        this.disarm();
      }

      return;
    }

    if (!this.#armed) {
      await this.arm();
      if (this.#state === 'error') {
        return;
      }
    }

    this.#xrayOn = true;
    this.#setState('xray');
    this.#renderHighlights();
    this.#openPanel();
  }

  // ------------------------------------------------------------------ data

  async #loadManifest(): Promise<boolean> {
    if (!this.#bootstrap.pageKey) {
      return false;
    }

    const url = new URL(this.#bootstrap.manifestUrl, window.location.origin);
    url.searchParams.set('key', this.#bootstrap.pageKey);
    if (this.#bootstrap.culture) {
      url.searchParams.set('culture', this.#bootstrap.culture);
    }

    if (this.#bootstrap.segment) {
      url.searchParams.set('segment', this.#bootstrap.segment);
    }

    if (this.#bootstrap.preview) {
      url.searchParams.set('preview', 'true');
    }

    try {
      const response = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' } });
      if (!response.ok) {
        return false;
      }

      this.#manifest = (await response.json()) as PeekPageManifest;
      return true;
    } catch {
      return false;
    }
  }

  async #loadUsage(nodeKey: string): Promise<void> {
    if (this.#usageCache.has(nodeKey)) {
      return;
    }

    this.#usageCache.set(nodeKey, 'pending');

    const url = new URL(this.#bootstrap.usageUrl, window.location.origin);
    url.searchParams.set('key', nodeKey);

    try {
      const response = await fetch(url, { credentials: 'same-origin', headers: { accept: 'application/json' } });
      this.#usageCache.set(
        nodeKey,
        response.ok ? ((await response.json()) as PeekReference[]) : 'error',
      );
    } catch {
      this.#usageCache.set(nodeKey, 'error');
    }

    if (this.#activeRegion) {
      this.#renderCard(this.#activeRegion);
    }
  }

  #node(key: string): PeekNodeRef | undefined {
    return this.#manifest?.nodes.find((node) => node.key === key);
  }

  // ------------------------------------------------------------------ highlights

  #renderHighlights(): void {
    clear(this.#layer);

    if (!this.#summary) {
      return;
    }

    for (const region of this.#summary.regions) {
      const primary = region.entries[0];
      if (this.#hiddenKinds.has(primary.sourceKind)) {
        continue;
      }

      this.#layer.append(this.#highlightFor(region));
    }

    if (this.#state === 'xray' && this.#showUnattributed) {
      for (const element of this.#summary.unattributed) {
        const box = element.getBoundingClientRect();
        if (box.width === 0 && box.height === 0) {
          continue;
        }

        this.#layer.append(
          el('div', {
            class: 'peek-highlight',
            'data-kind': 'Unattributed',
            style: boxStyle(box),
          }),
        );
      }
    }
  }

  #highlightFor(region: PeekRegion): HTMLElement {
    const box = region.element.getBoundingClientRect();
    const primary = region.entries[0];

    const node = el('div', {
      class: 'peek-highlight',
      'data-kind': primary.sourceKind,
      'data-entry': primary.id,
      style: boxStyle(box),
    });

    if (region.entries.length > 1) {
      node.append(el('span', { class: 'peek-ambiguous-badge', text: '?', title: `${region.entries.length} possible sources` }));
    }

    return node;
  }

  #reposition(): void {
    if (!this.#armed) {
      return;
    }

    this.#renderHighlights();

    if (this.#panel) {
      this.#fitPill();
    }

    if (this.#activeRegion) {
      this.#positionCard(this.#activeRegion);
    }
  }

  // ------------------------------------------------------------------ interaction

  #onMouseMove(event: MouseEvent): void {
    if (this.#state !== 'armed' && this.#state !== 'degraded' && this.#state !== 'xray') {
      return;
    }

    if (this.#pinned || !this.#summary) {
      return;
    }

    const region = this.#regionAt(event.clientX, event.clientY);
    if (region === this.#activeRegion) {
      return;
    }

    this.#activeRegion = region;
    this.#candidateIndex = 0;

    if (region) {
      this.#renderCard(region);
    } else {
      this.#closeCard();
    }
  }

  #onClick(event: MouseEvent): void {
    if (!this.#armed) {
      return;
    }

    const path = event.composedPath();
    if (path.includes(this.#pill) || (this.#card && path.includes(this.#card)) || (this.#panel && path.includes(this.#panel))) {
      return;
    }

    const region = this.#regionAt(event.clientX, event.clientY);
    if (!region) {
      return;
    }

    // Swallow the click: the user is inspecting, not navigating.
    event.preventDefault();
    event.stopPropagation();

    this.#pinned = true;
    this.#activeRegion = region;
    this.#candidateIndex = 0;
    this.#setState('locked');
    this.#renderCard(region);
  }

  #onKeyDown(event: KeyboardEvent): void {
    // Ctrl+Shift+U. Ctrl+Shift+I belongs to the browser's own devtools, and fighting it would be
    // both rude and futile.
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyU') {
      event.preventDefault();
      void this.toggle();
      return;
    }

    if (!this.#armed) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.#pinned) {
        this.#pinned = false;
        this.#setState(this.#panel ? 'xray' : 'armed');
        this.#closeCard();
      } else {
        this.disarm();
      }

      return;
    }

    if (!this.#pinned || !this.#activeRegion) {
      return;
    }

    const entries = this.#activeRegion.entries;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (entries.length < 2) {
          return;
        }

        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        this.#candidateIndex = (this.#candidateIndex + step + entries.length) % entries.length;
        this.#renderCard(this.#activeRegion);
        return;
      }

      case 'ArrowLeft':
      case 'ArrowRight': {
        event.preventDefault();
        this.#stepSibling(event.key === 'ArrowRight' ? 1 : -1);
        return;
      }

      case 'Enter': {
        event.preventDefault();
        const target = entries[this.#candidateIndex]?.editUrl;
        if (target) {
          window.open(target, '_blank', 'noopener');
        }

        return;
      }

      default:
    }
  }

  /** Walk to the next or previous region in document order, so the page can be traversed. */
  #stepSibling(step: number): void {
    if (!this.#summary || !this.#activeRegion) {
      return;
    }

    const visible = this.#summary.regions.filter((region) => !this.#hiddenKinds.has(region.entries[0].sourceKind));
    const index = visible.indexOf(this.#activeRegion);
    if (index < 0) {
      return;
    }

    const next = visible[(index + step + visible.length) % visible.length];
    this.#activeRegion = next;
    this.#candidateIndex = 0;
    next.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    this.#renderCard(next);
  }

  #regionAt(x: number, y: number): PeekRegion | null {
    if (!this.#summary) {
      return null;
    }

    let best: PeekRegion | null = null;
    let bestArea = Number.POSITIVE_INFINITY;

    for (const region of this.#summary.regions) {
      if (this.#hiddenKinds.has(region.entries[0].sourceKind)) {
        continue;
      }

      const box = region.element.getBoundingClientRect();
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) {
        continue;
      }

      // Innermost wins, so hovering a heading inside a block picks the heading.
      const area = box.width * box.height;
      if (area < bestArea) {
        best = region;
        bestArea = area;
      }
    }

    return best;
  }

  // ------------------------------------------------------------------ card

  #closeCard(): void {
    this.#card?.remove();
    this.#card = null;
  }

  #renderCard(region: PeekRegion): void {
    this.#closeCard();

    const entry = region.entries[this.#candidateIndex] ?? region.entries[0];
    const node = this.#node(entry.nodeKey);

    const card = el('div', {
      class: 'peek-card',
      'data-kind': entry.sourceKind,
      'data-pinned': String(this.#pinned),
      'data-peek-ui': 'card',
    });

    card.append(el('div', { class: 'peek-card-accent' }));

    const body = el('div', { class: 'peek-card-body' });

    body.append(this.#renderTags(entry, node));
    body.append(this.#renderBreadcrumb(entry, node));

    if (region.entries.length > 1) {
      body.append(this.#renderCandidates(region));
    }

    body.append(
      el('p', {
        class: 'peek-value',
        'data-empty': String(!entry.valuePreview),
        text: entry.valuePreview || '(empty)',
      }),
    );

    body.append(this.#renderMeta(entry, node));
    body.append(this.#renderActions(entry, node));

    if (this.#pinned) {
      const hint = el('div', { class: 'peek-keyhint' });
      hint.innerHTML =
        '<kbd>←</kbd><kbd>→</kbd> next region · <kbd>↑</kbd><kbd>↓</kbd> candidates · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close';
      body.append(hint);
    }

    card.append(body);
    this.#card = card;
    this.#root.append(card);
    this.#positionCard(region);

    if (entry.sourceKind === 'Shared' && node) {
      void this.#loadUsage(node.key);
    }
  }

  #renderTags(entry: PeekEntry, node: PeekNodeRef | undefined): HTMLElement {
    const tags = el('div', { class: 'peek-tags' });

    tags.append(
      el('span', {
        class: 'peek-tag',
        'data-tone': KIND_TONE[entry.sourceKind] ?? 'quiet',
        text: KIND_LABEL[entry.sourceKind] ?? entry.sourceKind,
      }),
    );

    if (entry.culture) {
      tags.append(el('span', { class: 'peek-tag', 'data-tone': 'quiet', text: entry.culture }));
    } else if (entry.invariantAcrossCultures) {
      tags.append(
        el('span', {
          class: 'peek-tag',
          'data-tone': 'quiet',
          title: 'This property does not vary by culture — editing it changes every language.',
          text: 'all languages',
        }),
      );
    }

    if (node?.publishState === 'DraftChangesPending') {
      tags.append(
        el('span', {
          class: 'peek-tag',
          'data-tone': 'warn',
          title: 'Published, with unpublished changes. This is usually the answer to "why isn\'t my change showing".',
          text: 'draft pending',
        }),
      );
    } else if (node?.publishState === 'Unpublished') {
      tags.append(el('span', { class: 'peek-tag', 'data-tone': 'warn', text: 'unpublished' }));
    }

    if (entry.sourceKind === 'Shared' && node) {
      const usage = this.#usageCache.get(node.key);
      const label =
        usage === 'pending' || usage === undefined
          ? 'checking usage…'
          : usage === 'error'
            ? 'usage unknown'
            : `used on ${usage.length}`;

      tags.append(
        el('span', {
          class: 'peek-tag',
          'data-tone': 'shared',
          title: 'Editing this changes every place it is used, not just this page.',
          text: label,
        }),
      );
    }

    return tags;
  }

  #renderBreadcrumb(entry: PeekEntry, node: PeekNodeRef | undefined): HTMLElement {
    const crumbs = el('div', { class: 'peek-breadcrumb' });
    const parts = [this.#manifest?.page?.name ?? node?.name ?? 'Page', ...entry.breadcrumb.map((c) => c.label)];

    parts.forEach((label, index) => {
      if (index > 0) {
        crumbs.append(el('span', { class: 'peek-crumb-sep', text: '›' }));
      }

      crumbs.append(
        el('span', {
          class: index === parts.length - 1 ? 'peek-crumb-last' : '',
          text: label,
        }),
      );
    });

    return crumbs;
  }

  #renderCandidates(region: PeekRegion): HTMLElement {
    const list = el('ul', { class: 'peek-candidates', role: 'listbox' });

    region.entries.forEach((candidate, index) => {
      const node = this.#node(candidate.nodeKey);
      const item = el('li', {
        role: 'option',
        'aria-selected': String(index === this.#candidateIndex),
        text: `${node?.contentTypeAlias ?? '?'}.${candidate.propertyAlias}`,
      });

      item.addEventListener('click', (event) => {
        event.stopPropagation();
        this.#candidateIndex = index;
        this.#renderCard(region);
      });

      list.append(item);
    });

    const heading = el('div', {
      class: 'peek-row-note',
      'data-tone': 'warn',
      text: `${region.entries.length} possible sources — Peek will not guess`,
    });

    return el('div', {}, heading, list);
  }

  #renderMeta(entry: PeekEntry, node: PeekNodeRef | undefined): HTMLElement {
    const meta = el('dl', { class: 'peek-meta' });

    const rows: Array<[string, string]> = [
      ['Node', node?.name ?? '—'],
      ['Doc type', node?.contentTypeAlias ?? '—'],
      ['Property', entry.propertyAlias],
      ['Editor', entry.editorAlias ?? '—'],
      ['Edited', node?.updateDate ? `${formatDate(node.updateDate)} (${relative(node.updateDate)})` : '—'],
      ['By', node?.lastEditedBy ?? '—'],
    ];

    for (const [term, definition] of rows) {
      meta.append(el('dt', { text: term }), el('dd', { text: definition }));
    }

    return meta;
  }

  #renderActions(entry: PeekEntry, node: PeekNodeRef | undefined): HTMLElement {
    const actions = el('div', { class: 'peek-actions' });

    if (entry.editUrl) {
      actions.append(
        el('a', {
          class: 'peek-primary',
          href: entry.editUrl,
          target: '_blank',
          rel: 'noopener',
          text: 'Edit this field',
        }),
      );
    }

    const razor = node?.isElement
      ? `@item.Content.Value<string>("${entry.propertyAlias}")`
      : `@Model.Value<string>("${entry.propertyAlias}")`;

    const copyables: Array<[string, string]> = [
      ['Alias', entry.propertyAlias],
      ['GUID', entry.nodeKey],
      ['Razor', razor],
      ['Bug report', this.#bugReport(entry, node)],
    ];

    for (const [label, value] of copyables) {
      const button = el('button', { type: 'button', text: label });
      button.addEventListener('click', async (event) => {
        event.stopPropagation();
        const ok = await copy(value);
        button.textContent = ok ? 'Copied' : 'Copy failed';
        setTimeout(() => {
          button.textContent = label;
        }, 1200);
      });

      actions.append(button);
    }

    return actions;
  }

  #bugReport(entry: PeekEntry, node: PeekNodeRef | undefined): string {
    return [
      `URL: ${window.location.href}`,
      `Node: ${node?.name ?? '—'} (${entry.nodeKey})`,
      `Doc type: ${node?.contentTypeAlias ?? '—'}`,
      `Property: ${entry.propertyAlias}`,
      `Culture: ${entry.culture ?? 'invariant'}`,
      `Viewport: ${window.innerWidth}×${window.innerHeight}`,
      `Backoffice: ${node?.editUrl ?? '—'}`,
    ].join('\n');
  }

  #positionCard(region: PeekRegion): void {
    if (!this.#card) {
      return;
    }

    const box = region.element.getBoundingClientRect();
    const card = this.#card;
    const width = card.offsetWidth || 340;
    const height = card.offsetHeight || 220;

    let left = box.left;
    let top = box.bottom + 8;

    if (left + width > window.innerWidth - 12) {
      left = window.innerWidth - width - 12;
    }

    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, box.top - height - 8);
    }

    card.style.left = `${Math.max(12, left)}px`;
    card.style.top = `${top}px`;
  }

  // ------------------------------------------------------------------ x-ray panel

  /**
   * Unfurl the panel out of the pill itself, below the button row, and remember where the pill was
   * so collapsing can put it back. The panel is a child of the pill on purpose: it inherits the
   * pill's position, so dragging the mark drags the panel with it.
   */
  #openPanel(): void {
    if (!this.#manifest || !this.#summary) {
      return;
    }

    if (!this.#panel) {
      const style = this.#pill.style;
      this.#collapsedPosition = {
        top: style.top,
        bottom: style.bottom,
        left: style.left,
        right: style.right,
      };

      this.#panel = el('div', { class: 'peek-panel', 'data-peek-ui': 'panel' });
      this.#pill.append(this.#panel);
      this.#pill.dataset.expanded = 'true';

      // The row is the panel's header now; there is nothing sensible to show with it shut.
      this.#setTrayOpen(true);
    }

    this.#renderPanel();
  }

  #closePanel(): void {
    if (!this.#panel) {
      return;
    }

    this.#panel.remove();
    this.#panel = null;
    this.#pill.dataset.expanded = 'false';

    if (this.#collapsedPosition) {
      const { top, bottom, left, right } = this.#collapsedPosition;
      this.#pill.style.top = top;
      this.#pill.style.bottom = bottom;
      this.#pill.style.left = left;
      this.#pill.style.right = right;
      this.#collapsedPosition = null;
    }

    this.#syncTrayWidth();
  }

  /** Refill the open panel in place — a filter toggle must not move the pill out from under the
   *  cursor that just pressed it. */
  #renderPanel(): void {
    const panel = this.#panel;
    if (!panel || !this.#manifest || !this.#summary) {
      return;
    }

    clear(panel);

    panel.append(this.#renderPanelHead());

    for (const warning of this.#manifest.warnings) {
      panel.append(el('div', { class: 'peek-notice', text: warning }));
    }

    panel.append(this.#renderPanelList());
    panel.append(
      el('div', {
        class: 'peek-panel-foot',
        text: `${this.#manifest.entries.length} values considered · built in ${this.#manifest.buildDurationMs} ms`,
      }),
    );

    // Measured after the browser has laid the new content out, not from the content it replaced —
    // and only if that content is still up, or a refit queued just before a close would land on
    // the collapsed pill and undo the position #closePanel just restored.
    requestAnimationFrame(() => {
      if (this.#panel === panel) {
        this.#fitPill();
      }
    });
  }

  #renderPanelHead(): HTMLElement {
    const manifest = this.#manifest!;
    const summary = this.#summary!;
    const coverage = Math.round(summary.coverage * 100);

    const head = el('div', { class: 'peek-panel-head' });

    head.append(
      el(
        'div',
        { class: 'peek-panel-title' },
        el('span', { text: manifest.page?.name ?? 'This page' }),
        el('small', { text: manifest.page?.contentTypeAlias ?? '' }),
      ),
    );

    const bar = el('div', { class: 'peek-coverage-bar', 'data-low': String(summary.coverage < LOW_COVERAGE) });
    bar.append(el('i', { style: `width:${coverage}%` }));

    head.append(
      el(
        'div',
        { class: 'peek-coverage' },
        bar,
        el(
          'div',
          { class: 'peek-coverage-label' },
          el('span', { text: `${coverage}% of visible text attributed` }),
          el('span', { text: `${summary.unattributed.length} unattributed` }),
        ),
      ),
    );

    head.append(this.#renderChips());
    return head;
  }

  #renderChips(): HTMLElement {
    const chips = el('div', { class: 'peek-chips' });

    const definitions: Array<[string, string, string]> = [
      ['OwnedProperty', 'owned', 'This page'],
      ['Block', 'block', 'Blocks'],
      ['Shared', 'shared', 'Shared'],
      ['Media', 'media', 'Media'],
    ];

    for (const [kind, tone, label] of definitions) {
      const chip = el(
        'button',
        {
          class: 'peek-chip',
          type: 'button',
          'data-tone': tone,
          'aria-pressed': String(!this.#hiddenKinds.has(kind)),
        },
        el('i', {}),
        document.createTextNode(label),
      );

      chip.addEventListener('click', () => {
        if (this.#hiddenKinds.has(kind)) {
          this.#hiddenKinds.delete(kind);
        } else {
          this.#hiddenKinds.add(kind);
        }

        this.#renderHighlights();
        this.#renderPanel();
      });

      chips.append(chip);
    }

    const unattributed = el(
      'button',
      {
        class: 'peek-chip',
        type: 'button',
        'data-tone': 'unattributed',
        'aria-pressed': String(this.#showUnattributed),
        title: 'Text Peek could not trace back to a content property.',
      },
      el('i', {}),
      document.createTextNode('Unattributed'),
    );

    unattributed.addEventListener('click', () => {
      this.#showUnattributed = !this.#showUnattributed;
      this.#renderHighlights();
      this.#renderPanel();
    });

    chips.append(unattributed);
    return chips;
  }

  #renderPanelList(): HTMLElement {
    const list = el('div', { class: 'peek-panel-list' });
    const manifest = this.#manifest!;
    const summary = this.#summary!;

    const visible = manifest.entries.filter(
      (entry) => !this.#hiddenKinds.has(entry.sourceKind) && entry.state !== 'Empty',
    );

    if (visible.length === 0) {
      list.append(el('div', { class: 'peek-empty', text: 'Nothing to show with these filters.' }));
      return list;
    }

    // Rendered first, then the interesting ones: values that exist and never made it to the page.
    const ordered = [...visible].sort((a, b) => {
      const rank = (entry: PeekEntry) => (summary.matchedEntryIds.has(entry.id) ? 0 : entry.state === 'Unmatchable' ? 2 : 1);
      return rank(a) - rank(b);
    });

    for (const entry of ordered) {
      list.append(this.#renderPanelRow(entry, summary.matchedEntryIds.has(entry.id)));
    }

    return list;
  }

  #renderPanelRow(entry: PeekEntry, rendered: boolean): HTMLElement {
    const node = this.#node(entry.nodeKey);

    const note = rendered
      ? (entry.valuePreview ?? '')
      : entry.state === 'Unmatchable'
        ? `has a value Peek can't search for (${entry.unmatchable})`
        : 'read, not rendered';

    const row = el(
      'button',
      {
        class: 'peek-row',
        type: 'button',
        'data-kind': entry.sourceKind,
        'data-rendered': String(rendered),
      },
      el('i', {}),
      el(
        'div',
        { class: 'peek-row-main' },
        el('div', { class: 'peek-row-alias', text: `${node?.contentTypeAlias ?? '?'}.${entry.propertyAlias}` }),
        el('div', {
          class: 'peek-row-note',
          'data-tone': rendered ? 'quiet' : 'warn',
          text: note,
        }),
      ),
    );

    row.addEventListener('click', () => {
      const region = this.#summary?.regions.find((candidate) =>
        candidate.entries.some((item) => item.id === entry.id),
      );

      if (region) {
        this.#pinned = true;
        this.#activeRegion = region;
        this.#candidateIndex = region.entries.findIndex((item) => item.id === entry.id);
        region.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        this.#renderCard(region);
      } else if (entry.editUrl) {
        window.open(entry.editUrl, '_blank', 'noopener');
      }
    });

    return row;
  }

  #showNotice(message: string): void {
    const notice = el('div', { class: 'peek-notice', 'data-peek-ui': 'notice', text: message });
    notice.style.position = 'absolute';
    notice.style.right = '20px';
    notice.style.bottom = '74px';
    notice.style.maxWidth = '320px';
    notice.style.pointerEvents = 'auto';

    this.#root.append(notice);
    setTimeout(() => notice.remove(), 6000);
  }
}

function boxStyle(box: DOMRect): string {
  return `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px`;
}
