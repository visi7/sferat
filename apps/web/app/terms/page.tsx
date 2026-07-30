export const metadata = { title: "Terms of Use — SFERAT" };

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Terms of Use</h1>
        <p className="text-xs text-gray-500 mt-1">Last updated: July 2026</p>
      </div>

      <p>
        By creating an account or using SFERAT, you agree to these terms. Please read them, along with
        our <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">1. Your account</h2>
        <p>You're responsible for the activity on your account and for keeping your password secure. You must be at least 16 years old to use SFERAT.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">2. Content and conduct</h2>
        <p>SFERAT moderates behavior, not opinions — you're free to disagree, debate, and hold unpopular views. What isn't allowed:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Harassment, threats, or targeted abuse of other users.</li>
          <li>Illegal content, or content that infringes someone else's rights (copyright, trademark, privacy).</li>
          <li>Spam, excessive self-promotion, or manipulating votes/rankings.</li>
          <li>Impersonating another person or organization.</li>
        </ul>
        <p>Content that violates these rules may be removed, and accounts may be suspended, at the discretion of SFERAT's moderators and administrators.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">3. Ownership of your content</h2>
        <p>You retain ownership of what you post. By posting, you grant SFERAT a license to display, distribute, and store that content as part of operating the platform.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">4. Post expiration</h2>
        <p>Posts are visible in feeds for a limited time (up to 7 days, or a shorter duration you choose) before expiring. This is a core part of how SFERAT works, not a bug — see our <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a> for how expired content is retained internally.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">5. Sponsored content ("Agora")</h2>
        <p>SFERAT may show clearly-labeled sponsored content in a dedicated section, separate from Republics, subject to its own rules. Sponsored content will never be disguised as ordinary user posts.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">6. Termination</h2>
        <p>You can delete your account at any time from Settings. We may suspend or remove accounts that violate these terms.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">7. Disclaimer</h2>
        <p>SFERAT is provided "as is." Views expressed by users are their own and don't represent SFERAT. We're not liable for content posted by users.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">8. Contact</h2>
        <p>Questions about these terms? Contact us at <strong>[CONTACT EMAIL — to be added]</strong>.</p>
      </section>
    </main>
  );
}
