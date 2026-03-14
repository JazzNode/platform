import { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const RELEASES_PAGE_ID = '323212724506809eab38c09ae5bb0a29';

/* ─── Rich text → plain string ─── */
export function richTextToPlain(rt: RichTextItemResponse[]): string {
  return rt.map((t) => t.plain_text).join('');
}

/* ─── Rich text → inline HTML (bold, italic, code, links, strikethrough) ─── */
export function richTextToHtml(rt: RichTextItemResponse[]): string {
  return rt
    .map((t) => {
      let text = t.plain_text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      if (t.annotations.bold) text = `<strong>${text}</strong>`;
      if (t.annotations.italic) text = `<em>${text}</em>`;
      if (t.annotations.strikethrough) text = `<s>${text}</s>`;
      if (t.annotations.code)
        text = `<code class="text-gold/80 bg-gold/10 px-1.5 py-0.5 rounded text-sm">${text}</code>`;
      if (t.href) text = `<a href="${t.href}" target="_blank" rel="noopener noreferrer" class="text-gold hover:text-[var(--color-gold-bright)] underline underline-offset-2 transition-colors">${text}</a>`;
      return text;
    })
    .join('');
}

/* ─── Fetch all blocks from the Releases page ─── */
export async function fetchReleasesBlocks(): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.blocks.children.list({
      block_id: RELEASES_PAGE_ID,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const b of res.results) {
      if ('type' in b) blocks.push(b as BlockObjectResponse);
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  // Fetch children for toggle blocks
  for (const block of blocks) {
    if (block.has_children && block.type === 'toggle') {
      const children: BlockObjectResponse[] = [];
      let childCursor: string | undefined;
      do {
        const res = await notion.blocks.children.list({
          block_id: block.id,
          start_cursor: childCursor,
          page_size: 100,
        });
        for (const b of res.results) {
          if ('type' in b) children.push(b as BlockObjectResponse);
        }
        childCursor = res.has_more ? res.next_cursor ?? undefined : undefined;
      } while (childCursor);
      (block as BlockObjectResponse & { children: BlockObjectResponse[] }).children = children;
    }
  }

  return blocks;
}
