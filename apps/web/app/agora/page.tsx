import Shell from "@/components/shell";
import LeftNav from "@/components/LeftNav";
import RightAside from "@/components/RightAside";

export default function AgoraPage() {
  return (
    <Shell left={<LeftNav />} right={<RightAside />}>
      <div className="bg-white border rounded-xl p-8 text-center space-y-3 max-w-2xl mx-auto mt-6">
        <div className="text-4xl">🏛️</div>
        <h1 className="text-xl font-bold">Agora — Coming soon</h1>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          A separate space for sponsored content — text and video, with context, open to comments and
          discussion like everything else on SFERAT. Built with the same standard: quality over noise, never
          disguised as something it isn't.
        </p>
        <a href="/" className="inline-block mt-2 px-4 py-2 border rounded-md text-sm hover:bg-gray-50">
          Back to Home
        </a>
      </div>
    </Shell>
  );
}
