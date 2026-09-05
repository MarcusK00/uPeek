/** Tiny DOM helpers. The overlay has no framework on purpose — it is injected into somebody
 *  else's page, and a framework there is a collision waiting to happen. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | null | undefined> = {},
  ...children: Array<Node | string | null | undefined>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (name === 'class') {
      node.className = value;
    } else if (name === 'text') {
      node.textContent = value;
    } else {
      node.setAttribute(name, value);
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) {
      continue;
    }

    node.append(child);
  }

  return node;
}

export function clear(node: Element): void {
  while (node.firstChild) {
    node.firstChild.remove();
  }
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  // Danish default: DD-MM-YYYY. The backoffice user's own locale would be nicer, but the front end
  // has no reliable way to ask, and a consistent unambiguous format beats a guessed one.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function relative(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.34524, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];

  // Negative because the value is in the past.
  let duration = (date.getTime() - Date.now()) / 1000;

  for (const [amount, unit] of divisions) {
    if (Math.abs(duration) < amount) {
      return formatter.format(Math.round(duration), unit);
    }

    duration /= amount;
  }

  return '';
}
