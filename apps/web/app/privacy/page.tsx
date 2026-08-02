export const metadata = { title: "Privacy Policy — SFERAT" };

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="text-xs text-gray-500 mt-1">Last updated: August 2026</p>
      </div>

      <p>
        SFERAT ("we", "us") operates a discussion platform organized into thematic "Republics." This
        policy explains what information we collect, how we use it, and the choices you have.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">1. Information we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account information:</strong> email address, username, and password (stored securely by our authentication provider, Supabase — we never see your plaintext password).</li>
          <li><strong>Profile information you choose to add:</strong> display name, bio, avatar, employment, education, location, and topics of interest. These are optional, and some can be marked private in Settings.</li>
          <li><strong>Content you post:</strong> posts, comments, votes, follows, saved posts, and reports you submit.</li>
          <li><strong>Security/technical data:</strong> when you sign up, sign in, or request a password reset, our bot-protection provider (Cloudflare Turnstile) processes your IP address and browser signals to verify you're not an automated script. We also use error-monitoring (Sentry) that can capture technical details (e.g. browser type, the page you were on) when something breaks, to help us fix it.</li>
          <li><strong>Usage data:</strong> we use Vercel Analytics for basic, privacy-friendly traffic statistics (e.g. page views). It does not use tracking cookies to build a profile of you across other websites.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">2. How we use your information</h2>
        <p>We use your information to operate the platform: to show your posts and comments to other users, to enforce our moderation rules, to send you account-related emails (password resets, email changes), to protect the platform from spam/abuse, and to improve the product. We do not sell your personal information to third parties.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">3. Cookies and similar technologies</h2>
        <p>We use only the cookies/local storage strictly necessary to keep you signed in (managed by Supabase Auth) and to remember basic preferences. We do not use advertising or cross-site tracking cookies. Our bot-protection widget (Cloudflare Turnstile) may set a short-lived cookie as part of verifying you're not a bot.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">4. Post expiration and data retention</h2>
        <p>Posts are hidden from public feeds after 7 days (or a shorter duration you choose when posting), but the underlying record is retained for a period afterward for moderation and integrity purposes, not indefinitely displayed. Account information is retained until you delete your account.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">5. Your rights and controls</h2>
        <p>From Settings, you can at any time:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Export your data</strong> — download a copy of your profile, posts, and comments.</li>
          <li><strong>Control profile visibility</strong> — hide employment/education/location from other visitors.</li>
          <li><strong>Delete your account</strong> — your profile is anonymized (shown as "Private user") and you can no longer sign in. Your posts and comments remain visible, without your name attached, so other people's conversations aren't disrupted.</li>
          <li><strong>Block other users</strong> and <strong>mute Republics</strong> to control what you see.</li>
          <li><strong>Sign out of all other devices</strong> from one place, without changing your password.</li>
        </ul>
        <p>
          Depending on where you live, you may also have the right to access, correct, or request a copy
          of your personal data; to object to certain processing; or to lodge a complaint with your local
          data protection authority. Contact us (below) to exercise any of these rights.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">6. Third-party services</h2>
        <p>We rely on the following providers to run SFERAT, each processing data on our behalf under their own security and privacy commitments:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase</strong> — database, authentication, file storage.</li>
          <li><strong>Vercel</strong> — hosting and privacy-friendly analytics.</li>
          <li><strong>Resend</strong> — delivery of account emails (confirmation, password reset).</li>
          <li><strong>Sentry</strong> — error monitoring, to help us find and fix bugs.</li>
          <li><strong>Cloudflare (Turnstile)</strong> — bot/abuse protection on sign-up and sign-in.</li>
        </ul>
        <p>Some of these providers may process data on servers outside your own country. Where that happens, they do so under their own applicable safeguards for international data transfers.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">7. Children</h2>
        <p>SFERAT is not directed at children under 16. If you believe a child has created an account, please contact us so we can remove it.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-gray-900">8. Contact</h2>
        <p>Questions about this policy or your data? Contact us at <a href="mailto:sferatapp@gmail.com" className="text-blue-600 underline">sferatapp@gmail.com</a>.</p>
      </section>

      <p className="text-xs text-gray-400 pt-4 border-t">
        This policy may be updated as SFERAT grows. Material changes will be reflected here with an
        updated date.
      </p>
    </main>
  );
}
