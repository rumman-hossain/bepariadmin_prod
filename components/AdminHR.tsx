import React, { useState, useRef } from 'react';
import { Card } from './ui/Card';
import { Users, UserPlus, UserMinus, Calendar, Activity, DollarSign, Briefcase, Search, Filter, Plus, CheckCircle, Clock, FileText, TrendingUp, Award, X, Download, Edit, Trash2, Camera, Upload } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  team: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  joinDate: string;
  salary: number;
  avatar: string;
  performanceScore: number;
  address?: string;
  mobile?: string;
  documents?: string[];
  photo?: string;
}

interface Team {
  id: string;
  name: string;
  lead: string;
  memberCount: number;
  status: 'Active' | 'Inactive';
}

interface ActivityTask {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: 'To Do' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  type: 'Individual' | 'Team';
  teamName?: string;
}

const MOCK_STAFF: StaffMember[] = [
  { id: 'EMP-001', name: 'Rahim Uddin', role: 'Operations Manager', team: 'Operations', status: 'Active', joinDate: '2022-01-15', salary: 65000, avatar: 'RU', performanceScore: 92, address: 'Dhaka, Bangladesh', mobile: '01711223344' },
  { id: 'EMP-002', name: 'Fatema Begum', role: 'HR Specialist', team: 'Human Resources', status: 'Active', joinDate: '2022-03-10', salary: 45000, avatar: 'FB', performanceScore: 88, address: 'Chittagong, Bangladesh', mobile: '01811223344' },
  { id: 'EMP-003', name: 'Karim Mia', role: 'Logistics Coordinator', team: 'Logistics', status: 'On Leave', joinDate: '2023-05-22', salary: 35000, avatar: 'KM', performanceScore: 75, address: 'Sylhet, Bangladesh', mobile: '01911223344' },
  { id: 'EMP-004', name: 'Sadia Islam', role: 'Finance Executive', team: 'Finance', status: 'Active', joinDate: '2023-08-01', salary: 50000, avatar: 'SI', performanceScore: 95, address: 'Rajshahi, Bangladesh', mobile: '01611223344' },
  { id: 'EMP-005', name: 'Tariq Rahman', role: 'Customer Support', team: 'Support', status: 'Active', joinDate: '2024-01-10', salary: 25000, avatar: 'TR', performanceScore: 82, address: 'Khulna, Bangladesh', mobile: '01511223344' },
];

const MOCK_TEAMS: Team[] = [
  { id: 'TM-01', name: 'Operations', lead: 'Rahim Uddin', memberCount: 12, status: 'Active' },
  { id: 'TM-02', name: 'Logistics', lead: 'Jalal Ahmed', memberCount: 25, status: 'Active' },
  { id: 'TM-03', name: 'Finance', lead: 'Sadia Islam', memberCount: 5, status: 'Active' },
  { id: 'TM-04', name: 'Support', lead: 'Nusrat Jahan', memberCount: 18, status: 'Active' },
];

const MOCK_ACTIVITIES: ActivityTask[] = [
  { id: 'TSK-101', title: 'Q3 Performance Reviews', assignee: 'Fatema Begum', dueDate: '2023-10-15', status: 'In Progress', priority: 'High', type: 'Individual' },
  { id: 'TSK-102', title: 'Warehouse Audit', assignee: 'Rahim Uddin', dueDate: '2023-10-20', status: 'To Do', priority: 'High', type: 'Team', teamName: 'Operations' },
  { id: 'TSK-103', title: 'Payroll Processing', assignee: 'Sadia Islam', dueDate: '2023-10-28', status: 'To Do', priority: 'Medium', type: 'Individual' },
  { id: 'TSK-104', title: 'New Hire Orientation', assignee: 'Fatema Begum', dueDate: '2023-10-05', status: 'Completed', priority: 'Medium', type: 'Individual' },
];

