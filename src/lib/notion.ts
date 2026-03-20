import { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const RELEASES_PAGE_ID = '3292127245068066b40de1323b88dce1';
const RELEASES_INTERNAL_PAGE_ID = '329212724506808b96fbf5915f6134ca';

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

/* ─── Fetch all blocks from a Notion page ─── */
async function fetchPageBlocks(pageId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
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

export type NotionBlockWithChildren = BlockObjectResponse & { children?: BlockObjectResponse[] };

export interface VersionGroup {
  version: string;
  blocks: NotionBlockWithChildren[];
}

/* ─── Group blocks by version (h2 headings = version boundaries) ─── */
export function groupBlocksByVersion(blocks: NotionBlockWithChildren[]): VersionGroup[] {
  const groups: VersionGroup[] = [];
  let current: VersionGroup | null = null;

  for (const block of blocks) {
    if (block.type === 'heading_2') {
      const text = richTextToPlain(block.heading_2.rich_text);
      current = { version: text, blocks: [] };
      groups.push(current);
    } else if (current) {
      current.blocks.push(block);
    } else {
      // Blocks before any version heading go into an "Ungrouped" section
      if (!groups.length || groups[0].version !== '') {
        groups.unshift({ version: '', blocks: [] });
      }
      groups[0].blocks.push(block);
    }
  }

  return groups;
}

/* ─── Public releases (footer link) ─── */
export async function fetchReleasesBlocks(): Promise<BlockObjectResponse[]> {
  return fetchPageBlocks(RELEASES_PAGE_ID);
}

/* ─── Internal releases (admin dashboard) ─── */
export async function fetchInternalReleasesBlocks(): Promise<BlockObjectResponse[]> {
  return fetchPageBlocks(RELEASES_INTERNAL_PAGE_ID);
}
