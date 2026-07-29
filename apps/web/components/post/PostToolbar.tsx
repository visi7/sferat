"use client";

type Props = {
  userVote: 0 | 1 | -1;
  score: number;
  onUpvote: () => void;
  onDownvote: () => void;
  commentCount: number;
  commentsOpen: boolean;
  onToggleComments: () => void;
       // ➜ tani optional
};


export default function PostToolbar({
  userVote,
  score,
  onUpvote,
  onDownvote,
  commentCount,
  commentsOpen,
  onToggleComments,
  
}: Props) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <button
        className={`inline-flex items-center justify-center gap-1 whitespace-nowrap leading-none h-8 px-3 rounded-full border bg-white hover:bg-gray-50 ${
          userVote === 1 ? "border-green-600 border-2 bg-green-50 text-green-700" : ""
        }`}
        onClick={onUpvote}
        aria-pressed={userVote === 1}
      >
        ▲ Upvote
      </button>

      <button
        className={`inline-flex items-center justify-center gap-1 whitespace-nowrap leading-none h-8 px-3 rounded-full border bg-white hover:bg-gray-50 ${
          userVote === -1 ? "border-red-600 border-2 bg-red-50 text-red-700" : ""
        }`}
        onClick={onDownvote}
        aria-pressed={userVote === -1}
      >
        ▼ Downvote
      </button>

      <span className="text-gray-500 ml-1">Score: {score}</span>

      <span className="mx-2 text-gray-300">·</span>

      <button
        className={`inline-flex items-center justify-center gap-1 whitespace-nowrap leading-none h-8 px-3 rounded-full border bg-white hover:bg-gray-50 ${
          commentsOpen ? "border-black" : ""
        }`}
        onClick={onToggleComments}
      >
        💬 {commentCount} Comments
      </button>

      
    


    </div>
  );
}
