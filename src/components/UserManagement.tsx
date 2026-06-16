import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, query, deleteDoc, setDoc } from 'firebase/firestore';
import { Shield, User, Mail, Save, AlertCircle, Loader2, Trash2, Plus } from 'lucide-react';

interface UserRole {
  id: string;
  role: 'admin' | 'manager';
  email: string;
}

interface UserManagementProps {
  userRole?: "admin" | "manager" | null;
}

export const UserManagement: React.FC<UserManagementProps> = ({ userRole }) => {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for Add User Form
  const [newEmail, setNewEmail] = useState('');
  const [newUid, setNewUid] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager'>('manager');

  useEffect(() => {
    // If the user role is not yet determined (null), wait for the parent to resolve it
    if (userRole === null) {
      return;
    }

    // Skip fetching if the user is explicitly not an admin to avoid Firestore Rule rejections
    if (userRole !== 'admin') {
      setLoading(false);
      return;
    }

    fetchUsers();
  }, [userRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'roles'));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRole[];
      setUsers(usersData);
    } catch (err: any) {
      setError('Failed to fetch users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'manager') => {
    try {
      const userRef = doc(db, 'roles', userId);
      await updateDoc(userRef, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      setError('Failed to update role: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the registry?')) return;
    try {
      const userRef = doc(db, 'roles', userId);
      await deleteDoc(userRef);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      setError('Failed to delete user: ' + err.message);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUid || !newEmail) return;
    try {
      const userRef = doc(db, 'roles', newUid);
      await setDoc(userRef, { id: newUid, email: newEmail, role: newRole });
      setUsers([...users, { id: newUid, email: newEmail, role: newRole }]);
      setNewUid('');
      setNewEmail('');
    } catch (err: any) {
      setError('Failed to add user: ' + err.message);
    }
  };

  if (userRole && userRole !== 'admin') {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md mx-auto text-center mt-8">
        <Shield size={40} className="text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Access Restricted</h3>
        <p className="text-sm text-slate-500">
          Only system administrators are permitted to view and manage user roles.
        </p>
      </div>
    );
  }

  if (userRole === null || loading) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center font-sans">
        <Loader2 className="animate-spin text-blue-600 mx-auto mb-3" size={24} />
        <p className="text-sm text-slate-500">Verifying administrator credentials...</p>
      </div>
    );
  }
  if (error) return <div className="p-4 text-rose-500 font-sans flex items-center gap-2"><AlertCircle size={16}/> {error}</div>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="text-blue-600" size={20} />
          <h2 className="text-lg font-semibold text-slate-800">User Management</h2>
        </div>
      </div>
      
      {/* Add User Form */}
      <form onSubmit={handleAddUser} className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <input type="text" placeholder="User UID" value={newUid} onChange={e => setNewUid(e.target.value)} className="p-2 border border-slate-200 rounded text-sm w-48" required />
        <input type="email" placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="p-2 border border-slate-200 rounded text-sm w-48" required />
        <select value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'manager')} className="p-2 border border-slate-200 rounded text-sm">
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Plus size={16} />
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-700">{user.email || 'N/A'}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'manager')}
                    className="p-1 border border-slate-200 rounded text-slate-600"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDeleteUser(user.id)} className="text-rose-500 hover:text-rose-700 p-1">
                        <Trash2 size={16} />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
