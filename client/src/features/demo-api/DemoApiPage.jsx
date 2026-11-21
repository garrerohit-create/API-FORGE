import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Search,
  Check,
  Send,
  X,
  User,
  Mail,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAppStore } from '../../stores/workspaceStore.js';

export default function DemoApiPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { createTab } = useAppStore();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Computer Science',
    year: 1
  });

  // Query Students
  const { data: studentsResponse, isLoading, refetch } = useQuery({
    queryKey: ['students', search, departmentFilter],
    queryFn: () => api.getStudents({ search, department: departmentFilter })
  });

  const students = studentsResponse?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => api.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => alert(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => alert(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });

  const resetMutation = useMutation({
    mutationFn: () => api.resetDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      alert('Demonstration database records successfully reset to defaults.');
    }
  });

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      email: '',
      department: 'Computer Science',
      year: 1
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      department: student.department,
      year: student.year
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleOpenInClient = (method, path) => {
    createTab({
      name: `${method} Student`,
      method,
      urlTemplate: `http://127.0.0.1:5000${path}`
    });
    navigate('/client');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-bg-primary border border-bg-border">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Demonstration Student REST API</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Functional SQLite-backed CRUD REST endpoints mounted at{' '}
            <code className="text-amber-400 font-mono font-semibold">/demo/v1/students</code>. Fully persistent.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (confirm('Reset demonstration student records to default sample data?')) {
                resetMutation.mutate();
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary hover:bg-bg-elevated border border-bg-border text-xs text-muted hover:text-[var(--text-primary)] transition-colors"
            title="Reset to factory demo records"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#7C6CFF] hover:bg-[#6856f6] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-primary border border-bg-border rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF] cursor-pointer"
        >
          <option value="">All Departments</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Information Technology">Information Technology</option>
          <option value="Electronics & Comm">Electronics & Comm</option>
          <option value="Mechanical Engineering">Mechanical Engineering</option>
          <option value="Business Administration">Business Administration</option>
        </select>
      </div>

      {/* Students Data Table */}
      <div className="rounded-xl bg-bg-primary border border-bg-border overflow-hidden">
        <div className="p-4 border-b border-bg-border flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Student Records</h3>
          <span className="text-xs text-muted font-mono">{students.length} students enrolled</span>
        </div>

        {students.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            No students found matching current filters. Click "Add Student" to enroll one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-secondary text-muted border-b border-bg-border uppercase text-[10px] font-mono">
                <tr>
                  <th className="py-2.5 px-4">ID</th>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Year</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-bg-secondary/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#7C6CFF]">#{s.id}</td>
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">{s.name}</td>
                    <td className="py-3 px-4 font-mono text-muted">{s.email}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{s.department}</td>
                    <td className="py-3 px-4 font-mono">Year {s.year}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenInClient('GET', `/demo/v1/students/${s.id}`)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        title="Execute GET in API Client"
                      >
                        GET
                      </button>
                      <button
                        onClick={() => handleOpenEdit(s)}
                        className="p-1 rounded text-muted hover:text-[var(--text-primary)] hover:bg-bg-elevated"
                        title="Edit Student"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete student record for ${s.name} (ID: ${s.id})?`)) {
                            deleteMutation.mutate(s.id);
                          }
                        }}
                        className="p-1 text-muted hover:text-status-error"
                        title="Delete Student (204 No Content)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-bg-primary border border-bg-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border bg-bg-secondary">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {editingStudent ? `Edit Student (#${editingStudent.id})` : 'Enroll New Student'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-muted hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-muted font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Elena Rostova"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Email Address (Must be unique)</label>
                <input
                  type="email"
                  required
                  placeholder="elena.rostova@university.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Comm">Electronics & Comm</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Business Administration">Business Administration</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-muted font-medium">Academic Year (1 to 5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className="w-full bg-bg-secondary border border-bg-border rounded px-3 py-1.5 font-mono text-[var(--text-primary)] focus:outline-none focus:border-[#7C6CFF]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-bg-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-bg-secondary text-muted hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#7C6CFF] hover:bg-[#6856f6] text-white font-medium shadow-sm"
                >
                  {editingStudent ? 'Save Changes' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
