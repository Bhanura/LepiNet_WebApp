'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// Types
type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'user' | 'expert' | 'admin';
  verification_status: string;
  profession?: string;
  experience_years?: string;
  bio?: string;
  linkedin_url?: string;
};

type DashboardStats = {
  totalUsers: number;
  totalExperts: number;
  totalRecords: number;
  totalSpecies: number;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalExperts: 0, totalRecords: 0, totalSpecies: 0
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Verify Admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUser?.role !== 'admin') {
      alert("Unauthorized");
      return router.push('/');
    }

    // 2. Fetch Stats (Parallel Requests)
    const [
      { count: recordCount },
      { count: speciesCount },
      { data: allUsers }
    ] = await Promise.all([
      supabase.from('records').select('*', { count: 'exact', head: true }),
      supabase.from('species').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*').order('created_at', { ascending: false })
    ]);

    if (allUsers) {
      setUsers(allUsers as UserProfile[]);
      
      // Calculate User Stats locally
      const experts = allUsers.filter(u => u.role === 'expert').length;
      setStats({
        totalUsers: allUsers.length,
        totalExperts: experts,
        totalRecords: recordCount || 0,
        totalSpecies: speciesCount || 0
      });
    }
    
    setLoading(false);
  };

  // --- ACTIONS ---

  const handleVerification = async (userId: string, approved: boolean) => {
    const status = approved ? 'verified' : 'rejected';
    const role = approved ? 'expert' : 'user';

    await updateUser(userId, { verification_status: status, role });
    alert(`Application ${approved ? 'Approved' : 'Rejected'}`);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    await updateUser(userId, { role: newRole });
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    if (!confirm(`Are you sure you want to ${isBanned ? 'BAN' : 'UNBAN'} this user?`)) return;
    // We use verification_status 'banned' as a simple flag
    await updateUser(userId, { verification_status: isBanned ? 'banned' : 'verified' });
  };

  const updateUser = async (userId: string, updates: any) => {
    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    if (error) alert("Update failed: " + error.message);
    else fetchData(); // Refresh data
  };

  // --- RENDER HELPERS ---

  const pendingApplicants = users.filter(u => u.verification_status === 'pending');

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-[#134a86]">Super Admin Dashboard</h1>

        {/* --- STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Total Users" value={stats.totalUsers} icon="👥" />
          <StatCard title="Active Experts" value={stats.totalExperts} icon="🎓" />
          <StatCard title="Species Database" value={stats.totalSpecies} icon="🦋" />
          <StatCard title="Total Records" value={stats.totalRecords} icon="📸" />
        </div>

        {/* --- TABS --- */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-4 font-medium ${activeTab === 'overview' ? 'text-[#134a86] border-b-2 border-[#134a86]' : 'text-gray-500'}`}
          >
            Pending Applications ({pendingApplicants.length})
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-2 px-4 font-medium ${activeTab === 'users' ? 'text-[#134a86] border-b-2 border-[#134a86]' : 'text-gray-500'}`}
          >
            User Management
          </button>
        </div>

        {/* --- TAB CONTENT: OVERVIEW (PENDING APPLICATIONS) --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {pendingApplicants.length === 0 ? (
              <div className="bg-white p-10 rounded-xl shadow-sm text-center text-gray-500">
                ✅ No pending applications. All caught up!
              </div>
            ) : (
              pendingApplicants.map(app => (
                <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{app.first_name} {app.last_name}</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full uppercase">{app.profession}</span>
                    </div>
                    <p className="text-gray-600 mb-4">{app.email}</p>
                    <div className="bg-gray-50 p-4 rounded-lg mb-2">
                      <p className="text-sm font-semibold mb-1">Expertise / Bio:</p>
                      <p className="text-sm text-gray-600">{app.bio}</p>
                    </div>
                    <p className="text-sm text-gray-500">Experience: {app.experience_years} | <a href={app.linkedin_url} className="text-blue-600 hover:underline">LinkedIn</a></p>
                  </div>
                  <div className="flex flex-col justify-center gap-2 min-w-[120px]">
                    <button onClick={() => handleVerification(app.id, true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Approve</button>
                    <button onClick={() => handleVerification(app.id, false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- TAB CONTENT: USER MANAGEMENT --- */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold text-gray-600">User</th>
                    <th className="p-4 font-semibold text-gray-600">Role</th>
                    <th className="p-4 font-semibold text-gray-600">Status</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium">{u.first_name} {u.last_name}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </td>
                      <td className="p-4">
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="user">User</option>
                          <option value="expert">Expert</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          u.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                          u.verification_status === 'banned' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {u.verification_status || 'active'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {u.verification_status === 'banned' ? (
                          <button onClick={() => handleBanUser(u.id, false)} className="text-green-600 hover:text-green-800 text-sm font-medium">Unban</button>
                        ) : (
                          <button onClick={() => handleBanUser(u.id, true)} className="text-red-600 hover:text-red-800 text-sm font-medium">Ban User</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Simple Stat Card Component
function StatCard({ title, value, icon }: { title: string, value: number, icon: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-[#134a86] mt-1">{value}</p>
      </div>
      <div className="text-4xl opacity-20">{icon}</div>
    </div>
  );
}