import { unstable_cache } from 'next/cache';
import {
  fetchInternalReleasesBlocks,
  groupBlocksByVersion,
  richTextToHtml,
  richTextToPlain,
  type NotionBlockWithChildren,
} from '@/lib/notion';
import ReleasedClient from './ReleasedClient';

export const revalidate = 300;
export const maxDuration = 60;

const getCachedReleaseData = unstable_cache(
  async () => {
    const blocks = await fetchInternalReleasesBlocks();
    const groups = groupBlocksByVersion(blocks);
    return groups.map((g) => ({
      version: g.version,
      html: g.blocks.map((block) => renderBlockToHtml(block)).filter(Boolean),
    }));
  },
  ['internal-releases'],
  { revalidate: 300 },
);

export default async function ReleasedPage() {
  let serializedGroups: { version: string; html: string[] }[] = [];
  let error = false;

  try {
    serializedGroups = await getCachedReleaseData();
  } catch {
    error = true;
  }

  return <ReleasedClient groups={serializedGroups} error={error} />;
}

/* ─── Server-side block → HTML string ─── */
function renderBlockToHtml(block: NotionBlockWithChildren): string {
  switch (block.type) {
    case 'heading_2':
      return `<h3 class="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mt-10 mb-3">${richTextToHtml(block.heading_2.rich_text)}</h3>`;
    case 'heading_3':
      return `<h4 class="text-xl font-semibold text-[var(--foreground)] mt-6 mb-2">${richTextToHtml(block.heading_3.rich_text)}</h4>`;
    case 'paragraph': {
      const html = richTextToHtml(block.paragraph.rich_text);
      if (!html) return '<div class="h-3"></div>';
      return `<p class="text-zinc-300 leading-relaxed mb-2">${html}</p>`;
    }
    case 'bulleted_list_item':
      return `<li class="text-zinc-300 leading-relaxed ml-5 list-disc mb-1">${richTextToHtml(block.bulleted_list_item.rich_text)}</li>`;
    case 'numbered_list_item':
      return `<li class="text-zinc-300 leading-relaxed ml-5 list-decimal mb-1">${richTextToHtml(block.numbered_list_item.rich_text)}</li>`;
    case 'to_do': {
      const checked = block.to_do.checked;
      const icon = checked ? '&#10003;' : '&#9675;';
      const color = checked ? 'text-emerald-400' : 'text-zinc-500';
      const strike = checked ? 'line-through opacity-60' : '';
      return `<li class="text-zinc-300 leading-relaxed ml-5 list-none mb-1 flex items-start gap-2"><span class="mt-1 ${color}">${icon}</span><span class="${strike}">${richTextToHtml(block.to_do.rich_text)}</span></li>`;
    }
    case 'toggle': {
      const summary = richTextToPlain(block.toggle.rich_text);
      const childHtml = block.children?.map((c) => renderBlockToHtml(c)).filter(Boolean).join('') ?? '';
      return `<details class="group mb-3 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 overflow-hidden"><summary class="cursor-pointer px-5 py-3 text-[var(--foreground)] font-medium hover:bg-[var(--card)] transition-colors select-none"><span class="ml-1">${summary}</span></summary><div class="px-5 pb-4 pt-1 border-t border-[var(--border)]">${childHtml}</div></details>`;
    }
    case 'divider':
      return '<hr class="border-[var(--border)] my-6" />';
    case 'quote':
      return `<blockquote class="border-l-2 border-gold pl-4 italic text-zinc-400 my-4">${richTextToHtml(block.quote.rich_text)}</blockquote>`;
    case 'callout': {
      const emoji = block.callout.icon?.type === 'emoji' ? `<span class="text-xl flex-shrink-0">${block.callout.icon.emoji}</span>` : '';
      return `<div class="flex gap-3 rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 my-4">${emoji}<div class="text-zinc-300 leading-relaxed">${richTextToHtml(block.callout.rich_text)}</div></div>`;
    }
    case 'code':
      return `<pre class="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 my-4 overflow-x-auto no-scrollbar"><code class="text-sm text-zinc-300 font-mono">${richTextToPlain(block.code.rich_text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
    case 'image': {
      const src = block.image.type === 'external' ? block.image.external.url : block.image.file.url;
      const caption = block.image.caption?.length ? richTextToPlain(block.image.caption) : '';
      const figcaption = caption ? `<figcaption class="mt-2 text-sm text-zinc-500 text-center">${caption}</figcaption>` : '';
      return `<figure class="my-6"><img src="${src}" alt="${caption || 'Release image'}" class="rounded-xl max-w-full border border-[var(--border)]" />${figcaption}</figure>`;
    }
    case 'bookmark':
      return `<a href="${block.bookmark.url}" target="_blank" rel="noopener noreferrer" class="block rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-4 my-4 text-gold hover:text-[var(--color-gold-bright)] transition-colors text-sm break-all">${block.bookmark.url}</a>`;
    default:
      return '';
  }
}
