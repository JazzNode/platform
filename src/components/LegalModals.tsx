'use client';

import LegalPageModal from '@/components/LegalPageModal';
import ContactHQLink from '@/components/ContactHQLink';

function S({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/* ── Terms of Service ── */
export function TermsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <LegalPageModal isOpen={isOpen} onClose={onClose} title="Terms of Service">
      <p className="text-xs text-[var(--muted-foreground)]/60">Last updated: March 19, 2026</p>

      <S title="1. Acceptance of Terms">
        <p>By accessing or using JazzNode (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, please do not use the Service.</p>
      </S>
      <S title="2. Description of Service">
        <p>JazzNode is a platform that aggregates and curates live jazz event information, artist profiles, and venue listings across multiple countries. The Service may include free and premium (paid) tiers with varying feature sets.</p>
      </S>
      <S title="3. User Accounts">
        <p>You may create an account to access certain features. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.</p>
        <p>You agree to provide accurate, current, and complete information during registration and to update it as necessary.</p>
      </S>
      <S title="4. User Conduct">
        <p>You agree not to:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
          <li>Post or transmit content that is defamatory, obscene, or infringes on third-party rights.</li>
          <li>Attempt to gain unauthorized access to any part of the Service or its systems.</li>
          <li>Scrape, crawl, or use automated means to access the Service without our prior written consent.</li>
          <li>Interfere with or disrupt the integrity or performance of the Service.</li>
        </ul>
      </S>
      <S title="5. Content & Intellectual Property">
        <p>All content provided by JazzNode — including but not limited to text, graphics, logos, and software — is the property of JazzNode or its licensors and is protected by intellectual property laws.</p>
        <p>Event posters, venue photographs, and promotional materials displayed on the Service remain the property of their respective creators. JazzNode displays such content for informational purposes and will remove it upon request from the rights holder.</p>
        <p>By submitting content (e.g., reviews, messages, profile information), you grant JazzNode a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content in connection with the Service.</p>
      </S>
      <S title="6. Third-Party Links & Services">
        <p>The Service may contain links to third-party websites, ticketing platforms, or services. JazzNode is not responsible for the content, accuracy, or practices of any third-party site.</p>
      </S>
      <S title="7. Disclaimers">
        <p>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. JazzNode does not guarantee the accuracy, completeness, or timeliness of event listings, venue information, or any other content.</p>
        <p>Jazz performances are inherently spontaneous — lineups, schedules, and pricing may change without notice. Always verify with the official venue or ticketing source before attending.</p>
      </S>
      <S title="8. Limitation of Liability">
        <p>To the fullest extent permitted by law, JazzNode and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Service.</p>
      </S>
      <S title="9. Termination">
        <p>We may suspend or terminate your account and access to the Service at our sole discretion, with or without cause, and with or without notice. Upon termination, your right to use the Service ceases immediately.</p>
      </S>
      <S title="10. Governing Law">
        <p>These Terms shall be governed by and construed in accordance with the laws of the Republic of China (Taiwan), without regard to its conflict of law provisions.</p>
      </S>
      <S title="11. Changes to These Terms">
        <p>We reserve the right to modify these Terms at any time. Changes will be effective upon posting to this page. Your continued use of the Service after changes are posted constitutes acceptance of the updated Terms.</p>
      </S>
      <S title="12. Contact Us">
        <p>If you have questions about these Terms, please <ContactHQLink>contact us</ContactHQLink>.</p>
      </S>
    </LegalPageModal>
  );
}

/* ── Privacy Policy ── */
export function PrivacyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <LegalPageModal isOpen={isOpen} onClose={onClose} title="Privacy Policy">
      <p className="text-xs text-[var(--muted-foreground)]/60">Last updated: March 19, 2026</p>

      <S title="1. Information We Collect">
        <p><strong className="text-[var(--foreground)]">Account information:</strong> When you create an account, we collect your email address, display name, and optional profile details (bio, website, avatar).</p>
        <p><strong className="text-[var(--foreground)]">Authentication data:</strong> If you sign in via Google OAuth, we receive your name and email from Google. We do not store your Google password.</p>
        <p><strong className="text-[var(--foreground)]">Usage data:</strong> We collect anonymized analytics such as page views, referrer sources, and general geographic region to improve the Service.</p>
        <p><strong className="text-[var(--foreground)]">Messages:</strong> Content you send through our messaging features (inbox, contact forms) is stored to facilitate communication between users, artists, and venues.</p>
      </S>
      <S title="2. How We Use Your Information">
        <ul className="list-disc ml-5 space-y-1">
          <li>Provide, maintain, and improve the Service.</li>
          <li>Personalize your experience (e.g., region-based event recommendations).</li>
          <li>Send transactional communications (e.g., account verification, password resets).</li>
          <li>Deliver marketing broadcasts if you have opted in (e.g., by following an artist or venue).</li>
          <li>Analyze usage patterns to improve platform features and performance.</li>
          <li>Respond to your inquiries and support requests.</li>
        </ul>
      </S>
      <S title="3. Information Sharing">
        <p>We do not sell your personal data. We may share information in the following circumstances:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li><strong className="text-[var(--foreground)]">With your consent:</strong> When you explicitly choose to share information (e.g., public profile, reviews).</li>
          <li><strong className="text-[var(--foreground)]">Service providers:</strong> We use trusted third-party services (e.g., Supabase for database hosting, AWS for file storage, Google for authentication) that process data on our behalf.</li>
          <li><strong className="text-[var(--foreground)]">Legal requirements:</strong> When required by law, regulation, or legal process.</li>
        </ul>
      </S>
      <S title="4. Data Security">
        <p>We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS), secure authentication, and access controls. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
      </S>
      <S title="5. Cookies & Tracking">
        <p>JazzNode uses essential cookies to maintain your session and preferences (e.g., language, theme). We may use analytics tools that employ cookies or similar technologies to understand how the Service is used.</p>
        <p>You can control cookie settings through your browser. Disabling cookies may affect certain features of the Service.</p>
      </S>
      <S title="6. Your Rights">
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Access, correct, or delete your personal data.</li>
          <li>Object to or restrict certain processing of your data.</li>
          <li>Export your data in a portable format.</li>
          <li>Withdraw consent at any time (where processing is based on consent).</li>
        </ul>
        <p>To exercise any of these rights, please <ContactHQLink>contact us</ContactHQLink>.</p>
      </S>
      <S title="7. Data Retention">
        <p>We retain your personal data for as long as your account is active or as needed to provide the Service. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law.</p>
      </S>
      <S title="8. International Data Transfers">
        <p>JazzNode operates across multiple countries. Your data may be processed in jurisdictions outside your country of residence. We take steps to ensure your data is protected in accordance with this policy regardless of where it is processed.</p>
      </S>
      <S title="9. Children's Privacy">
        <p>The Service is not directed to children under 13 (or the applicable age of consent in your jurisdiction). We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us so we can delete it.</p>
      </S>
      <S title="10. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. Your continued use of the Service after changes are posted constitutes acceptance.</p>
      </S>
      <S title="11. Contact Us">
        <p>If you have questions or concerns about this Privacy Policy, please <ContactHQLink>contact us</ContactHQLink>.</p>
      </S>
    </LegalPageModal>
  );
}

