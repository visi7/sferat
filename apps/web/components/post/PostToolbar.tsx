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
        className={`h-8 px-3 rounded-full border bg-white hover:bg-gray-50 ${
          userVote === 1 ? "border-black" : ""
        }`}
        onClick={onUpvote}
        aria-pressed={userVote === 1}
      >
        ▲ Upvote
      </button>

      <button
        className={`h-8 px-3 rounded-full border bg-white hover:bg-gray-50 ${
          userVote === -1 ? "border-black" : ""
        }`}
        onClick={onDownvote}
        aria-pressed={userVote === -1}
      >
        ▼ Downvote
      </button>

      <span className="text-gray-500 ml-1">Score: {score}</span>

      <span className="mx-2 text-gray-300">·</span>

      <button
        className={`h-8 px-3 rounded-full border bg-white hover:bg-gray-50 inline-flex items-center ${
          commentsOpen ? "border-black" : ""
        }`}
        onClick={onToggleComments}
      >
        💬 {commentCount} Comments
      </button>

      
    


    </div>
  );
}
