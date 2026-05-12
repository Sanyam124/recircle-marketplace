import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatTimeAgo } from '@/lib/utils';

export function PostCardHeader({ post, user, canDeletePost, onDeletePost, cat }: any) {
  return (
    <div className="flex items-center gap-2 mb-1">
        <Link href={`/profile/${post.author?._id}`} className="group flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="font-bold text-gray-900 dark:text-white text-sm truncate uppercase tracking-tight italic group-hover:text-indigo-600 transition-colors">
                {post.author?.name || 'Deleted User'}
            </span>
            <span className="text-gray-400 dark:text-gray-500 text-[10px] font-medium tracking-tight">@{post.author?.username || 'deleted'}</span>
        </Link>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="text-gray-400 dark:text-gray-500 text-[10px] font-medium tracking-tight">{formatTimeAgo(post.createdAt)}</span>
        
        <div className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full ${cat.color} ml-2 animate-in fade-in zoom-in duration-500`}>
            <span className="text-[9px]">{cat.icon}</span>
            <span className="text-[8px] font-black uppercase tracking-tighter">{cat.name}</span>
        </div>

        {canDeletePost && (
            <button
                onClick={() => onDeletePost(post._id)}
                className="ml-auto text-gray-300 hover:text-red-500 transition-colors"
                title="Delete Post"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        )}
    </div>
  );
}

export function PostCardActions({ post, isUpvoted, isDownvoted, toggleUpvote, toggleDownvote, repliesVisible, setRepliesVisible, setReplyingTo }: any) {
  return (
    <div className="flex items-center gap-4 sm:gap-6 mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50">
        <div className="flex items-center gap-1 sm:gap-2">
            <button
                onClick={() => toggleUpvote(post._id)}
                className={`flex items-center gap-1.5 group transition-all text-xs font-bold ${isUpvoted ? 'text-indigo-600 dark:text-indigo-400 scale-105' : 'text-gray-400 dark:text-gray-500 hover:text-indigo-600'}`}
                title="Upvote"
            >
                <div className={`p-1.5 rounded-full transition-colors ${isUpvoted ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10'}`}>
                    <svg className="w-4 h-4" fill={isUpvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
                    </svg>
                </div>
                <span>{post.upvotes?.length || 0}</span>
            </button>

            <button
                onClick={() => toggleDownvote(post._id)}
                className={`flex items-center gap-1.5 group transition-all text-xs font-bold ${isDownvoted ? 'text-rose-600 dark:text-rose-400 scale-105' : 'text-gray-400 dark:text-gray-500 hover:text-rose-600'}`}
                title="Downvote"
            >
                <div className={`p-1.5 rounded-full transition-colors ${isDownvoted ? 'bg-rose-50 dark:bg-rose-900/30' : 'group-hover:bg-rose-50 dark:group-hover:bg-rose-900/10'}`}>
                    <svg className="w-4 h-4" fill={isDownvoted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                <span>{post.downvotes?.length || 0}</span>
            </button>
        </div>

        <button
            onClick={() => {
                setRepliesVisible(!repliesVisible);
                if (!repliesVisible) setReplyingTo(post._id);
            }}
            className={`flex items-center gap-2 group transition-all text-xs font-bold ${repliesVisible ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-indigo-600'}`}
        >
            <div className={`p-1.5 rounded-full transition-colors ${repliesVisible ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/10'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            </div>
            <span>{post.replies?.length || 0} Replies</span>
        </button>
    </div>
  );
}

export function ReplyItem({ reply, user, isAdmin, isAuthor, onDeleteReply, post, formatTimeAgo, scrollPostToTop }: any) {
  return (
    <div key={reply._id} className="flex items-start gap-3 animate-in fade-in duration-300">
        <Link href={`/profile/${reply.author._id}`} className="shrink-0 transition-transform hover:scale-105 active:scale-95">
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center">
                {reply.author?.profilePicture && !reply.author.profilePicture.includes('??') ? (
                    <Image src={reply.author.profilePicture} alt={reply.author?.name || 'User'} width={24} height={24} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                    <span className="text-[8px] font-bold text-gray-400">
                        {(reply.author?.name?.[0] || reply.author?.username?.[0] || 'U').toUpperCase()}
                    </span>
                )}
            </div>
        </Link>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/profile/${reply.author?._id}`} className="flex flex-col group">
                    <span className="font-bold text-gray-900 dark:text-white text-[11px] uppercase tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{reply.author?.name || 'Deleted user'}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-[9px] font-medium tracking-tighter">@{reply.author?.username || 'deleted'}</span>
                </Link>
                <span className="text-gray-300 dark:text-gray-600 self-center">·</span>
                <span className="text-gray-400 dark:text-gray-500 text-[10px] self-center">{formatTimeAgo(reply.createdAt)}</span>

                {(reply.author._id === user?._id || reply.author._id === user?.id || isAdmin || isAuthor) && (
                    <button
                        onClick={() => onDeleteReply(post._id, reply._id)}
                        className="ml-1 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete Reply"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>
            <p className="text-gray-800 dark:text-gray-200 text-xs leading-relaxed">{reply.content}</p>
        </div>
    </div>
  );
}
