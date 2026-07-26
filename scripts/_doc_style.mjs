// Shared docx style helpers for Attune reference docs (matches the house style
// used by build_ex2_docs / build_*_review). Arial body, Georgia display, brand
// color tokens, no em-dashes in structural text.
import { writeFileSync } from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, Footer, PageNumber, VerticalAlign, HeadingLevel,
} from 'docx';

export const ORANGE='E8673A', BLUE='1B5FE8', PURPLE='7C3AED', GREEN='10B981', ROSE='B5546E';
export const INK='0E0B07', MUTED='8C7A68', STONE='E8DDD0', SOFT='6B5C4D';
export const OUT_DIR = process.env.ATTUNE_DOC_OUT || '/mnt/user-data/outputs';

export const run=(t,o={})=>new TextRun({ text:String(t??''), font:'Arial', ...o });
export const disp=(t,o={})=>new TextRun({ text:String(t??''), font:'Georgia', ...o });

export const spacer=(n=1)=>Array.from({length:n},()=>new Paragraph({ children:[run('')], spacing:{after:80} }));

export const eyebrow=(t,color=ORANGE)=>new Paragraph({ spacing:{after:60}, children:[
  new TextRun({ text:String(t).toUpperCase(), font:'Arial', bold:true, size:15, color, characterSpacing:34 }) ]});

export const title=(t,color=INK)=>new Paragraph({ spacing:{after:120}, children:[ disp(t,{bold:true,size:44,color}) ]});
export const h1=(t,color=INK)=>new Paragraph({ spacing:{before:260,after:100}, children:[ disp(t,{bold:true,size:30,color}) ]});
export const h2=(t,color=BLUE)=>new Paragraph({ spacing:{before:180,after:70}, children:[ run(t,{bold:true,size:22,color}) ]});
export const body=(t,o={})=>new Paragraph({ spacing:{after:o.after??120}, children:[ run(t,{size:20,color:o.color||'2A2622',...o}) ]});
export const small=(t,color=MUTED)=>new Paragraph({ spacing:{after:100}, children:[ run(t,{size:17,color,italics:true}) ]});
export const bullet=(t,o={})=>new Paragraph({ bullet:{level:o.level??0}, spacing:{after:60}, children:[ run(t,{size:19,color:'2A2622',...o}) ]});
export const kv=(k,v,color=ORANGE)=>new Paragraph({ spacing:{after:60}, children:[ run(k+': ',{bold:true,size:19,color}), run(v,{size:19,color:'2A2622'}) ]});
export const rule=()=>new Paragraph({ border:{bottom:{style:BorderStyle.SINGLE,size:6,color:STONE}}, spacing:{after:140} });

// simple shaded label + text row table (2 col)
export function pairTable(rows, leftW=26){
  return new Table({ width:{size:100,type:WidthType.PERCENTAGE},
    borders:{ top:{style:BorderStyle.SINGLE,size:4,color:STONE},bottom:{style:BorderStyle.SINGLE,size:4,color:STONE},
      left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE},
      insideHorizontal:{style:BorderStyle.SINGLE,size:4,color:'F0E9E0'},insideVertical:{style:BorderStyle.NONE} },
    rows: rows.map(([k,v])=>new TableRow({ children:[
      new TableCell({ width:{size:leftW,type:WidthType.PERCENTAGE}, margins:{top:80,bottom:80,left:120,right:120},
        children:[new Paragraph({children:[run(k,{bold:true,size:18,color:INK})]})] }),
      new TableCell({ width:{size:100-leftW,type:WidthType.PERCENTAGE}, margins:{top:80,bottom:80,left:120,right:120},
        children:[new Paragraph({children:[run(v,{size:18,color:'2A2622'})]})] }),
    ]})),
  });
}

export async function saveDoc(filename, children, opts={}){
  const doc=new Document({
    creator:'Attune', title:opts.title||filename,
    styles:{ default:{ document:{ run:{ font:'Arial' } } } },
    sections:[{
      properties:{ page:{ margin:{ top:1000, bottom:1000, left:1100, right:1100 } } },
      footers:{ default:new Footer({ children:[ new Paragraph({ alignment:AlignmentType.CENTER,
        children:[ run('Attune · current state · ', {size:14,color:MUTED}),
          new TextRun({ children:[PageNumber.CURRENT], font:'Arial', size:14, color:MUTED }) ] }) ] }) },
      children,
    }],
  });
  const buf=await Packer.toBuffer(doc);
  const path=OUT_DIR+'/'+filename+'.docx';
  writeFileSync(path, buf);
  console.log('✓ '+path+' ('+buf.length+' bytes)');
  return path;
}
