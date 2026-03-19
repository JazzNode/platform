import type { Metadata } from 'next';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';

export const metadata: Metadata = {
  title: 'Privacy Policy | JazzNode',
  description: 'JazzNode privacy policy — how we collect, use, and protect your data.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--foreground)] mt-10 mb-3 first:mt-0">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-300">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <FadeUp>
        <section className="pt-16 pb-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] leading-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
            Last updated: March 19, 2026
          </p>
        </section>
      </FadeUp>

      <FadeUpItem delay={100}>
        <section className="pb-20 space-y-2">

          <Section title="1. Information We Collect">
            <p><strong className="text-[var(--foreground)]">Account information:</strong> When you create an account, we collect your email address, display name, and optional profile details (bio, website, avatar).</p>
            <p><strong className="text-[var(--foreground)]">Authentication data:</strong> If you sign in via Google OAuth, we receive your name and email from Google. We do not store your Google password.</p>
            <p><strong className="text-[var(--foreground)]">Usage data:</strong> We collect anonymized analytics such as page views, referrer sources, and general geographic region to improve the Service.</p>
            <p><strong className="text-[var(--foreground)]">Messages:</strong> Content you send through our messaging features (inbox, contact forms) is stored to facilitate communication between users, artists, and venues.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul className="list-disc ml-5 space-y-1">
              <li>Provide, maintain, and improve the Service.</li>
              <li>Personalize your experience (e.g., region-based event recommendations).</li>
              <li>Send transactional communications (e.g., account verification, password resets).</li>
              <li>Deliver marketing broadcasts if you have opted in (e.g., by following an artist or venue).</li>
              <li>Analyze usage patterns to improve platform features and performance.</li>
              <li>Respond to your inquiries and support requests.</li>
            </ul>
          </Section>

          <Section title="3. Information Sharing">
            <p>We do not sell your personal data. We may share information in the following circumstances:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong className="text-[var(--foreground)]">With your consent:</strong> When you explicitly choose to share information (e.g., public profile, reviews).</li>
              <li><strong className="text-[var(--foreground)]">Service providers:</strong> We use trusted third-party services (e.g., Supabase for database hosting, AWS for file storage, Google for authentication) that process data on our behalf.</li>
              <li><strong className="text-[var(--foreground)]">Legal requirements:</strong> When required by law, regulation, or legal process.</li>
            </ul>
          </Section>

          <Section title="4. Data Security">
            <p>We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS), secure authentication, and access controls. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
          </Section>

          <Section title="5. Cookies & Tracking">
            <p>JazzNode uses essential cookies to maintain your session and preferences (e.g., language, theme). We may use analytics tools that employ cookies or similar technologies to understand how the Service is used.</p>
            <p>You can control cookie settings through your browser. Disabling cookies may affect certain features of the Service.</p>
          </Section>

          <Section title="6. Your Rights">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Access, correct, or delete your personal data.</li>
              <li>Object to or restrict certain processing of your data.</li>
              <li>Export your data in a portable format.</li>
              <li>Withdraw consent at any time (where processing is based on consent).</li>
            </ul>
            <p>To exercise any of these rights, please contact us at <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>.</p>
          </Section>

          <Section title="7. Data Retention">
            <p>We retain your personal data for as long as your account is active or as needed to provide the Service. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law.</p>
          </Section>

          <Section title="8. International Data Transfers">
            <p>JazzNode operates across multiple countries. Your data may be processed in jurisdictions outside your country of residence. We take steps to ensure your data is protected in accordance with this policy regardless of where it is processed.</p>
          </Section>

          <Section title="9. Children&apos;s Privacy">
            <p>The Service is not directed to children under 13 (or the applicable age of consent in your jurisdiction). We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us so we can delete it.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. Your continued use of the Service after changes are posted constitutes acceptance.</p>
          </Section>

          <Section title="11. Contact Us">
            <p>If you have questions or concerns about this Privacy Policy, please contact us at <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>.</p>
          </Section>

        </section>
      </FadeUpItem>
    </div>
  );
}