export const AdminHR: React.FC = () => {
  type TabType = 'Overview' | 'Staff' | 'Teams' | 'Activities' | 'Payroll';
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [staffList, setStaffList] = useState<StaffMember[]>(MOCK_STAFF);
  const [teamsList, setTeamsList] = useState<Team[]>(MOCK_TEAMS);
  const [activitiesList, setActivitiesList] = useState<ActivityTask[]>(MOCK_ACTIVITIES);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityTask | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [isViewTeamModalOpen, setIsViewTeamModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [formData, setFormData] = useState<Partial<StaffMember>>({});
  const [teamFormData, setTeamFormData] = useState<Partial<Team>>({});
  const [activityFormData, setActivityFormData] = useState<Partial<ActivityTask>>({});
  const [showAddMember, setShowAddMember] = useState(false);
  const idCardRef = useRef<HTMLDivElement>(null);

  const handleSaveStaff = () => {
    if (isEditModalOpen && selectedStaff) {
      setStaffList(staffList.map(s => s.id === selectedStaff.id ? { ...s, ...formData } as StaffMember : s));
      setSelectedStaff({ ...selectedStaff, ...formData } as StaffMember);
      setIsEditModalOpen(false);
    } else {
      const newStaff: StaffMember = {
        ...(formData as StaffMember),
        id: `EMP-${String(staffList.length + 1).padStart(3, '0')}`,
        avatar: formData.name ? formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'NA',
        performanceScore: 0,
        status: formData.status || 'Active',
        joinDate: formData.joinDate || new Date().toISOString().split('T')[0],
        salary: formData.salary || 0
      };
      setStaffList([...staffList, newStaff]);
      setIsAddModalOpen(false);
    }
    setFormData({});
  };

  const handleSaveTeam = () => {
    if (isEditTeamModalOpen && selectedTeam) {
      setTeamsList(teamsList.map(t => t.id === selectedTeam.id ? { ...t, ...teamFormData } as Team : t));
      setIsEditTeamModalOpen(false);
    } else {
      const newTeam: Team = {
        ...(teamFormData as Team),
        id: `TM-${String(teamsList.length + 1).padStart(2, '0')}`,
        memberCount: teamFormData.memberCount || 0,
        status: teamFormData.status || 'Active'
      };
      setTeamsList([...teamsList, newTeam]);
      setIsTeamModalOpen(false);
    }
    setTeamFormData({});
  };

  const handleDeleteStaff = (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      setStaffList(staffList.filter(s => s.id !== id));
      setSelectedStaff(null);
    }
  };

  const handleDeleteTeam = (id: string) => {
    if (window.confirm('Are you sure you want to delete this team?')) {
      setTeamsList(teamsList.filter(t => t.id !== id));
      if (selectedTeam?.id === id) setSelectedTeam(null);
    }
  };

  const handleSaveActivity = () => {
    if (isEditActivityModalOpen && selectedActivity) {
      setActivitiesList(activitiesList.map(a => a.id === selectedActivity.id ? { ...a, ...activityFormData } as ActivityTask : a));
      setIsEditActivityModalOpen(false);
    } else {
      const newActivity: ActivityTask = {
        ...(activityFormData as ActivityTask),
        id: `TSK-${String(activitiesList.length + 101).padStart(3, '0')}`,
        status: activityFormData.status || 'To Do',
        priority: activityFormData.priority || 'Medium',
        type: activityFormData.type || 'Individual',
        assignee: activityFormData.assignee || 'Unassigned',
        dueDate: activityFormData.dueDate || new Date().toISOString().split('T')[0]
      };
      setActivitiesList([...activitiesList, newActivity]);
      setIsActivityModalOpen(false);
    }
    setActivityFormData({});
    setSelectedActivity(null);
  };

  const handleDeleteActivity = (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      setActivitiesList(activitiesList.filter(a => a.id !== id));
      if (selectedActivity?.id === id) setSelectedActivity(null);
    }
  };

  const handleAddTeamMember = (staffId: string) => {
    if (!selectedTeam) return;
    const updatedStaffList = staffList.map(s => 
      s.id === staffId ? { ...s, team: selectedTeam.name } : s
    );
    setStaffList(updatedStaffList);
    
    setTeamsList(teamsList.map(t => 
      t.id === selectedTeam.id ? { ...t, memberCount: t.memberCount + 1 } : t
    ));
    
    setSelectedTeam({ ...selectedTeam, memberCount: selectedTeam.memberCount + 1 });
  };

  const handleRemoveTeamMember = (staffId: string) => {
    if (!selectedTeam) return;
    const updatedStaffList = staffList.map(s => 
      s.id === staffId ? { ...s, team: 'Unassigned' } : s
    );
    setStaffList(updatedStaffList);

    setTeamsList(teamsList.map(t => 
      t.id === selectedTeam.id ? { ...t, memberCount: Math.max(0, t.memberCount - 1) } : t
    ));

    setSelectedTeam({ ...selectedTeam, memberCount: Math.max(0, selectedTeam.memberCount - 1) });
  };

  const downloadIDCard = async () => {
    if (!idCardRef.current || !selectedStaff) return;
    try {
      const canvas = await html2canvas(idCardRef.current, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [54, 86]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 54, 86);
      pdf.save(`${selectedStaff.name.replace(/\s+/g, '_')}_ID_Card.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Total Employees</p>
              <h3 className="text-3xl font-bold">{staffList.length}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-100">
            <TrendingUp className="w-4 h-4" />
            <span>+{staffList.filter(s => new Date(s.joinDate).getMonth() === new Date().getMonth()).length} this month</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Active Teams</p>
              <h3 className="text-3xl font-bold">{teamsList.filter(t => t.status === 'Active').length}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-100">
            <CheckCircle className="w-4 h-4" />
            <span>All operational</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Pending Activities</p>
              <h3 className="text-3xl font-bold">{activitiesList.filter(a => a.status !== 'Completed').length}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-purple-100">
            <Clock className="w-4 h-4" />
            <span>{activitiesList.filter(a => a.priority === 'High' && a.status !== 'Completed').length} high priority</span>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-100 text-sm font-medium mb-1">Monthly Payroll</p>
              <h3 className="text-3xl font-bold">৳ 4.2M</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-100">
            <TrendingUp className="w-4 h-4" />
            <span>+2.4% vs last month</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Activities">
          <div className="space-y-4">
            {activitiesList.slice(0, 3).map(activity => (
              <div key={activity.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                    activity.status === 'In Progress' ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {activity.status === 'Completed' ? <CheckCircle className="w-5 h-5" /> :
                     activity.status === 'In Progress' ? <Activity className="w-5 h-5" /> :
                     <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-black">{activity.title}</h4>
                    <p className="text-sm text-slate-500">Assigned to: {activity.assignee}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    activity.priority === 'High' ? 'bg-red-100 text-red-700' :
                    activity.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {activity.priority}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Due: {activity.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top Performers">
          <div className="space-y-4">
            {staffList.sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 3).map(staff => (
              <div key={staff.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                    {staff.photo ? <img src={staff.photo} alt="" className="w-full h-full object-cover rounded-full" /> : staff.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-black">{staff.name}</h4>
                    <p className="text-sm text-slate-500">{staff.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-black">{staff.performanceScore}/100</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'All' || s.role === filterRole;
    const matchesStatus = filterStatus === 'All' || s.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const uniqueRoles = Array.from(new Set(staffList.map(s => s.role)));

  const renderStaffProfile = () => {
    if (!selectedStaff) return null;
    return (
      <div className="space-y-6 animate-fade-in">
        <button 
          onClick={() => setSelectedStaff(null)}
          className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 transition-colors"
        >
          &larr; Back to Staff List
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {selectedStaff.photo ? (
                      <img src={selectedStaff.photo} alt={selectedStaff.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedStaff.avatar
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-black">{selectedStaff.name}</h2>
                    <p className="text-slate-500">{selectedStaff.role} &bull; {selectedStaff.team}</p>
                    <div className="mt-2 flex gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        selectedStaff.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                        selectedStaff.status === 'On Leave' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {selectedStaff.status}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-slate-100 text-slate-700 dark:bg-charcoal-800 dark:text-slate-300">
                        ID: {selectedStaff.id}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setFormData(selectedStaff); setIsEditModalOpen(true); }}
                    className="p-2 bg-slate-100 dark:bg-charcoal-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteStaff(selectedStaff.id)}
                    className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Join Date</p>
                  <p className="font-medium text-black">{selectedStaff.joinDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Salary</p>
                  <p className="font-medium text-black font-mono">৳{selectedStaff.salary.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Performance</p>
                  <p className="font-medium text-black">{selectedStaff.performanceScore}/100</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Team</p>
                  <p className="font-medium text-black">{selectedStaff.team}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Mobile Number</p>
                  <p className="font-medium text-black">{selectedStaff.mobile || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Address</p>
                  <p className="font-medium text-black">{selectedStaff.address || 'Not provided'}</p>
                </div>
              </div>
            </Card>

            {selectedStaff.documents && selectedStaff.documents.length > 0 && (
              <Card title="Uploaded Documents">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {selectedStaff.documents.map((doc, idx) => (
                    <div key={idx} className="aspect-square rounded-xl bg-slate-50 border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(doc, '_blank')}>
                      <img src={doc} alt={`Doc ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card title="Recent Activities">
              <div className="text-center py-8 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p>No recent activities logged for this employee.</p>
              </div>
            </Card>
          </div>

          <div>
            <Card title="Employee ID Card">
              <div className="flex flex-col items-center">
                {/* ID Card Element for PDF */}
                <div 
                  ref={idCardRef}
                  className="w-[216px] h-[344px] bg-white rounded-xl overflow-hidden shadow-xl relative"
                  style={{ 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  {/* Header */}
                  <div className="h-16 bg-emerald-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent"></div>
                    <h3 className="text-white font-bold tracking-widest text-lg z-10">BEPARIBD</h3>
                  </div>
                  
                  {/* Photo */}
                  <div className="flex justify-center -mt-8 relative z-10">
                    <div className="w-20 h-20 rounded-full border-4 border-white bg-white flex items-center justify-center overflow-hidden shadow-md">
                      {selectedStaff.photo ? (
                        <img src={selectedStaff.photo} alt={selectedStaff.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl">
                          {selectedStaff.avatar}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="text-center px-4 mt-3">
                    <h4 className="font-bold text-slate-900 text-lg leading-tight">{selectedStaff.name}</h4>
                    <p className="text-emerald-600 font-semibold text-xs mt-1">{selectedStaff.role}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">{selectedStaff.team}</p>
                  </div>

                  {/* ID & Barcode area */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                    <div className="space-y-1 mb-2">
                      <div className="bg-slate-100 py-1 rounded">
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">ID Number</p>
                        <p className="font-mono font-bold text-slate-900 text-xs">{selectedStaff.id}</p>
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1 bg-slate-100 py-1 rounded">
                          <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Mobile</p>
                          <p className="font-bold text-slate-900 text-[9px]">{selectedStaff.mobile || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="bg-slate-100 py-1 rounded">
                        <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Address</p>
                        <p className="text-slate-900 text-[8px] line-clamp-1 px-1">{selectedStaff.address || 'N/A'}</p>
                      </div>
                    </div>
                    {/* Mock Barcode */}
                    <div className="flex justify-center gap-0.5 h-6 opacity-60">
                      {[...Array(24)].map((_, i) => (
                        <div key={i} className="bg-slate-800" style={{ width: Math.random() > 0.5 ? '2px' : '4px' }}></div>
                      ))}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={downloadIDCard}
                  className="mt-6 w-full px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-bold"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const renderStaff = () => {
    if (selectedStaff) return renderStaffProfile();

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search staff by name or role..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-xl transition-colors flex items-center gap-2 font-medium ${showFilters ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 'bg-white border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            <button 
              onClick={() => { setFormData({}); setIsAddModalOpen(true); }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 font-bold shadow-lg shadow-emerald-600/20"
            >
              <UserPlus className="w-4 h-4" /> Add Staff
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 bg-white rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
              <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-black"
              >
                <option value="All">All Roles</option>
                {uniqueRoles.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-black"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Role & Team</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Join Date</th>
                  <th className="px-6 py-4">Performance</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff) => (
                  <tr 
                    key={staff.id} 
                    onClick={() => setSelectedStaff(staff)}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                          {staff.photo ? (
                            <img src={staff.photo} alt={staff.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            staff.avatar
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-black">{staff.name}</div>
                          <div className="text-xs text-slate-500">{staff.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-black">{staff.role}</div>
                      <div className="text-xs text-slate-500">{staff.team}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        staff.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                        staff.status === 'On Leave' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {staff.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{staff.joinDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 max-w-[100px]">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${staff.performanceScore}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{staff.performanceScore}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFormData(staff); setIsEditModalOpen(true); }}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No staff members found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderTeams = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-black">Department Teams</h3>
        <button 
          onClick={() => { setTeamFormData({}); setIsTeamModalOpen(true); }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 font-bold shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" /> Create Team
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamsList.map(team => (
          <Card key={team.id} className="hover:border-emerald-500 transition-colors cursor-pointer group relative">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); setTeamFormData(team); setSelectedTeam(team); setIsEditTeamModalOpen(true); }}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-emerald-600 hover:border-emerald-200 shadow-sm"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-200 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div onClick={() => { setSelectedTeam(team); setIsViewTeamModalOpen(true); }}>
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                  <Users className="w-6 h-6" />
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  team.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {team.status}
                </span>
              </div>
              <h4 className="text-xl font-bold text-black mb-1">{team.name}</h4>
              <p className="text-sm text-slate-500 mb-4">Lead: <span className="font-medium text-slate-700 dark:text-slate-300">{team.lead}</span></p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(team.memberCount, 4))].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white dark:border-charcoal-900 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      U{i+1}
                    </div>
                  ))}
                  {team.memberCount > 4 && (
                    <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white dark:border-charcoal-900 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      +{team.memberCount - 4}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-emerald-600 group-hover:underline">View Details</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTeamModal = () => {
    if (!isTeamModalOpen && !isEditTeamModalOpen) return null;
    const isEdit = isEditTeamModalOpen;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-bold text-black">
              {isEdit ? 'Edit Team' : 'Create New Team'}
            </h3>
            <button 
              onClick={() => { setIsTeamModalOpen(false); setIsEditTeamModalOpen(false); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Team Name</label>
              <input 
                type="text" 
                value={teamFormData.name || ''}
                onChange={e => setTeamFormData({...teamFormData, name: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                placeholder="e.g. Operations"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Team Lead</label>
              <input 
                type="text" 
                value={teamFormData.lead || ''}
                onChange={e => setTeamFormData({...teamFormData, lead: e.target.value})}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                placeholder="e.g. Rahim Uddin"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                <select 
                  value={teamFormData.status || 'Active'}
                  onChange={e => setTeamFormData({...teamFormData, status: e.target.value as 'Active' | 'Inactive'})}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Member Count</label>
                <input 
                  type="number" 
                  min="0"
                  value={teamFormData.memberCount || 0}
                  onChange={e => setTeamFormData({...teamFormData, memberCount: Number(e.target.value)})}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                />
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button 
              onClick={() => { setIsTeamModalOpen(false); setIsEditTeamModalOpen(false); }}
              className="px-6 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveTeam}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
            >
              {isEdit ? 'Update Team' : 'Create Team'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTeamDetailsModal = () => {
    if (!isViewTeamModalOpen || !selectedTeam) return null;

    const teamMembers = staffList.filter(s => s.team === selectedTeam.name);
    const availableStaff = staffList.filter(s => s.team !== selectedTeam.name);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xl font-bold text-black">{selectedTeam.name} Team</h3>
              <p className="text-sm text-slate-500">Lead: {selectedTeam.lead}</p>
            </div>
            <button 
              onClick={() => { setIsViewTeamModalOpen(false); setShowAddMember(false); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Members</p>
                <p className="text-2xl font-bold text-black">{selectedTeam.memberCount}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Status</p>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                  selectedTeam.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {selectedTeam.status}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-black">Team Members ({teamMembers.length})</h4>
              <button 
                onClick={() => setShowAddMember(!showAddMember)}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
              >
                {showAddMember ? 'Close' : <><Plus className="w-3 h-3" /> Add Member</>}
              </button>
            </div>

            {showAddMember && (
              <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl animate-fade-in">
                <p className="text-xs font-bold text-emerald-700 uppercase mb-3">Available Staff</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {availableStaff.map(staff => (
                    <div key={staff.id} className="flex items-center justify-between p-2 bg-white border border-emerald-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                          {staff.photo ? <img src={staff.photo} alt="" className="w-full h-full object-cover" /> : staff.avatar}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-black">{staff.name}</p>
                          <p className="text-[10px] text-slate-500">{staff.role}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddTeamMember(staff.id)}
                        className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                        title="Add to team"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {availableStaff.length === 0 && (
                    <p className="text-center py-2 text-xs text-slate-500 italic">No available staff to add.</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        member.avatar
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-black">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      member.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {member.status}
                    </span>
                    <button 
                      onClick={() => handleRemoveTeamMember(member.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Remove from team"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-center py-4 text-slate-500 italic">No members assigned to this team yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActivities = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-black">Activity Planning & Monitoring</h3>
        <button 
          onClick={() => { setActivityFormData({}); setIsActivityModalOpen(true); }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 font-bold shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kanban Board Style Columns */}
        {['To Do', 'In Progress', 'Completed'].map(status => (
          <div key={status} className="bg-white/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center justify-between">
              {status}
              <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs">
                {activitiesList.filter(a => a.status === status).length}
              </span>
            </h4>
            <div className="space-y-3">
              {activitiesList.filter(a => a.status === status).map(activity => (
                <div 
                  key={activity.id} 
                  onClick={() => { setSelectedActivity(activity); setActivityFormData(activity); setIsEditActivityModalOpen(true); }}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-emerald-400 transition-all group relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        activity.priority === 'High' ? 'bg-red-100 text-red-700' :
                        activity.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {activity.priority}
                      </span>
                      {activity.type === 'Team' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> {activity.teamName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedActivity(activity); setActivityFormData(activity); setIsEditActivityModalOpen(true); }}
                        className="p-1 text-slate-400 hover:text-emerald-600"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteActivity(activity.id); }}
                        className="p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h5 className="font-bold text-black mb-2">{activity.title}</h5>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                        {activity.assignee.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-xs text-slate-500">{activity.assignee}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(activity.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderActivityModal = () => {
    if (!isActivityModalOpen && !isEditActivityModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <h3 className="text-xl font-bold text-black">{isEditActivityModalOpen ? 'Edit Task' : 'New Task'}</h3>
            <button 
              onClick={() => { setIsActivityModalOpen(false); setIsEditActivityModalOpen(false); setActivityFormData({}); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Title</label>
              <input 
                type="text"
                value={activityFormData.title || ''}
                onChange={(e) => setActivityFormData({ ...activityFormData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white text-black"
                placeholder="Enter task title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                <select 
                  value={activityFormData.type || 'Individual'}
                  onChange={(e) => setActivityFormData({ ...activityFormData, type: e.target.value as 'Individual' | 'Team' })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white text-black"
                >
                  <option value="Individual">Individual</option>
                  <option value="Team">Team</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Priority</label>
                <select 
                  value={activityFormData.priority || 'Medium'}
                  onChange={(e) => setActivityFormData({ ...activityFormData, priority: e.target.value as 'High' | 'Medium' | 'Low' })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white text-black"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            {activityFormData.type === 'Team' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Team</label>
                <select 
                  value={activityFormData.teamName || ''}
                  onChange={(e) => setActivityFormData({ ...activityFormData, teamName: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white text-black"
                >
                  <option value="">Select Team</option>
                  {teamsList.map(team => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Assignee</label>
              <select 
                value={activityFormData.assignee || ''}
                onChange={(e) => setActivityFormData({ ...activityFormData, assignee: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white text-black"
              >
                <option value="">Select Assignee</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.name}>{staff.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                <input 
                  type="date"
                  value={activityFormData.dueDate || ''}
                  onChange={(e) => setActivityFormData({ ...activityFormData, dueDate: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white text-black"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                <select 
                  value={activityFormData.status || 'To Do'}
                  onChange={(e) => setActivityFormData({ ...activityFormData, status: e.target.value as 'To Do' | 'In Progress' | 'Completed' })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all bg-white text-black"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button 
              onClick={() => { setIsActivityModalOpen(false); setIsEditActivityModalOpen(false); setActivityFormData({}); }}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-bold"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveActivity}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-bold shadow-lg shadow-emerald-600/20"
            >
              {isEditActivityModalOpen ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPayroll = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-black">Payroll & Expenses</h3>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 font-bold shadow-lg shadow-emerald-600/20">
          <FileText className="w-4 h-4" /> Generate Payslips
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Base Salary</th>
                <th className="px-6 py-4">Bonus/Deductions</th>
                <th className="px-6 py-4">Net Pay</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_STAFF.map((staff) => (
                <tr key={staff.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-black">{staff.name}</div>
                    <div className="text-xs text-slate-500">{staff.role}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300">৳{staff.salary.toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-emerald-600">+৳{(staff.salary * 0.1).toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono font-bold text-black">৳{(staff.salary * 1.1).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-amber-100 text-amber-700">
                      Pending
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-emerald-600 hover:text-emerald-700 font-bold text-sm">Process</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderAddEditModal = () => {
    if (!isAddModalOpen && !isEditModalOpen) return null;
    const isEdit = isEditModalOpen;

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, photo: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };

    const handleDocsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const newDocs: string[] = [...(formData.documents || [])];
        Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
            newDocs.push(reader.result as string);
            setFormData({ ...formData, documents: newDocs });
          };
          reader.readAsDataURL(file);
        });
      }
    };
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h3 className="text-xl font-bold text-black">
              {isEdit ? 'Edit Staff Member' : 'Add New Staff'}
            </h3>
            <button 
              onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                  {formData.photo ? (
                    <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-emerald-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase">Employee Photo</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                    <input 
                      type="text" 
                      value={formData.role || ''}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                      placeholder="e.g. Manager"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Team</label>
                    <input 
                      type="text" 
                      value={formData.team || ''}
                      onChange={e => setFormData({...formData, team: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                      placeholder="e.g. Operations"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number</label>
                  <input 
                    type="tel" 
                    value={formData.mobile || ''}
                    onChange={e => setFormData({...formData, mobile: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                    placeholder="e.g. 017XXXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select 
                      value={formData.status || 'Active'}
                      onChange={e => setFormData({...formData, status: e.target.value as 'Active' | 'On Leave' | 'Inactive'})}
                      className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Join Date</label>
                    <input 
                      type="date" 
                      value={formData.joinDate || ''}
                      onChange={e => setFormData({...formData, joinDate: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Salary (৳)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.salary || ''}
                    onChange={e => setFormData({...formData, salary: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Address</label>
                  <textarea 
                    value={formData.address || ''}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-black h-[88px] resize-none"
                    placeholder="e.g. 123 Street, Dhaka"
                  />
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Documents (NID, Certificate, etc.)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {formData.documents?.map((doc, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl bg-slate-50 border border-slate-200 overflow-hidden group">
                    <img src={doc} alt="Doc" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setFormData({ ...formData, documents: formData.documents?.filter((_, i) => i !== idx) })}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Upload</span>
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleDocsChange} />
                </label>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white/50 flex-shrink-0">
            <button 
              onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveStaff}
              disabled={!formData.name || !formData.role || !formData.team}
              className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEdit ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-black">HR Management</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage staff, teams, activities, and payroll</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'Overview', icon: Activity },
          { id: 'Staff', icon: Users },
          { id: 'Teams', icon: Briefcase },
          { id: 'Activities', icon: Calendar },
          { id: 'Payroll', icon: DollarSign }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as TabType); setSelectedStaff(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id 
              ? 'border-emerald-600 text-emerald-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.id}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Staff' && renderStaff()}
        {activeTab === 'Teams' && renderTeams()}
        {activeTab === 'Activities' && renderActivities()}
        {activeTab === 'Payroll' && renderPayroll()}
      </div>

      {renderAddEditModal()}
      {renderTeamModal()}
      {renderTeamDetailsModal()}
      {renderActivityModal()}
    </div>
  );
};
