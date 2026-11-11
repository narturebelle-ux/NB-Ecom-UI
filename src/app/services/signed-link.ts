/**
 * Starts a download from a short-lived signed link the API just returned.
 *
 * Phones block `window.open` after an async call (it no longer counts as the tap), so this follows the
 * link in the same tab instead. The API signs `attachment` links with Content-Disposition: attachment, so
 * the browser saves the file and the page stays where it is (Android Chrome saves to Downloads; iPhone
 * Safari shows its download prompt and keeps the file in Files → Downloads).
 */
export function saveFromSignedLink(url: string, doc: Document = document): void {
  const a = doc.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  // Ignored for links to another site (storage), but harmless, and helps if storage is ever proxied.
  a.setAttribute('download', '');
  a.style.display = 'none';
  doc.body.appendChild(a);
  a.click();
  a.remove();
}
