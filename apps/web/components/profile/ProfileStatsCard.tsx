type Props = {
  postsCount: number;
  commentsCount: number;
  karma: number;
};

export default function ProfileStatsCard({ postsCount, commentsCount, karma }: Props) {
  return (
    <section className="bg-white border rounded-xl p-4">
      <h2 className="text-sm font-semibold mb-3">Contributions</h2>
      <div className="grid grid-cols-3 text-center gap-2">
        <div>
          <div className="text-lg font-semibold">{postsCount}</div>
          <div className="text-xs text-gray-500">Posts</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{commentsCount}</div>
          <div className="text-xs text-gray-500">Comments</div>
        </div>
        <div>
          <div className="text-lg font-semibold">{karma}</div>
          <div className="text-xs text-gray-500">Karma</div>
        </div>
      </div>
    </section>
  );
}
