// promoter/users/FullCRUDUsers.tsx
// Full CRUD user management for the promoter portal (supervisor view).
// Allows managing promoters, supervisors, and admins (if permitted).

import React, { useState } from 'react';
import { AppLayout } from '../../shared/layout/AppLayout';

// Admin‑style tokens (same as promoter)
const G = '#C4973A';
const GL = '#DDB55A';
const B = '#080808';
const BC = '#161616';
const BB = 'rgba(37, 9, 9, 0.07)';
const W = '#F4EFE6';
const WM = 'rgba(244,239,230,0.55)';
const WD = 'rgba(244,239,230,0.22)';
const FB = "'DM Sans', system-ui, sans-serif";
const FD = "'Playfair Display', Georgia, serif";

type Role   = 'promoter' | 'supervisor' | 'admin';
type Status = 'active' | 'inactive' | 'suspended';

interface User {
  id:       string;
  name:     string;
  email:    string;
  phone:    string;
  role:     Role;
  status:   Status;
  city:     string;
  joined:   string;
  jobs:     number;
  earnings: number;
}

const MOCK_USERS: User[] = [
  { id: 'U001', name: 'Ayanda Dlamini',  email: 'ayanda@email.com',  phone: '+27 71 234 5678', role: 'promoter',   status: 'active',    city: 'Johannesburg', joined: '2025-11-12', jobs: 24, earnings: 28800  },
  { id: 'U002', name: 'Thabo Nkosi',     email: 'thabo@email.com',   phone: '+27 82 345 6789', role: 'promoter',   status: 'active',    city: 'Johannesburg', joined: '2025-10-04', jobs: 18, earnings: 21600  },
  { id: 'U003', name: 'Lerato Mokoena',  email: 'lerato@email.com',  phone: '+27 63 456 7890', role: 'supervisor', status: 'active',    city: 'Cape Town',    joined: '2025-09-20', jobs: 42, earnings: 63000  },
  { id: 'U004', name: 'Sipho Mhlongo',   email: 'sipho@email.com',   phone: '+27 74 567 8901', role: 'promoter',   status: 'suspended', city: 'Durban',       joined: '2026-01-08', jobs: 3,  earnings: 2700   },
  { id: 'U005', name: 'Nomsa Zulu',      email: 'nomsa@email.com',   phone: '+27 83 678 9012', role: 'promoter',   status: 'active',    city: 'Pretoria',     joined: '2025-12-01', jobs: 9,  earnings: 10350  },
  { id: 'U006', name: 'Bongani Khumalo', email: 'bongani@email.com', phone: '+27 61 789 0123', role: 'promoter',   status: 'inactive',  city: 'Durban',       joined: '2025-08-15', jobs: 31, earnings: 37200  },
  { id: 'U007', name: 'Zanele Motha',    email: 'zanele@email.com',  phone: '+27 79 890 1234', role: 'promoter',   status: 'active',    city: 'Johannesburg', joined: '2026-02-10', jobs: 6,  earnings: 8100   },
  { id: 'U008', name: 'Musa Dube',       email: 'musa@email.com',    phone: '+27 72 901 2345', role: 'supervisor', status: 'active',    city: 'Cape Town',    joined: '2025-07-22', jobs: 55, earnings: 82500  },
];

const ROLE_COLOR:   Record<Role,   string> = { promoter: '#3A7BD5', supervisor: G, admin: '#8B5CF6' };
const STATUS_COLOR: Record<Status, string> = { active: '#22C55E', inactive: WD, suspended: '#EF4444' };

const EMPTY: Omit<User, 'id' | 'jobs' | 'earnings'> = {
  name: '', email: '', phone: '', role: 'promoter', status: 'active', city: '', joined: ''
};

