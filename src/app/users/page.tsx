'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import PaginationControls from '@/components/PaginationControls';

interface BaseUser {
  _id: string;
  name: string;
  username: string;
  profilePicture?: string;
  bio?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<BaseUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchUsers = async (query = search, targetPage = page) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      params.append('page', String(targetPage));
      params.append('limit', '20');

      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(search, 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div id="users-top" className="text-center mb-12">
          <h1 className="text-3xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Find Students
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400 sm:mt-4">
            Search for your peers by name or username to view their profiles and listings.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-12 max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search users by name or @username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-6 py-4 pr-16 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 rounded-full bg-indigo-600 p-3 text-white hover:bg-indigo-700 hover:scale-105 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              title="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        {error && (
          <div className="text-center text-red-600 bg-red-50 p-4 rounded-xl mb-8 max-w-md mx-auto border border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
             <Loader />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white">No users found</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Try adjusting your search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((u) => (
              <Link
                key={u._id}
                href={`/profile/${u._id}`}
                className="group flex flex-col items-center bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 hover:border-indigo-100 dark:hover:border-indigo-800 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-3xl font-bold shadow-inner mb-4 flex-shrink-0">
                   {u.profilePicture ? (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={u.profilePicture} alt={u.name} className="w-full h-full rounded-full object-cover" />
                   ) : (
                     u.name?.charAt(0).toUpperCase() || 'U'
                   )}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate w-full text-center">
                  {u.name}
                </h3>
                {u.username && (
                  <p className="text-sm font-medium text-indigo-500 dark:text-indigo-400 mt-1 mb-3">@{u.username}</p>
                )}
                
                {u.bio && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center line-clamp-2 mt-2">
                    {u.bio}
                  </p>
                )}
                
                {u._id === currentUser?.id && (
                  <span className="mt-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                    You
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
        
        {!loading && users.length > 0 && (
           <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} scrollTargetId="users-top" />
        )}
      </div>
    </div>
  );
}
