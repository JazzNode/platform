import type { Metadata } from 'next';
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { fetchReleasesBlocks, richTextToHtml, richTextToPlain } from '@/lib/notion';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';

export const revalidate = 300; // re-fetch from Notion every 5 min

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Releases | JazzNode',
    description: 'JazzNode release notes and changelog.',
  };
}

/* ─── Notion block → React ─── */
function NotionBlock({ block }: { block: BlockObjectResponse & { children?: BlockObjectResponse[] } }) {
  switch (block.type) {
    case 'heading_1':
      return (
        <h2
          className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] mt-16 mb-4 first:mt-0"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.heading_1.rich_text) }}
        />
      );
    case 'heading_2':
      return (
        <h3
          className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mt-12 mb-3"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.heading_2.rich_text) }}
        />
      );
    case 'heading_3':
      return (
        <h4
          className="text-xl font-semibold text-[var(--foreground)] mt-8 mb-2"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.heading_3.rich_text) }}
        />
      );
    case 'paragraph': {
      const html = richTextToHtml(block.paragraph.rich_text);
      if (!html) return <div className="h-4" />;
      return (
        <p
          className="text-zinc-300 leading-relaxed mb-3"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case 'bulleted_list_item':
      return (
        <li
          className="text-zinc-300 leading-relaxed ml-5 list-disc mb-1"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.bulleted_list_item.rich_text) }}
        />
      );
    case 'numbered_list_item':
      return (
        <li
          className="text-zinc-300 leading-relaxed ml-5 list-decimal mb-1"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.numbered_list_item.rich_text) }}
        />
      );
    case 'to_do':
      return (
        <li className="text-zinc-300 leading-relaxed ml-5 list-none mb-1 flex items-start gap-2">
          <span className={`mt-1 ${block.to_do.checked ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {block.to_do.checked ? '✓' : '○'}
          </span>
          <span
            className={block.to_do.checked ? 'line-through opacity-60' : ''}
            dangerouslySetInnerHTML={{ __html: richTextToHtml(block.to_do.rich_text) }}
          />
        </li>
      );
    case 'toggle': {
      const summary = richTextToPlain(block.toggle.rich_text);
      return (
        <details className="group mb-3 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 overflow-hidden">
          <summary className="cursor-pointer px-5 py-3 text-[var(--foreground)] font-medium hover:bg-[var(--card)] transition-colors select-none">
            <span className="ml-1">{summary}</span>
          </summary>
          <div className="px-5 pb-4 pt-1 border-t border-[var(--border)]">
            {block.children?.map((child) => (
              <NotionBlock key={child.id} block={child} />
            ))}
          </div>
        </details>
      );
    }
    case 'divider':
      return <hr className="border-[var(--border)] my-8" />;
    case 'quote':
      return (
        <blockquote
          className="border-l-2 border-gold pl-4 italic text-zinc-400 my-4"
          dangerouslySetInnerHTML={{ __html: richTextToHtml(block.quote.rich_text) }}
        />
      );
    case 'callout':
      return (
        <div className="flex gap-3 rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 my-4">
          {block.callout.icon?.type === 'emoji' && (
            <span className="text-xl flex-shrink-0">{block.callout.icon.emoji}</span>
          )}
          <div
            className="text-zinc-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: richTextToHtml(block.callout.rich_text) }}
          />
        </div>
      );
    case 'code':
      return (
        <pre className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 my-4 overflow-x-auto">
          <code className="text-sm text-zinc-300 font-mono">
            {richTextToPlain(block.code.rich_text)}
          </code>
        </pre>
      );
    case 'image': {
      const src =
        block.image.type === 'external'
          ? block.image.external.url
          : block.image.file.url;
      const caption = block.image.caption?.length
        ? richTextToPlain(block.image.caption)
        : undefined;
      return (
        <figure className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={caption ?? 'Release image'}
            className="rounded-xl max-w-full border border-[var(--border)]"
          />
          {caption && (
            <figcaption className="mt-2 text-sm text-zinc-500 text-center">{caption}</figcaption>
          )}
        </figure>
      );
    }
    case 'bookmark':
      return (
        <a
          href={block.bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-4 my-4 text-gold hover:text-[var(--color-gold-bright)] transition-colors text-sm break-all"
        >
          {block.bookmark.url}
        </a>
      );
    default:
      return null;
  }
}

export default async function ReleasesPage() {
  let blocks: (BlockObjectResponse & { children?: BlockObjectResponse[] })[] = [];
  let error = false;

  try {
    blocks = await fetchReleasesBlocks();
  } catch {
    error = true;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <FadeUp>
        <section className="pt-16 pb-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] leading-tight">
            Releases
          </h1>
          <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
            What&apos;s new in JazzNode — features, improvements, and fixes.
          </p>
        </section>
      </FadeUp>

      <FadeUpItem delay={100}>
        <section className="pb-20">
          {error ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
              <p className="text-zinc-400">Unable to load release notes. Please try again later.</p>
            </div>
          ) : blocks.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
              <p className="text-zinc-400">No release notes yet. Stay tuned!</p>
            </div>
          ) : (
            <div className="notion-content">
              {blocks.map((block) => (
                <NotionBlock key={block.id} block={block} />
              ))}
            </div>
          )}
        </section>
      </FadeUpItem>
    </div>
  );
}
