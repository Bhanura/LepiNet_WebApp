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
  created_at: string;
};

type DashboardStats = {
  totalUsers: number;
  verifiedExperts: number;
  totalRecords: number;
  unreviewedRecords: number;
  pendingVerifications: number;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'statistics'>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, 
    verifiedExperts: 0, 
    totalRecords: 0, 
    unreviewedRecords: 0,
    pendingVerifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, roleFilter, statusFilter, users]);

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.verification_status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const fetchData = async () => {
    // 1. Verify Admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      setLoading(false);
      router.push('/login');
      return;
    }

    const { data: currentUser, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (dbError || currentUser?.role !== 'admin') {
      setLoading(false);
      alert("Unauthorized - Admin access required");
      router.push('/');
      return;
    }

    // 2. Fetch Stats and Data (Parallel Requests)
    const [
      { data: allRecords },
      { data: allReviews },
      { data: allUsers }
    ] = await Promise.all([
      supabase.from('ai_logs').select('id'),
      supabase.from('expert_reviews').select('ai_log_id'),
      supabase.from('users').select('*').order('created_at', { ascending: false })
    ]);

    if (allUsers) {
      setUsers(allUsers as UserProfile[]);
      setFilteredUsers(allUsers as UserProfile[]);
      
      // Calculate unreviewed records
      const reviewedRecordIds = new Set((allReviews || []).map(r => r.ai_log_id));
      const unreviewedCount = (allRecords || []).filter(r => !reviewedRecordIds.has(r.id)).length;
      
      // Calculate User Stats
      const verifiedExperts = allUsers.filter(u => u.verification_status === 'verified').length;
      const pendingCount = allUsers.filter(u => u.verification_status === 'pending').length;
      
      setStats({
        totalUsers: allUsers.length,
        verifiedExperts: verifiedExperts,
        totalRecords: allRecords?.length || 0,
        unreviewedRecords: unreviewedCount,
        pendingVerifications: pendingCount
      });
    }
    
    setLoading(false);
  };

  // --- ACTIONS ---

  const handleVerification = async (userId: string, approved: boolean) => {
    const status = approved ? 'verified' : 'rejected';
    
    const { error } = await supabase
      .from('users')
      .update({ verification_status: status })
      .eq('id', userId);

    if (error) {
      alert("Update failed: " + error.message);
    } else {
      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'verification_status',
        title: approved ? 'Verification Approved!' : 'Verification Rejected',
        message: approved 
          ? 'Your expert verification has been approved. You can now review records.' 
          : 'Your expert verification request was not approved at this time.',
      });
      
      alert(`Application ${approved ? 'Approved' : 'Rejected'}`);
      fetchData(); // Refresh data
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;
    
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      alert("Update failed: " + error.message);
    } else {
      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'role_change',
        title: 'Role Updated',
        message: `Your role has been changed to ${newRole}.`,
      });
      
      fetchData(); // Refresh data
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    if (!confirm(`Are you sure you want to ${isBanned ? 'BAN' : 'UNBAN'} this user?`)) return;
    
    const status = isBanned ? 'banned' : 'none';
    const { error } = await supabase
      .from('users')
      .update({ verification_status: status })
      .eq('id', userId);

    if (error) {
      alert("Update failed: " + error.message);
    } else {
      fetchData(); // Refresh data
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to DELETE this user? This action cannot be undone!')) return;
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      alert('User deleted successfully');
      fetchData(); // Refresh data
    }
  };

  const pendingApplicants = users.filter(u => u.verification_status === 'pending');

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#134a86]">Super Admin Dashboard</h1>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {/* --- STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
          <StatCard title="Total Users" value={stats.totalUsers} icon="👥" color="blue" />
          <StatCard title="Verified Experts" value={stats.verifiedExperts} icon="🎓" color="green" />
          <StatCard title="Total Records" value={stats.totalRecords} icon="📸" color="purple" />
          <StatCard title="Unreviewed Records" value={stats.unreviewedRecords} icon="⏳" color="yellow" />
          <StatCard title="Pending Verifications" value={stats.pendingVerifications} icon="📋" color="orange" />
        </div>

        {/* --- TABS --- */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-4 font-medium ${activeTab === 'overview' ? 'text-[#134a86] border-b-2 border-[#134a86]' : 'text-gray-500'}`}
          >
            Verification Requests ({pendingApplicants.length})
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-2 px-4 font-medium ${activeTab === 'users' ? 'text-[#134a86] border-b-2 border-[#134a86]' : 'text-gray-500'}`}
          >
            User Management
          </button>
          <button 
            onClick={() => setActiveTab('statistics')}
            className={`pb-2 px-4 font-medium ${activeTab === 'statistics' ? 'text-[#134a86] border-b-2 border-[#134a86]' : 'text-gray-500'}`}
          >
            System Statistics
          </button>
        </div>

        {/* --- TAB CONTENT: VERIFICATION REQUESTS --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {pendingApplicants.length === 0 ? (
              <div className="bg-white p-10 rounded-xl shadow-sm text-center text-gray-500">
                ✅ No pending verification requests. All caught up!
              </div>
            ) : (
              pendingApplicants.map(app => (
                <div key={app.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">{app.first_name} {app.last_name}</h3>
                      {app.profession && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{app.profession}</span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">{app.email}</p>
                    {app.bio && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-2">
                        <p className="text-sm font-semibold mb-1">Bio / Expertise:</p>
                        <p className="text-sm text-gray-600">{app.bio}</p>
                      </div>
                    )}
                    <div className="flex gap-4 text-sm text-gray-500">
                      {app.experience_years && <span>Experience: {app.experience_years} years</span>}
                      {app.linkedin_url && (
                        <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          LinkedIn Profile →
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-2 min-w-[120px]">
                    <button onClick={() => handleVerification(app.id, true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium">
                      ✓ Approve
                    </button>
                    <button onClick={() => handleVerification(app.id, false)} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-medium">
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- TAB CONTENT: USER MANAGEMENT --- */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                className="flex-1 p-3 border border-gray-300 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select 
                className="p-3 border border-gray-300 rounded-lg"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="expert">Experts</option>
                <option value="admin">Admins</option>
              </select>
              <select 
                className="p-3 border border-gray-300 rounded-lg"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="none">None</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            {/* User Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-semibold text-gray-600">User</th>
                    <th className="p-4 font-semibold text-gray-600">Role</th>
                    <th className="p-4 font-semibold text-gray-600">Status</th>
                    <th className="p-4 font-semibold text-gray-600">Joined</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <select 
                          value={user.role} 
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="p-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="user">User</option>
                          <option value="expert">Expert</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={user.verification_status} />
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {user.verification_status !== 'banned' ? (
                            <button 
                              onClick={() => handleBanUser(user.id, true)}
                              className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                            >
                              Ban
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleBanUser(user.id, false)}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                            >
                              Unban
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                No users found matching your filters.
              </div>
            )}
          </div>
        )}

        {/* --- TAB CONTENT: SYSTEM STATISTICS --- */}
        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4 text-gray-800">User Statistics</h3>
                <div className="space-y-3">
                  <StatRow label="Total Registered Users" value={stats.totalUsers} />
                  <StatRow label="Verified Experts" value={stats.verifiedExperts} />
                  <StatRow label="Pending Verifications" value={stats.pendingVerifications} />
                  <StatRow label="Regular Users" value={stats.totalUsers - stats.verifiedExperts} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-4 text-gray-800">Record Statistics</h3>
                <div className="space-y-3">
                  <StatRow label="Total Records" value={stats.totalRecords} />
                  <StatRow label="Reviewed Records" value={stats.totalRecords - stats.unreviewedRecords} />
                  <StatRow label="Unreviewed Records" value={stats.unreviewedRecords} />
                  <StatRow 
                    label="Review Progress" 
                    value={stats.totalRecords > 0 
                      ? `${Math.round(((stats.totalRecords - stats.unreviewedRecords) / stats.totalRecords) * 100)}%`
                      : '0%'
                    } 
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800">System Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <HealthCard 
                  title="Pending Reviews" 
                  value={stats.unreviewedRecords}
                  status={stats.unreviewedRecords < 100 ? 'good' : stats.unreviewedRecords < 500 ? 'warning' : 'critical'}
                />
                <HealthCard 
                  title="Pending Verifications" 
                  value={stats.pendingVerifications}
                  status={stats.pendingVerifications < 5 ? 'good' : stats.pendingVerifications < 20 ? 'warning' : 'critical'}
                />
                <HealthCard 
                  title="Active Experts" 
                  value={stats.verifiedExperts}
                  status={stats.verifiedExperts > 10 ? 'good' : stats.verifiedExperts > 3 ? 'warning' : 'critical'}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StatCard({ title, value, icon, color = 'blue' }: { title: string; value: number; icon: string; color?: string }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center gap-4">
        <div className={`text-3xl p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    none: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-700',
    verified: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    banned: 'bg-red-600 text-white',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || styles.none}`}>
      {status.toUpperCase()}
    </span>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <span className="text-gray-600">{label}</span>
      <span className="font-bold text-gray-800">{value}</span>
    </div>
  );
}

function HealthCard({ title, value, status }: { title: string; value: number; status: 'good' | 'warning' | 'critical' }) {
  const statusConfig = {
    good: { color: 'bg-green-100 border-green-300', icon: '✓', iconColor: 'text-green-600' },
    warning: { color: 'bg-yellow-100 border-yellow-300', icon: '⚠', iconColor: 'text-yellow-600' },
    critical: { color: 'bg-red-100 border-red-300', icon: '✗', iconColor: 'text-red-600' },
  };

  const config = statusConfig[status];

  return (
    <div className={`p-4 rounded-lg border-2 ${config.color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className={`text-2xl ${config.iconColor}`}>{config.icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}