/* ── Refund & Cancellation Policy ── */
export function RefundModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <LegalPageModal isOpen={isOpen} onClose={onClose} title="Refund & Cancellation Policy">
      <p className="text-xs text-[var(--muted-foreground)]/60">Last updated: March 19, 2026</p>

      <S title="1. Free Services">
        <p>The core features of JazzNode — including browsing events, artists, venues, and cities — are free to use and do not require payment. No refund applies to free services.</p>
      </S>
      <S title="2. Premium Subscriptions">
        <p>JazzNode offers optional paid subscription tiers for artists and venues (e.g., Premium, Elite) that unlock additional features such as analytics, broadcasting tools, booking management, and custom branding.</p>
        <p>Subscriptions are billed on a recurring basis (monthly or annually, depending on the plan selected). You will be charged at the beginning of each billing cycle.</p>
      </S>
      <S title="3. Cancellation">
        <p>You may cancel your subscription at any time from your account dashboard. Upon cancellation:</p>
        <ul className="list-disc ml-5 space-y-1">
          <li>Your premium features will remain active until the end of your current billing period.</li>
          <li>You will not be charged for subsequent billing cycles.</li>
          <li>Your account will revert to the free tier after the current period expires.</li>
        </ul>
        <p>No partial refunds are issued for unused time remaining in a billing period when you cancel mid-cycle.</p>
      </S>
      <S title="4. Refund Eligibility">
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
      </S>
      <S title="5. How to Request a Refund">
        <p>To request a refund, please <ContactHQLink>contact us</ContactHQLink> with your account email and a brief description of the reason. We aim to process all refund requests within 5 business days.</p>
        <p>Approved refunds will be credited to the original payment method.</p>
      </S>
      <S title="6. Changes to This Policy">
        <p>We may update this Refund &amp; Cancellation Policy from time to time. Changes will be posted on this page with an updated date. Existing subscriptions will be governed by the policy in effect at the time of purchase until the next renewal.</p>
      </S>
      <S title="7. Contact Us">
        <p>If you have questions about refunds or cancellations, please <ContactHQLink>contact us</ContactHQLink>.</p>
      </S>
    </LegalPageModal>
  );
}
