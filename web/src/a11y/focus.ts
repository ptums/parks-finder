/** Moves focus to the element with this id. Returns false if it is not in the page. */
export function focusById(id: string | null | undefined): boolean {
  if (!id) return false;
  const element = document.getElementById(id);
  if (!element) return false;
  element.focus();
  return true;
}

/** Tries each id in order and focuses the first one that exists. */
export function focusFirstAvailable(ids: Array<string | null | undefined>): boolean {
  return ids.some((id) => focusById(id));
}
