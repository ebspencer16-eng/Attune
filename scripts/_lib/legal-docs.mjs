// Reading one legal document out of public/legal.html.
//
// Shared by the generator and the gate. It lived in the generator and the gate
// imported it from there, which ran the generator every time the gate did and
// printed its output in the middle of the check run.

/** The plain text of one document on public/legal.html, by its container id. */
export function docText(source, id) {
  const open = source.indexOf(`id="doc-${id}"`);
  if (open < 0) return null;
  // To the start of the next document, or the end of the file.
  const next = source.indexOf('<div class="doc"', open + 10);
  const body = source.slice(open, next < 0 ? source.length : next);
  return body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
