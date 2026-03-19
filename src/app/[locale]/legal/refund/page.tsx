import type { Metadata } from 'next';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy | JazzNode',
  description: 'JazzNode refund and cancellation policy for premium subscriptions.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--foreground)] mt-10 mb-3 first:mt-0">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-300">{children}</div>
    </div>
  );
}

export default function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <FadeUp>
        <section className="pt-16 pb-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] leading-tight">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
            Last updated: March 19, 2026
          </p>
        </section>
      </FadeUp>

      <FadeUpItem delay={100}>
        <section className="pb-20 space-y-2">

          <Section title="1. Free Services">
            <p>The core features of JazzNode — including browsing events, artists, venues, and cities — are free to use and do not require payment. No refund applies to free services.</p>
          </Section>

          <Section title="2. Premium Subscriptions">
            <p>JazzNode offers optional paid subscription tiers for artists and venues (e.g., Premium, Elite) that unlock additional features such as analytics, broadcasting tools, booking management, and custom branding.</p>
            <p>Subscriptions are billed on a recurring basis (monthly or annually, depending on the plan selected). You will be charged at the beginning of each billing cycle.</p>
          </Section>

          <Section title="3. Cancellation">
            <p>You may cancel your subscription at any time from your account dashboard. Upon cancellation:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Your premium features will remain active until the end of your current billing period.</li>
              <li>You will not be charged for subsequent billing cycles.</li>
              <li>Your account will revert to the free tier after the current period expires.</li>
            </ul>
            <p>No partial refunds are issued for unused time remaining in a billing period when you cancel mid-cycle.</p>
          </Section>

          <Section title="4. Refund Eligibility">
            <p>We offer a full refund under the following conditions:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong className="text-[var(--foreground)]">Within 7 days of initial purchase:</strong> If you are not satisfied with your premium subscription, you may request a full refund within 7 days of your first payment.</li>
              <li><strong className="text-[var(--foreground)]">Service unavailability:</strong> If the Service experiences extended downtime or a critical feature is unavailable for a significant period, you may be eligible for a prorated refund or service credit.</li>
              <li><strong className="text-[var(--foreground)]">Billing errors:</strong> If you were charged incorrectly (e.g., duplicate charges, wrong amount), we will issue a full correction.</li>
            </ul>
            <p>Refunds are generally not available for:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Subscriptions active for more than 7 days past the initial purchase.</li>
              <li>Renewal charges (please cancel before your renewal date to avoid charges).</li>
              <li>Dissatisfaction with third-party content (e.g., event cancellations by venues).</li>
            </ul>
          </Section>

          <Section title="5. How to Request a Refund">
            <p>To request a refund, please contact us at <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a> with your account email and a brief description of the reason. We aim to process all refund requests within 5 business days.</p>
            <p>Approved refunds will be credited to the original payment method.</p>
          </Section>

          <Section title="6. Changes to This Policy">
            <p>We may update this Refund &amp; Cancellation Policy from time to time. Changes will be posted on this page with an updated date. Existing subscriptions will be governed by the policy in effect at the time of purchase until the next renewal.</p>
          </Section>

          <Section title="7. Contact Us">
            <p>If you have questions about refunds or cancellations, please reach out to <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>.</p>
          </Section>

        </section>
      </FadeUpItem>
    </div>
  );
}
