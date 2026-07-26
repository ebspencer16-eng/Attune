// Site copy reference — visible marketing copy per page, extracted from public/*.html.
import { readFileSync } from 'fs';
import { Paragraph } from 'docx';
import { run, eyebrow, title, h1, h2, body, small, bullet, rule, saveDoc, ORANGE, BLUE, INK, MUTED } from './_doc_style.mjs';

const PAGES = [
  ['home.html','Home'], ['purpose.html','Purpose'], ['how-it-works.html','How It Works'],
  ['offerings.html','Offerings'], ['faq.html','FAQ'], ['resources.html','Resources'],
  ['reviews.html','Reviews'], ['start.html','Start'], ['contact.html','Contact'],
];
const strip = (s) => s.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
  .replace(/&#39;|&rsquo;|&lsquo;/g,"'").replace(/&quot;|&ldquo;|&rdquo;/g,'"').replace(/&[a-z]+;/g,' ').replace(/\s+/g,' ').trim();

function extract(html) {
  // pull heading + paragraph + list text in document order, skip scripts/styles
  const body = (html.split(/<body[^>]*>/i)[1]||html).split(/<\/body>/i)[0];
  const noScript = body.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');
  const out = [];
  const re = /<(h1|h2|h3|h4|p|li|button)\b[^>]*>([\s\S]*?)<\/\1>/gi; let m;
  while ((m = re.exec(noScript))) {
    const tag = m[1].toLowerCase(); const txt = strip(m[2]);
    if (!txt || txt.length < 2) continue;
    if (/^(skip to|menu|©|copyright)/i.test(txt)) continue;
    out.push({ tag, txt });
  }
  return out;
}

const children = [];
children.push(eyebrow('Attune · Reference · Site Copy', ORANGE));
children.push(title('Marketing Site Copy'));
children.push(body('Current visible copy across the marketing pages, extracted from the live source. Headings are bold, body copy and list items follow. Use this as the copy of record for review.'));
children.push(rule());

for (const [file,label] of PAGES) {
  let html; try { html = readFileSync('public/'+file,'utf8'); } catch { continue; }
  const items = extract(html);
  if (!items.length) continue;
  children.push(h1(label));
  children.push(small('public/'+file));
  const seen = new Set();
  for (const it of items) {
    const key = it.tag+'|'+it.txt; if (seen.has(key)) continue; seen.add(key);
    if (it.tag==='h1'||it.tag==='h2') children.push(h2(it.txt, BLUE));
    else if (it.tag==='h3'||it.tag==='h4') children.push(new Paragraph({ spacing:{before:100,after:40}, children:[ run(it.txt,{bold:true,size:19,color:INK}) ]}));
    else if (it.tag==='li') children.push(bullet(it.txt));
    else if (it.tag==='button') children.push(new Paragraph({ spacing:{after:60}, children:[ run('[button] ',{size:16,bold:true,color:ORANGE}), run(it.txt,{size:18,color:'2A2622'}) ]}));
    else children.push(body(it.txt, { after:80 }));
  }
  children.push(rule());
}
await saveDoc('attune_site_copy', children, { title:'Attune Site Copy' });
