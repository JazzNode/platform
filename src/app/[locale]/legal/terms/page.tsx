import type { Metadata } from 'next';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';

export const metadata: Metadata = {
  title: 'Terms of Service | JazzNode',
  description: 'JazzNode terms of service — rules and guidelines for using the platform.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--foreground)] mt-10 mb-3 first:mt-0">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-300">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <FadeUp>
        <section className="pt-16 pb-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] leading-tight">
            Terms of Service
          </h1>
          <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
            Last updated: March 19, 2026
          </p>
        </section>
      </FadeUp>

      <FadeUpItem delay={100}>
        <section className="pb-20 space-y-2">

          <Section title="1. Acceptance of Terms">
            <p>By accessing or using JazzNode (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, please do not use the Service.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>JazzNode is a platform that aggregates and curates live jazz event information, artist profiles, and venue listings across multiple countries. The Service may include free and premium (paid) tiers with varying feature sets.</p>
          </Section>

          <Section title="3. User Accounts">
            <p>You may create an account to access certain features. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.</p>
            <p>You agree to provide accurate, current, and complete information during registration and to update it as necessary.</p>
          </Section>

          <Section title="4. User Conduct">
            <p>You agree not to:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Post or transmit content that is defamatory, obscene, or infringes on third-party rights.</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its systems.</li>
              <li>Scrape, crawl, or use automated means to access the Service without our prior written consent.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            </ul>
          </Section>

          <Section title="5. Content & Intellectual Property">
            <p>All content provided by JazzNode — including but not limited to text, graphics, logos, and software — is the property of JazzNode or its licensors and is protected by intellectual property laws.</p>
            <p>Event posters, venue photographs, and promotional materials displayed on the Service remain the property of their respective creators. JazzNode displays such content for informational purposes and will remove it upon request from the rights holder.</p>
            <p>By submitting content (e.g., reviews, messages, profile information), you grant JazzNode a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content in connection with the Service.</p>
          </Section>

          <Section title="6. Third-Party Links & Services">
            <p>The Service may contain links to third-party websites, ticketing platforms, or services. JazzNode is not responsible for the content, accuracy, or practices of any third-party site.</p>
          </Section>

          <Section title="7. Disclaimers">
            <p>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. JazzNode does not guarantee the accuracy, completeness, or timeliness of event listings, venue information, or any other content.</p>
            <p>Jazz performances are inherently spontaneous — lineups, schedules, and pricing may change without notice. Always verify with the official venue or ticketing source before attending.</p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>To the fullest extent permitted by law, JazzNode and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Service.</p>
          </Section>

          <Section title="9. Termination">
            <p>We may suspend or terminate your account and access to the Service at our sole discretion, with or without cause, and with or without notice. Upon termination, your right to use the Service ceases immediately.</p>
          </Section>

          <Section title="10. Governing Law">
            <p>These Terms shall be governed by and construed in accordance with the laws of the Republic of China (Taiwan), without regard to its conflict of law provisions.</p>
          </Section>

          <Section title="11. Changes to These Terms">
            <p>We reserve the right to modify these Terms at any time. Changes will be effective upon posting to this page. Your continued use of the Service after changes are posted constitutes acceptance of the updated Terms.</p>
          </Section>

          <Section title="12. Contact Us">
            <p>If you have questions about these Terms, please contact us at <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>.</p>
          </Section>

        </section>
      </FadeUpItem>
    </div>
  );
}