export const FullCRUDUsers: React.FC = () => {
  const [users,   setUsers]   = useState<User[]>(MOCK_USERS);
  const [modal,   setModal]   = useState<'create' | 'edit' | 'view' | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form,    setForm]    = useState<Omit<User, 'id' | 'jobs' | 'earnings'>>(EMPTY);
  const [search,  setSearch]  = useState('');
  const [roleF,   setRoleF]   = useState<Role | 'all'>('all');
  const [statusF, setStatusF] = useState<Status | 'all'>('all');
  const [deleting,setDeleting]= useState<string | null>(null);

  const filtered = users.filter(u =>
    (roleF   === 'all' || u.role   === roleF)   &&
    (statusF === 'all' || u.status === statusF) &&
    (search === '' || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal('create'); };
  const openEdit   = (u: User) => {
    setForm({ name: u.name, email: u.email, phone: u.phone, role: u.role, status: u.status, city: u.city, joined: u.joined });
    setEditing(u);
    setModal('edit');
  };
  const openView   = (u: User) => { setEditing(u); setModal('view'); };
  const closeModal = () => { setModal(null); setEditing(null); };

  const save = () => {
    if (modal === 'create') {
      const newUser: User = {
        ...form,
        id: `U${String(users.length + 1).padStart(3, '0')}`,
        jobs: 0,
        earnings: 0
      };
      setUsers(prev => [newUser, ...prev]);
    } else if (editing) {
      setUsers(prev => prev.map(u => u.id === editing.id ? { ...u, ...form } : u));
    }
    closeModal();
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeleting(null);
    if (modal) closeModal();
  };

  const F = (key: keyof typeof form, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <AppLayout title="User Management" navItems={[]} activeNav="" onNavigate={() => {}}>
      <div style={{ padding: '40px 48px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: G, marginBottom: 8 }}>
              User Management
            </div>
            <h1 style={{ fontFamily: FD, fontSize: 30, fontWeight: 700, color: W }}>Manage Users</h1>
            <p style={{ fontSize: 13, color: WM, marginTop: 6 }}>{users.length} registered users on the platform.</p>
          </div>
          <button
            onClick={openCreate}
            style={{
              padding: '12px 28px', background: G, border: 'none', color: B,
              fontFamily: FB, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = GL}
            onMouseLeave={e => e.currentTarget.style.background = G}
          >
            + Add User
          </button>
        </div>

        {/* FILTERS */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Search name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: BC, border: `1px solid ${BB}`, padding: '9px 16px',
              color: W, fontFamily: FB, fontSize: 13, outline: 'none', width: 240
            }}
            onFocus={e => e.currentTarget.style.borderColor = G}
            onBlur={e => e.currentTarget.style.borderColor = BB}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'promoter', 'supervisor', 'admin'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleF(r)}
                style={{
                  padding: '7px 14px', border: 'none', borderRadius: 4, cursor: 'pointer',
                  fontFamily: FB, fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                  background: roleF === r ? G : 'rgba(255,255,255,0.05)',
                  color: roleF === r ? B : WM, transition: 'all 0.2s'
                }}
              >
                {r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'active', 'inactive', 'suspended'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusF(s)}
                style={{
                  padding: '7px 14px', border: 'none', borderRadius: 4, cursor: 'pointer',
                  fontFamily: FB, fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                  background: statusF === s ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                  color: statusF === s ? W : WM, transition: 'all 0.2s'
                }}
              >
                {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background: BC, border: `1px solid ${BB}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BB}` }}>
                {['User', 'Role', 'City', 'Joined', 'Jobs', 'Earnings', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: WD, fontFamily: FB }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BB}` : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => openView(u)}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: `${ROLE_COLOR[u.role]}22`,
                        border: `1px solid ${ROLE_COLOR[u.role]}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, color: ROLE_COLOR[u.role], fontWeight: 700, flexShrink: 0
                      }}>
                        {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: W }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: WM }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: ROLE_COLOR[u.role], background: `${ROLE_COLOR[u.role]}18`,
                      padding: '3px 10px', borderRadius: 2
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: WM }}>{u.city}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: WM, whiteSpace: 'nowrap' }}>
                    {new Date(u.joined).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: W, fontWeight: 600 }}>{u.jobs}</td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: G, fontWeight: 700 }}>R{u.earnings.toLocaleString('en-ZA')}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: STATUS_COLOR[u.status], background: `${STATUS_COLOR[u.status]}18`,
                      padding: '3px 10px', borderRadius: 2
                    }}>{u.status}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => openEdit(u)} style={{ fontSize: 11, color: G, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB }}>Edit</button>
                      <span style={{ color: WD }}>·</span>
                      <button onClick={() => setDeleting(u.id)} style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: WD, fontSize: 13 }}>No users match your filters.</div>
          )}
        </div>

        {/* DELETE CONFIRM */}
        {deleting && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
            <div style={{ background: BC, border: '1px solid #EF4444', padding: '36px 40px', maxWidth: 380, width: '100%' }}>
              <h3 style={{ fontFamily: FD, fontSize: 22, color: W, marginBottom: 12 }}>Delete User?</h3>
              <p style={{ fontSize: 13, color: WM, marginBottom: 28 }}>This will permanently remove the user and all their data from the platform.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setDeleting(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${BB}`, color: WM, fontFamily: FB, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => deleteUser(deleting)} style={{ flex: 1, padding: '12px', background: '#EF4444', border: 'none', color: W, fontFamily: FB, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE / EDIT MODAL */}
        {(modal === 'create' || modal === 'edit') && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <div style={{ background: '#141414', border: `1px solid ${BB}`, padding: '40px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: G }} />
              <button onClick={closeModal} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: WM, fontSize: 18 }}>✕</button>
              <div style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: G, marginBottom: 8 }}>
                {modal === 'create' ? 'New User' : 'Edit User'}
              </div>
              <h2 style={{ fontFamily: FD, fontSize: 24, fontWeight: 700, color: W, marginBottom: 28 }}>
                {modal === 'create' ? 'Add a New User' : `Editing ${editing?.name}`}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {[
                  { label: 'Full Name',    key: 'name',  placeholder: 'Ayanda Dlamini'        },
                  { label: 'Email',        key: 'email', placeholder: 'ayanda@email.com'       },
                  { label: 'Phone',        key: 'phone', placeholder: '+27 71 000 0000'        },
                  { label: 'City',         key: 'city',  placeholder: 'Johannesburg'           },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: WM, display: 'block', marginBottom: 7 }}>{label}</label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      value={(form as any)[key]}
                      onChange={e => F(key as any, e.target.value)}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BB}`,
                        padding: '12px 16px', fontFamily: FB, fontSize: 14, color: W, outline: 'none'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = G}
                      onBlur={e => e.currentTarget.style.borderColor = BB}
                    />
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: WM, display: 'block', marginBottom: 7 }}>Role</label>
                    <select
                      value={form.role}
                      onChange={e => F('role', e.target.value)}
                      style={{
                        width: '100%', background: '#0e0e0e', border: `1px solid ${BB}`,
                        padding: '12px 16px', fontFamily: FB, fontSize: 14, color: W, outline: 'none'
                      }}
                    >
                      <option value="promoter">Promoter</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: WM, display: 'block', marginBottom: 7 }}>Status</label>
                    <select
                      value={form.status}
                      onChange={e => F('status', e.target.value)}
                      style={{
                        width: '100%', background: '#0e0e0e', border: `1px solid ${BB}`,
                        padding: '12px 16px', fontFamily: FB, fontSize: 14, color: W, outline: 'none'
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={save}
                  style={{
                    padding: '15px', background: G, border: 'none', color: B,
                    fontFamily: FB, fontSize: 12, fontWeight: 700, letterSpacing: '0.15em',
                    textTransform: 'uppercase', cursor: 'pointer', marginTop: 8, transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = GL}
                  onMouseLeave={e => e.currentTarget.style.background = G}
                >
                  {modal === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODAL */}
        {modal === 'view' && editing && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <div style={{ background: '#141414', border: `1px solid ${BB}`, padding: '40px', width: '100%', maxWidth: 460, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: ROLE_COLOR[editing.role] }} />
              <button onClick={closeModal} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: WM, fontSize: 18 }}>✕</button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: `${ROLE_COLOR[editing.role]}22`,
                  border: `1px solid ${ROLE_COLOR[editing.role]}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: ROLE_COLOR[editing.role], fontWeight: 700
                }}>
                  {editing.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontFamily: FD, fontSize: 22, fontWeight: 700, color: W }}>{editing.name}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: ROLE_COLOR[editing.role], background: `${ROLE_COLOR[editing.role]}18`,
                    padding: '3px 10px', borderRadius: 2
                  }}>{editing.role}</span>
                </div>
              </div>

              {[
                { label: 'Email',    value: editing.email   },
                { label: 'Phone',    value: editing.phone   },
                { label: 'City',     value: editing.city    },
                { label: 'Joined',   value: new Date(editing.joined).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Jobs',     value: String(editing.jobs) },
                { label: 'Earnings', value: `R${editing.earnings.toLocaleString('en-ZA')}` },
                { label: 'Status',   value: editing.status  },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: `1px solid ${BB}` }}>
                  <span style={{ fontSize: 12, color: WM }}>{row.label}</span>
                  <span style={{ fontSize: 12, color: W, fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  onClick={() => { closeModal(); openEdit(editing); }}
                  style={{
                    flex: 2, padding: '12px', background: G, border: 'none', color: B,
                    fontFamily: FB, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = GL}
                  onMouseLeave={e => e.currentTarget.style.background = G}
                >
                  Edit User
                </button>
                <button
                  onClick={() => { closeModal(); setDeleting(editing.id); }}
                  style={{
                    flex: 1, padding: '12px', background: 'rgba(239,68,68,0.15)',
                    border: '1px solid #EF4444', color: '#EF4444',
                    fontFamily: FB, fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};