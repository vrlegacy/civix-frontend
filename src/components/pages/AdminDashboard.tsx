import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { calculateTimeRemaining } from "@/lib/timeUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  UserPlus,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  Eye,
  Loader2,
  Download,
  FileText
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { toast } from "sonner";
import { Complaint } from "@/types";

/* ------------------------- Types & Helpers ------------------------- */

interface AdminDashboardProps {
  onNavigate: (page: "dashboard") => void;
  userName: string;
  userRole?: "admin" | "citizen";
}

interface Volunteer {
  id: string;
  name: string;
  assignedCount: number;
}

const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

const yyyymm = (d: Date | string) => {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toISOString().substring(0, 7);
};

const monthLabelFromYYYYMM = (yyyyMM: string) => {
  // cross-browser safe parsing
  const safe = new Date(`${yyyyMM}-01`);
  return isNaN(safe.getTime()) ? yyyyMM : safe.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/* ------------------------- Component ------------------------- */

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, userName, userRole = "admin" }) => {
  // Petition details dialog state (admin)
  const [petitionDetailsDialogOpen, setPetitionDetailsDialogOpen] = useState(false);
  const [selectedPetition, setSelectedPetition] = useState<any>(null);
  const [adminComment, setAdminComment] = useState("");
  const [adminCommentLoading, setAdminCommentLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [petitionComments, setPetitionComments] = useState<any[]>([]);

  // Dialog states
  const [createPollOpen, setCreatePollOpen] = useState(false);
  const [createPetitionOpen, setCreatePetitionOpen] = useState(false);
  const [pollDetailsOpen, setPollDetailsOpen] = useState(false);
  const [selectedPollDetails, setSelectedPollDetails] = useState<any>(null);
  interface PollVoteData {
    total: number;
    votes: { [option: string]: number };
  }
  
  const [pollVotes, setPollVotes] = useState<{ [key: string]: PollVoteData }>({});

  // Function to fetch votes for a poll
  const fetchPollVotes = async (pollId: string) => {
    try {
      const response = await fetch(`/api/polls/${pollId}/votes`);
      const data = await response.json();
      setPollVotes(prev => ({
        ...prev,
        [pollId]: {
          total: data.total,
          votes: data.votes
        }
      }));
    } catch (error) {
      console.error('Error fetching poll votes:', error);
      toast.error('Failed to load poll votes');
    }
  };

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchLocation, setSearchLocation] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Complaints
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<string>("");
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [detailsComplaint, setDetailsComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [petitions, setPetitions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"complaints" | "polls" | "petitions" | "reports">("complaints");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Petition assign state
  const [assignPetitionDialogOpen, setAssignPetitionDialogOpen] = useState(false);
  const [selectedPetitionToAssign, setSelectedPetitionToAssign] = useState<any>(null);
  const [selectedPetitionVolunteer, setSelectedPetitionVolunteer] = useState('');
  const [assigningPetition, setAssigningPetition] = useState(false);

  // Poll assign state
  const [assignPollDialogOpen, setAssignPollDialogOpen] = useState(false);
  const [selectedPollToAssign, setSelectedPollToAssign] = useState<any>(null);
  const [selectedPollVolunteer, setSelectedPollVolunteer] = useState('');
  const [assigningPoll, setAssigningPoll] = useState(false);

  // Real data from API
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  /* ------------------------- Effects ------------------------- */

  // Load comments when petition dialog opens
  useEffect(() => {
    if (petitionDetailsDialogOpen && selectedPetition) {
      setPetitionComments(selectedPetition.comments || []);
    }
  }, [petitionDetailsDialogOpen, selectedPetition]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchLocation.trim()), 300);
    return () => clearTimeout(t);
  }, [searchLocation]);

  // Load polls (on mount and search)
  useEffect(() => {
    const fetchPolls = async () => {
      try {
        // @ts-ignore
        const { getAllPolls } = await import("@/lib/api").then((mod) => mod.pollsAPI);
        const filters = debouncedSearch ? { target_location: debouncedSearch } : {};
        const data = await getAllPolls(filters);
        setPolls(Array.isArray(data) ? data : data.polls || []);
      } catch (err) {
        console.error("Error loading polls:", err);
      }
    };
    fetchPolls();
  }, [debouncedSearch]);

  // Load petitions (on mount and search)
  useEffect(() => {
    const fetchPetitions = async () => {
      try {
        // @ts-ignore
        const { getAllPetitions } = await import("@/lib/api").then((mod) => mod.petitionsAPI);
        const filters = debouncedSearch ? { location: debouncedSearch } : {};
        const data = await getAllPetitions(filters);
        setPetitions(Array.isArray(data) ? data : data.petitions || []);
      } catch (err) {
        console.error("Error loading petitions:", err);
      }
    };
    fetchPetitions();
  }, [debouncedSearch]);

  // Load volunteers + complaints on mount
  useEffect(() => {
    loadComplaints();
    loadVolunteers();
  }, []);

  // Reload complaints when filters change
  useEffect(() => {
    loadComplaints();
  }, [filterCategory, filterStatus]);

  /* ------------------------- Data Loaders & Actions ------------------------- */

  const loadVolunteers = async () => {
    try {
      // @ts-ignore
      const { getVolunteers } = await import("@/lib/api").then((mod) => mod.complaintsAPI);
      const res = await getVolunteers();
      if (res?.volunteers) {
        setVolunteers(
          res.volunteers.map((v: any) => ({
            id: v.id,
            name: v.name || v.email || v.id,
            assignedCount: v.assignedCount
          }))
        );
      }
    } catch (err: any) {
      console.error("Error loading volunteers:", err);
    }
  };

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterCategory && filterCategory !== "all") filters.category = filterCategory;
      if (filterStatus && filterStatus !== "all") filters.status = filterStatus;
      // @ts-ignore
      const { getAllComplaints } = await import("@/lib/api").then((mod) => mod.complaintsAPI);
      const complaintsData = await getAllComplaints(filters);
      setComplaints(Array.isArray(complaintsData) ? complaintsData : complaintsData.complaints || []);
    } catch (error: any) {
      console.error("Error loading complaints:", error);
      toast.error("Failed to load complaints. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignComplaint = async () => {
    if (!selectedComplaint || !selectedVolunteer) {
      toast.error("Please select a volunteer");
      return;
    }
    try {
      setAssigning(true);
      // @ts-ignore
      const { assignComplaint } = await import("@/lib/api").then((mod) => mod.complaintsAPI);
      await assignComplaint(selectedComplaint._id, { volunteerId: selectedVolunteer });
      toast.success("Complaint assigned successfully!");
      setAssignDialogOpen(false);
      setSelectedComplaint(null);
      setSelectedVolunteer("");
      loadComplaints();
    } catch (error: any) {
      console.error("Error assigning complaint:", error);
      toast.error(error?.response?.data?.message || "Failed to assign complaint. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignPetition = async () => {
    if (!selectedPetitionToAssign || !selectedPetitionVolunteer) {
      toast.error('Please select a volunteer');
      return;
    }
    try {
      setAssigningPetition(true);
      const { assignPetition } = await import('@/lib/api').then(mod => mod.petitionsAPI);
      await assignPetition(selectedPetitionToAssign._id, { assigned_to: selectedPetitionVolunteer });
      setPetitions(prev => prev.map(p =>
        p._id === selectedPetitionToAssign._id ? { ...p, assigned_to: selectedPetitionVolunteer } : p
      ));
      toast.success('Petition assigned successfully!');
      setAssignPetitionDialogOpen(false);
      setSelectedPetitionToAssign(null);
      setSelectedPetitionVolunteer('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign petition');
    } finally {
      setAssigningPetition(false);
    }
  };

  const handleAssignPoll = async () => {
    if (!selectedPollToAssign || !selectedPollVolunteer) {
      toast.error('Please select a volunteer');
      return;
    }
    try {
      setAssigningPoll(true);
      // @ts-ignore
      const { assignPoll } = await import('@/lib/api').then(mod => mod.pollsAPI);
      await assignPoll(selectedPollToAssign._id, { volunteerId: selectedPollVolunteer });
      setPolls(prev => prev.map(p =>
        p._id === selectedPollToAssign._id ? { ...p, assigned_to: selectedPollVolunteer } : p
      ));
      toast.success('Poll assigned successfully!');
      setAssignPollDialogOpen(false);
      setSelectedPollToAssign(null);
      setSelectedPollVolunteer('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign poll');
    } finally {
      setAssigningPoll(false);
    }
  };

  const handleResolveComplaint = async () => {
    if (!detailsComplaint) {
      toast.error("No complaint selected");
      return;
    }
    try {
      setResolving(true);
      // @ts-ignore
      const { updateComplaintStatus } = await import("@/lib/api").then((mod) => mod.complaintsAPI);
      await updateComplaintStatus(detailsComplaint._id, { status: "resolved" });
      toast.success("Complaint resolved successfully!");
      setViewDetailsDialogOpen(false);
      setDetailsComplaint(null);
      loadComplaints();
    } catch (error: any) {
      console.error("Error resolving complaint:", error);
      toast.error(error?.response?.data?.message || "Failed to resolve complaint. Please try again.");
    } finally {
      setResolving(false);
    }
  };

  const handleVotePoll = async (pollId: string) => {
    try {
      const poll = polls.find((p) => p._id === pollId);
      if (!poll) return;
      const optionIndex = 0; // demo: always first option
      // @ts-ignore
      const { vote } = await import("@/lib/api").then((mod) => mod.pollsAPI);
      await vote(pollId, optionIndex.toString());
      toast.success("Vote submitted!");
    } catch (err) {
      toast.error("Failed to vote");
    }
  };

  const handleSignPetition = async (petitionId: string) => {
    try {
      // @ts-ignore
      const { signPetition } = await import("@/lib/api").then((mod) => mod.petitionsAPI);
      await signPetition(petitionId);
      toast.success("Petition signed!");
    } catch (err) {
      toast.error("Failed to sign petition");
    }
  };

  const handleAdminComment = async () => {
    if (!adminComment.trim() || !selectedPetition) return;
    setAdminCommentLoading(true);
    try {
      // @ts-ignore
      const { commentPetition } = await import("@/lib/api").then((mod) => mod.petitionsAPI);
      const res = await commentPetition(selectedPetition._id, adminComment);
      setPetitionComments(res.comments || []);
      setAdminComment("");
      toast.success("Comment added");
    } catch (err) {
      toast.error("Failed to add comment");
    } finally {
      setAdminCommentLoading(false);
    }
  };

  const handleResolvePetition = async () => {
    if (!selectedPetition) return;
    setResolving(true);
    try {
      // @ts-ignore
      const { resolvePetition, getAllPetitions } = await import("@/lib/api").then((mod) => mod.petitionsAPI);
      await resolvePetition(selectedPetition._id, adminComment);
      toast.success("Petition resolved");
      setPetitionDetailsDialogOpen(false);
      // refresh list
      const data = await getAllPetitions();
      setPetitions(Array.isArray(data) ? data : data.petitions || []);
    } catch (err) {
      toast.error("Failed to resolve petition");
    } finally {
      setResolving(false);
    }
  };

  /* ------------------------- Derived Data ------------------------- */

  const filteredComplaints = complaints.filter((complaint) => {
    const q = debouncedSearch.toLowerCase();
    const matchesSearch =
      complaint.location.toLowerCase().includes(q) || complaint.title.toLowerCase().includes(q);
    const matchesCategory = filterCategory === "all" || complaint.category === filterCategory;
    const matchesStatus = filterStatus === "all" || complaint.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Reports filters
  const filterByLocationAndMonth = (item: any) => {
    const matchesLocation =
      selectedLocation === "all" ||
      item.location === selectedLocation ||
      item.target_location === selectedLocation;

    const matchesMonth =
      selectedMonth === "all" || yyyymm(item.createdAt) === selectedMonth;

    return matchesLocation && matchesMonth;
  };

  const reportFilteredComplaints = complaints.filter(filterByLocationAndMonth);
  const reportFilteredPolls = polls.filter(filterByLocationAndMonth);
  const reportFilteredPetitions = petitions.filter(filterByLocationAndMonth);

  const totalItems =
    reportFilteredComplaints.length + reportFilteredPolls.length + reportFilteredPetitions.length;

  const assignedComplaints = reportFilteredComplaints.filter((c) => !!c.assigned_to).length;
  const assignedPolls = reportFilteredPolls.filter((p) => !!p.assigned_to).length;
  const assignedPetitions = reportFilteredPetitions.filter((p) => !!p.assigned_to).length;

  const resolvedComplaints = reportFilteredComplaints.filter((c) => c.status === "resolved").length;
  const resolvedPolls = reportFilteredPolls.filter((p) => p.status === "completed").length;
  const resolvedPetitions = reportFilteredPetitions.filter((p) => p.status === "resolved").length;

  const totalAssigned = assignedComplaints + assignedPolls + assignedPetitions;
  const totalResolved = resolvedComplaints + resolvedPolls + resolvedPetitions;
  const totalPending = Math.max(totalItems - totalAssigned - totalResolved, 0);

  const allLocations = Array.from(
    new Set([
      ...complaints.map((c) => c.location),
      ...polls.map((p) => p.target_location),
      ...petitions.map((p) => p.location)
    ])
  )
    .filter(Boolean)
    .sort() as string[];

  const allMonths = Array.from(
    new Set([
      ...complaints.map((c) => yyyymm(c.createdAt)),
      ...polls.map((p) => yyyymm(p.createdAt)),
      ...petitions.map((p) => yyyymm(p.createdAt))
    ])
  )
    .filter(Boolean)
    .sort()
    .reverse() as string[];

  /* ------------------------- Render ------------------------- */

  return (
    <div className="max-w-7xl mx-auto py-2">
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => onNavigate("dashboard")}
          className="text-civix-dark-brown dark:text-civix-sandal hover:bg-civix-warm-beige dark:hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <h1 className="text-3xl font-bold text-civix-dark-brown dark:text-white" style={{ fontWeight: 700 }}>
          Admin Dashboard
        </h1>
      </div>

      <div className="space-y-8">
        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 mb-4">
              <Button
                variant={activeTab === "complaints" ? "default" : "outline"}
                onClick={() => setActiveTab("complaints")}
                className="flex-1"
              >
                Complaints
              </Button>
              <Button
                variant={activeTab === "polls" ? "default" : "outline"}
                onClick={() => setActiveTab("polls")}
                className="flex-1"
              >
                Polls
              </Button>
              <Button
                variant={activeTab === "petitions" ? "default" : "outline"}
                onClick={() => setActiveTab("petitions")}
                className="flex-1"
              >
                Petitions
              </Button>
              <Button
                variant={activeTab === "reports" ? "default" : "outline"}
                onClick={() => setActiveTab("reports")}
                className="flex-1"
              >
                Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* -------- Complaints Stats -------- */}
        {activeTab === "complaints" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total (optional): add a count card if you want */}
            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Total</p>
                    <p className="text-3xl text-civix-civic-green" style={{ fontWeight: 700 }}>
                      {complaints.length}
                    </p>
                  </div>
                  <div className="bg-civix-civic-green/10 dark:bg-civix-civic-green/20 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-civix-civic-green" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Received</p>
                    <p className="text-3xl text-yellow-600" style={{ fontWeight: 700 }}>
                      {complaints.filter((c) => c.status === "received").length}
                    </p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">In Review</p>
                    <p className="text-3xl text-orange-600" style={{ fontWeight: 700 }}>
                      {complaints.filter((c) => c.status === "in_review").length}
                    </p>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Resolved</p>
                    <p className="text-3xl text-green-600" style={{ fontWeight: 700 }}>
                      {complaints.filter((c) => c.status === "resolved").length}
                    </p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* -------- Polls Stats -------- */}
        {activeTab === "polls" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Total Polls</p>
                    <p className="text-3xl text-civix-civic-green" style={{ fontWeight: 700 }}>{polls.length}</p>
                  </div>
                  <div className="bg-civix-civic-green/10 dark:bg-civix-civic-green/20 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-civix-civic-green" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Pending</p>
                    <p className="text-3xl text-yellow-600" style={{ fontWeight: 700 }}>
                      {polls.filter((p) => p.status === "received" || p.status === "pending").length}
                    </p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Active</p>
                    <p className="text-3xl text-orange-600" style={{ fontWeight: 700 }}>
                      {polls.filter((p) => p.status === "active" || p.status === "in_review").length}
                    </p>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Completed</p>
                    <p className="text-3xl text-green-600" style={{ fontWeight: 700 }}>
                      {polls.filter((p) => p.status === "completed" || p.status === "resolved").length}
                    </p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* -------- Petitions Stats -------- */}
        {activeTab === "petitions" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Total Petitions</p>
                    <p className="text-3xl text-civix-civic-green" style={{ fontWeight: 700 }}>{petitions.length}</p>
                  </div>
                  <div className="bg-civix-civic-green/10 dark:bg-civix-civic-green/20 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-civix-civic-green" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Pending</p>
                    <p className="text-3xl text-yellow-600" style={{ fontWeight: 700 }}>
                      {petitions.filter((p) => p.status === "received" || p.status === "pending").length}
                    </p>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Active</p>
                    <p className="text-3xl text-orange-600" style={{ fontWeight: 700 }}>
                      {petitions.filter((p) => p.status === "active" || p.status === "in_review").length}
                    </p>
                  </div>
                  <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Completed</p>
                    <p className="text-3xl text-green-600" style={{ fontWeight: 700 }}>
                      {petitions.filter((p) => p.status === "completed" || p.status === "resolved").length}
                    </p>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* -------- Filters (per tab) -------- */}
        {activeTab === "complaints" && (
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-civix-dark-brown/50 dark:text-civix-sandal/50 w-4 h-4" />
                    <Input
                      placeholder="Search by location or title..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="pl-10 border-civix-warm-beige dark:border-gray-600"
                    />
                  </div>
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full md:w-48 border-civix-warm-beige dark:border-gray-600">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="Roads">Roads</SelectItem>
                    <SelectItem value="Environment">Environment</SelectItem>
                    <SelectItem value="Vandalism">Vandalism</SelectItem>
                    <SelectItem value="Sanitation">Sanitation</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-48 border-civix-warm-beige dark:border-gray-600">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "polls" && (
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-civix-dark-brown/50 dark:text-civix-sandal/50 w-4 h-4" />
                    <Input
                      placeholder="Search by location or title..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="pl-10 border-civix-warm-beige dark:border-gray-600"
                    />
                  </div>
                </div>
                {/* add extra poll filters here if needed */}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "petitions" && (
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-civix-dark-brown/50 dark:text-civix-sandal/50 w-4 h-4" />
                    <Input
                      placeholder="Search by location or title..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="pl-10 border-civix-warm-beige dark:border-gray-600"
                    />
                  </div>
                </div>
                {/* add extra petition filters here if needed */}
              </div>
            </CardContent>
          </Card>
        )}

        {/* -------- Complaints Table -------- */}
        {activeTab === "complaints" && (
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-civix-dark-brown dark:text-civix-sandal">All Complaints</CardTitle>
              <CardDescription className="text-civix-dark-brown/70 dark:text-civix-sandal/70">
                Manage and assign complaints to volunteers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-civix-civic-green" />
                  <span className="ml-2 text-civix-dark-brown dark:text-civix-sandal">Loading complaints...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComplaints.map((complaint) => (
                      <TableRow key={complaint._id}>
                        <TableCell className="font-medium">{complaint.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-civix-dark-brown text-civix-dark-brown dark:border-civix-sandal dark:text-civix-sandal"
                          >
                            {complaint.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1 text-civix-dark-brown/50 dark:text-civix-sandal/50" />
                            {complaint.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            switch (complaint.status) {
                              case "received":
                                return (
                                  <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Received
                                  </Badge>
                                );
                              case "in_review":
                                return (
                                  <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    In Review
                                  </Badge>
                                );
                              case "resolved":
                                return (
                                  <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Resolved
                                  </Badge>
                                );
                              default:
                                return (
                                  <Badge variant="outline" className="border-gray-500 text-gray-600 dark:text-gray-400">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Unknown
                                  </Badge>
                                );
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          {complaint.assigned_to ? (
                            <Badge className="bg-civix-civic-green text-white">
                              {typeof complaint.assigned_to === "string"
                                ? complaint.assigned_to
                                : complaint.assigned_to.name || "Volunteer"}
                            </Badge>
                          ) : (
                            <span className="text-civix-dark-brown/50 dark:text-civix-sandal/50">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1 text-civix-dark-brown/50 dark:text-civix-sandal/50" />
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDetailsComplaint(complaint);
                                setViewDetailsDialogOpen(true);
                              }}
                              className="border-civix-civic-green text-civix-civic-green hover:bg-civix-civic-green hover:text-white"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            {!complaint.assigned_to && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setSelectedComplaint(complaint);
                                  setAssignDialogOpen(true);
                                }}
                                className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white"
                              >
                                <UserPlus className="w-3 h-3 mr-1" />
                                Assign
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* -------- Polls Table -------- */}
        {activeTab === "polls" && (
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-civix-dark-brown dark:text-civix-sandal">All Polls</CardTitle>
                  <CardDescription className="text-civix-dark-brown/70 dark:text-civix-sandal/70">
                    View all submitted polls
                  </CardDescription>
                </div>
                <Button onClick={() => setCreatePollOpen(true)} className="bg-civix-civic-green text-white">
                  Create Poll
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {polls.map((poll) => (
                    <TableRow key={poll._id}>
                      <TableCell>{poll.title}</TableCell>
                      <TableCell>{poll.category}</TableCell>
                      <TableCell>{poll.target_location}</TableCell>
                      <TableCell>{poll.duration} hr</TableCell>
                      <TableCell>{poll.status || "active"}</TableCell>
                      <TableCell>
                        {poll.assigned_to ? (
                          <Badge className="bg-civix-civic-green text-white">
                            {volunteers.find(v => v.id === poll.assigned_to)?.name || 'Assigned'}
                          </Badge>
                        ) : (
                          <span className="text-civix-dark-brown/50 dark:text-civix-sandal/50">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>{poll.createdAt ? new Date(poll.createdAt).toLocaleDateString() : ""}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            type="button"
                            onClick={() => {
                              setSelectedPollDetails(poll);
                              setPollDetailsOpen(true);
                              fetchPollVotes(poll._id);
                            }}
                            className="border-civix-civic-green text-civix-civic-green hover:bg-civix-civic-green hover:text-white"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          {!poll.assigned_to && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => { setSelectedPollToAssign(poll); setAssignPollDialogOpen(true); }}
                              className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              Assign
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Poll Details Dialog */}
        <Dialog open={pollDetailsOpen} onOpenChange={setPollDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 p-0">
            {selectedPollDetails && (
              <>
                <div className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green p-6 rounded-t-lg">
                  <h2 className="text-xl font-bold text-white mb-2">{selectedPollDetails.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{selectedPollDetails.category}</span>
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{selectedPollDetails.status || 'active'}</span>
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{selectedPollDetails.target_location}
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                    <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-civix-dark-brown dark:text-civix-sandal">{selectedPollDetails.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                      <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Target Authority</p>
                      <p className="text-civix-dark-brown dark:text-civix-sandal">{selectedPollDetails.targetAuthority || '—'}</p>
                    </div>
                    <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                      <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Duration</p>
                      <p className="text-civix-dark-brown dark:text-civix-sandal">{selectedPollDetails.duration} hours</p>
                    </div>
                    <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                      <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Time Remaining</p>
                      <Badge variant="outline" className="border-civix-civic-green text-civix-civic-green">
                        {calculateTimeRemaining(selectedPollDetails.createdAt, selectedPollDetails.duration)}
                      </Badge>
                    </div>
                    <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                      <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Created</p>
                      <p className="text-civix-dark-brown dark:text-civix-sandal">{new Date(selectedPollDetails.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                    <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-3">Options & Votes</p>
                    <div className="space-y-3">
                      {selectedPollDetails.options.map((option: string, index: number) => {
                        const pollData = pollVotes[selectedPollDetails._id];
                        const votes = pollData?.votes[option] || 0;
                        const totalVotes = pollData?.total || 0;
                        const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0';
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-civix-civic-green/20 text-civix-civic-green text-xs font-bold rounded-full flex items-center justify-center">{index + 1}</span>
                                <span className="text-civix-dark-brown dark:text-civix-sandal">{option}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">
                                <span>{votes} votes</span>
                                <span className="font-semibold">{percentage}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-sm font-semibold text-civix-dark-brown dark:text-civix-sandal mt-2">
                        Total Votes: {pollVotes[selectedPollDetails._id]?.total || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setPollDetailsOpen(false)}
                      className="border-civix-warm-beige dark:border-gray-600"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* -------- Petitions Table -------- */}
        {activeTab === "petitions" && (
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-civix-dark-brown dark:text-civix-sandal">All Petitions</CardTitle>
                  <CardDescription className="text-civix-dark-brown/70 dark:text-civix-sandal/70">
                    View all submitted petitions
                  </CardDescription>
                </div>
                <Button onClick={() => setCreatePetitionOpen(true)} className="bg-civix-civic-green text-white">
                  Create Petition
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                     <TableHead>Assign to Volunteer</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {petitions.map((petition) => (
                    <TableRow key={petition._id}>
                      <TableCell>{petition.title}</TableCell>
                      <TableCell>{petition.category}</TableCell>
                      <TableCell>{petition.location}</TableCell>
                      <TableCell>{petition.status}</TableCell>
                      <TableCell>{petition.createdAt ? new Date(petition.createdAt).toLocaleDateString() : ""}</TableCell>
                       <TableCell>
                         {petition.assigned_to ? (
                           <div className="flex items-center space-x-2">
                             <Badge className="bg-civix-civic-green text-white">Assigned</Badge>
                             <span className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">
                               {volunteers.find(v => v.id === petition.assigned_to)?.name || 'Unknown'}
                             </span>
                           </div>
                         ) : (
                           <Button
                             type="button"
                             size="sm"
                             onClick={() => { setSelectedPetitionToAssign(petition); setAssignPetitionDialogOpen(true); }}
                             className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white"
                           >
                             <UserPlus className="w-3 h-3 mr-1" />
                             Assign
                           </Button>
                         )}
                        </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setSelectedPetition(petition);
                            setPetitionDetailsDialogOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                        {userRole === "citizen" && (
                          <Button size="sm" type="button" className="ml-2" onClick={() => handleSignPetition(petition._id)}>
                            Sign
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* -------- Reports -------- */}
        {activeTab === "reports" && (
          <div id="reports-wrapper" className="relative">
            <div id="reports-content" className="space-y-6">
              {/* First Row - Totals */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Total Items</p>
                    <p className="text-3xl text-civix-civic-green" style={{ fontWeight: 700 }}>
                      {complaints.length + polls.length + petitions.length}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Total Complaints</p>
                    <p className="text-3xl text-blue-600" style={{ fontWeight: 700 }}>
                      {complaints.length}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Total Polls</p>
                    <p className="text-3xl text-purple-600" style={{ fontWeight: 700 }}>
                      {polls.length}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Total Petitions</p>
                    <p className="text-3xl text-orange-600" style={{ fontWeight: 700 }}>
                      {petitions.length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row - Assigned */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Total Assigned</p>
                    <p className="text-3xl text-civix-civic-green" style={{ fontWeight: 700 }}>
                      {complaints.filter((c) => c.assigned_to).length +
                        polls.filter((p) => p.assigned_to).length +
                        petitions.filter((p) => p.assigned_to).length}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Complaints Assigned</p>
                    <p className="text-3xl text-blue-600" style={{ fontWeight: 700 }}>
                      {complaints.filter((c) => c.assigned_to).length}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Polls Assigned</p>
                    <p className="text-3xl text-purple-600" style={{ fontWeight: 700 }}>
                      {polls.filter((p) => p.assigned_to).length}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Petitions Assigned</p>
                    <p className="text-3xl text-orange-600" style={{ fontWeight: 700 }}>
                      {petitions.filter((p) => p.assigned_to).length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Third Row - Resolved */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Total Resolved</p>
                    <p className="text-3xl text-civix-civic-green" style={{ fontWeight: 700 }}>
                      {complaints.filter((c) => c.status === "resolved").length +
                        polls.filter((p) => p.status === "completed").length +
                        petitions.filter((p) => p.status === "resolved").length}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Complaints Resolved</p>
                    <p className="text-3xl text-blue-600" style={{ fontWeight: 700 }}>
                      {complaints.filter((c) => c.status === "resolved").length}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Polls Resolved</p>
                    <p className="text-3xl text-purple-600" style={{ fontWeight: 700 }}>
                      {polls.filter((p) => p.status === "completed").length}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-1">Petitions Resolved</p>
                    <p className="text-3xl text-orange-600" style={{ fontWeight: 700 }}>
                      {petitions.filter((p) => p.status === "resolved").length}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters Card */}
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg mb-6">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="location-filter" className="text-sm font-medium mb-2 block">
                        Filter by Location
                      </Label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger className="w-full md:w-[200px] border-civix-warm-beige dark:border-gray-600">
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {allLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Label htmlFor="month-filter" className="text-sm font-medium mb-2 block">
                        Filter by Month
                      </Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-full md:w-[200px] border-civix-warm-beige dark:border-gray-600">
                          <SelectValue placeholder="All Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          {allMonths.map((m) => (
                            <SelectItem key={m} value={m}>
                              {monthLabelFromYYYYMM(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Items Chart (progress bars) */}
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg p-6">
                <CardTitle className="mb-6">Total Items Distribution</CardTitle>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm">Complaints</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className="h-2 bg-blue-600 rounded"
                        style={{ width: `${pct(reportFilteredComplaints.length, totalItems)}%` }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right">{reportFilteredComplaints.length}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm">Polls</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className="h-2 bg-purple-600 rounded"
                        style={{ width: `${pct(reportFilteredPolls.length, totalItems)}%` }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right">{reportFilteredPolls.length}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm">Petitions</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className="h-2 bg-orange-600 rounded"
                        style={{ width: `${pct(reportFilteredPetitions.length, totalItems)}%` }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right">{reportFilteredPetitions.length}</span>
                  </div>
                </div>
              </Card>

              {/* Assigned Items Chart */}
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg p-6">
                <CardTitle className="mb-6">Assigned Items Distribution</CardTitle>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm">Complaints</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className="h-2 bg-blue-600 rounded"
                        style={{
                          width: `${pct(assignedComplaints, reportFilteredComplaints.length)}%`
                        }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right">{assignedComplaints}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm">Polls</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className="h-2 bg-purple-600 rounded"
                        style={{
                          width: `${pct(assignedPolls, reportFilteredPolls.length)}%`
                        }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right">{assignedPolls}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm">Petitions</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className="h-2 bg-orange-600 rounded"
                        style={{
                          width: `${pct(assignedPetitions, reportFilteredPetitions.length)}%`
                        }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right">{assignedPetitions}</span>
                  </div>
                </div>
              </Card>

              {/* Resolved Items Chart */}
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg p-6">
                <CardTitle className="mb-6">Resolved Items Distribution</CardTitle>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm">Complaints</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className="h-2 bg-blue-600 rounded"
                        style={{
                          width: `${pct(resolvedComplaints, reportFilteredComplaints.length)}%`
                        }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right">{resolvedComplaints}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm">Polls</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className="h-2 bg-purple-600 rounded"
                        style={{
                          width: `${pct(resolvedPolls, reportFilteredPolls.length)}%`
                        }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right">{resolvedPolls}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-24 text-sm">Petitions</span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                      <div
                        className="h-2 bg-orange-600 rounded"
                        style={{
                          width: `${pct(resolvedPetitions, reportFilteredPetitions.length)}%`
                        }}
                      />
                    </div>
                    <span className="w-12 text-sm text-right">{resolvedPetitions}</span>
                  </div>
                </div>
              </Card>

              {/* Pie Chart */}
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg p-8">
                <CardTitle className="mb-8 text-xl">Status Distribution</CardTitle>
                <div className="w-full h-[450px] flex items-center justify-center">
                  <PieChart width={600} height={450}>
                    <Pie
                      data={[
                        { name: "Assigned", value: totalAssigned },
                        { name: "Resolved", value: totalResolved },
                        { name: "Pending", value: totalPending }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${isFinite(percent) ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={180}
                      dataKey="value"
                    >
                      <Cell fill="#2563eb" /> {/* Assigned - blue */}
                      <Cell fill="#16a34a" /> {/* Resolved - green */}
                      <Cell fill="#ca8a04" /> {/* Pending - yellow */}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </div>
              </Card>
            </div>

            {/* Floating export buttons */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
              <Button
                type="button"
                onClick={() => {
                  const data = [
                    ["Category", "Total", "Assigned", "Resolved"],
                    [
                      "Complaints",
                      reportFilteredComplaints.length,
                      assignedComplaints,
                      resolvedComplaints
                    ],
                    [
                      "Polls",
                      reportFilteredPolls.length,
                      assignedPolls,
                      resolvedPolls
                    ],
                    [
                      "Petitions",
                      reportFilteredPetitions.length,
                      assignedPetitions,
                      resolvedPetitions
                    ]
                  ];
                  const csvContent = data.map((row) => row.join(",")).join("\n");
                  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
                  saveAs(blob, `civix_report_${new Date().toISOString().split("T")[0]}.csv`);
                  toast.success("Report exported as CSV");
                }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 text-civix-dark-brown dark:text-civix-sandal shadow-lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>

              <Button
                type="button"
                onClick={() => {
                  const element = document.getElementById("reports-content");
                  if (element) {
                    const opt = {
                      margin: 0.5,
                      filename: `civix_report_${new Date().toISOString().split("T")[0]}.pdf`,
                      image: { type: "jpeg", quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { 
                        unit: "in", 
                        format: "letter", 
                        orientation: "landscape",
                        hotfixes: ["px_scaling"]
                      }
                    };
                    // @ts-ignore
                    html2pdf().set(opt as any).from(element).save();
                    toast.success("Report exported as PDF");
                  }
                }}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 text-civix-dark-brown dark:text-civix-sandal shadow-lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- All Dialogs live OUTSIDE tables ----------------- */}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-civix-dark-brown dark:text-civix-sandal">Assign Complaint</DialogTitle>
            <DialogDescription className="text-civix-dark-brown/70 dark:text-civix-sandal/70">
              Select a volunteer to assign this complaint to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-civix-dark-brown dark:text-civix-sandal">Complaint</Label>
              <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mt-1">
                {selectedComplaint?.title}
              </p>
            </div>
            <div>
              <Label className="text-civix-dark-brown dark:text-civix-sandal">Select Volunteer</Label>
              <Select value={selectedVolunteer} onValueChange={setSelectedVolunteer}>
                <SelectTrigger className="mt-2 border-civix-warm-beige dark:border-gray-600">
                  <SelectValue placeholder="Choose a volunteer" />
                </SelectTrigger>
                <SelectContent>
                  {volunteers.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.assignedCount} assigned)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedComplaint(null);
                setSelectedVolunteer("");
              }}
              className="border-civix-warm-beige dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssignComplaint}
              disabled={assigning}
              className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Complaint"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Complaint Details Dialog */}
      <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          {detailsComplaint && (
            <>
              {/* Gradient Header */}
              <div className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green p-6 rounded-t-lg">
                <h2 className="text-xl font-bold text-white mb-2">{detailsComplaint.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{detailsComplaint.category}</span>
                  {(() => {
                    switch (detailsComplaint.status) {
                      case 'received': return <span className="bg-yellow-400/30 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />Received</span>;
                      case 'in_review': return <span className="bg-orange-400/30 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" />In Review</span>;
                      case 'resolved': return <span className="bg-green-400/30 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" />Resolved</span>;
                      default: return <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">Unknown</span>;
                    }
                  })()}
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Description */}
                <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                  <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-civix-dark-brown dark:text-civix-sandal">{detailsComplaint.description}</p>
                </div>

                {/* Location + Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                    <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Location</p>
                    <div className="flex items-center gap-1 text-civix-dark-brown dark:text-civix-sandal">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      {detailsComplaint.location}
                    </div>
                  </div>
                  <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                    <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Submitted</p>
                    <div className="flex items-center gap-1 text-civix-dark-brown dark:text-civix-sandal">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(detailsComplaint.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Photo */}
                {detailsComplaint.photo_url && (
                  <div className="rounded-lg overflow-hidden border border-civix-warm-beige dark:border-gray-600">
                    <img
                      src={detailsComplaint.photo_url}
                      alt={detailsComplaint.title}
                      loading="lazy"
                      className="w-full h-52 object-cover"
                    />
                  </div>
                )}

                {/* Assigned To */}
                {detailsComplaint.assigned_to && (
                  <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                    <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Assigned To</p>
                    <Badge className="bg-civix-civic-green text-white">
                      {typeof detailsComplaint.assigned_to === 'string'
                        ? detailsComplaint.assigned_to
                        : detailsComplaint.assigned_to.name || 'Volunteer'}
                    </Badge>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    onClick={() => setViewDetailsDialogOpen(false)}
                    variant="outline"
                    className="border-civix-warm-beige dark:border-gray-600"
                  >
                    Close
                  </Button>
                  {detailsComplaint.status !== 'resolved' && (
                    <Button
                      type="button"
                      onClick={handleResolveComplaint}
                      disabled={resolving}
                      className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white"
                    >
                      {resolving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resolving...</>
                      ) : (
                        <><CheckCircle className="w-4 h-4 mr-2" />Resolve Complaint</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Petition Details Dialog */}
      <Dialog open={petitionDetailsDialogOpen} onOpenChange={setPetitionDetailsDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          {selectedPetition && (
            <>
              {/* Gradient Header */}
              <div className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green p-6 rounded-t-lg">
                <h2 className="text-xl font-bold text-white mb-2">{selectedPetition.title}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{selectedPetition.category}</span>
                  <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{selectedPetition.status}</span>
                  {selectedPetition.location && (
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{selectedPetition.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Description */}
                <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                  <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-civix-dark-brown dark:text-civix-sandal">{selectedPetition.description}</p>
                </div>

                {/* Date */}
                <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                  <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-1">Submitted</p>
                  <div className="flex items-center gap-1 text-civix-dark-brown dark:text-civix-sandal">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedPetition.createdAt ? new Date(selectedPetition.createdAt).toLocaleDateString() : '—'}
                  </div>
                </div>

                {/* Comments */}
                <div className="bg-civix-warm-beige/30 dark:bg-gray-700/30 rounded-lg p-4">
                  <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-2">Comments</p>
                  <div className="space-y-2 mb-3">
                    {petitionComments.length === 0 && (
                      <p className="text-civix-dark-brown/50 dark:text-civix-sandal/50 text-sm">No comments yet.</p>
                    )}
                    {petitionComments.map((c, idx) => (
                      <div key={idx} className="bg-white/60 dark:bg-gray-600/60 rounded-lg p-3">
                        <span className="font-semibold text-civix-dark-brown dark:text-civix-sandal text-sm">{c.by?.name || c.by || 'User'}: </span>
                        <span className="text-civix-dark-brown/80 dark:text-civix-sandal/80 text-sm">{c.text}</span>
                        <span className="ml-2 text-xs text-civix-dark-brown/50 dark:text-civix-sandal/50">{c.at ? new Date(c.at).toLocaleString() : ''}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      disabled={adminCommentLoading || resolving}
                      className="border-civix-warm-beige dark:border-gray-600"
                    />
                    <Button
                      type="button"
                      onClick={handleAdminComment}
                      disabled={adminCommentLoading || !adminComment.trim()}
                      className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white"
                    >
                      {adminCommentLoading ? 'Posting...' : 'Post'}
                    </Button>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPetitionDetailsDialogOpen(false)}
                    className="border-civix-warm-beige dark:border-gray-600"
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={handleResolvePetition}
                    disabled={resolving || !selectedPetition}
                    className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white"
                  >
                    {resolving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resolving...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4 mr-2" />Resolve Petition</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Poll Dialog */}
      <Dialog open={createPollOpen} onOpenChange={setCreatePollOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-civix-dark-brown dark:text-civix-sandal">Create Poll</DialogTitle>
          </DialogHeader>
          {createPollOpen && (
            <React.Suspense fallback={<div>Loading...</div>}>
              {React.createElement(
                React.lazy(() =>
                  import("./PollComponents").then((mod) => ({ default: mod.CreatePollForm }))
                ),
                {
                  onClose: () => setCreatePollOpen(false),
                  onPollCreated: async () => {
                    try {
                      // @ts-ignore
                      const { getAllPolls } = await import("@/lib/api").then((mod) => mod.pollsAPI);
                      const data = await getAllPolls();
                      setPolls(Array.isArray(data) ? data : data.polls || []);
                    } catch (err) {
                      toast.error("Failed to reload polls");
                    }
                  }
                }
              )}
            </React.Suspense>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Petition Dialog */}
      <Dialog open={createPetitionOpen} onOpenChange={setCreatePetitionOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-civix-dark-brown dark:text-civix-sandal">Create Petition</DialogTitle>
          </DialogHeader>
          {createPetitionOpen && (
            <React.Suspense fallback={<div>Loading...</div>}>
              {React.createElement(
                React.lazy(() =>
                  import("./PetitionComponents").then((mod) => ({ default: mod.CreatePetitionForm }))
                ),
                {
                  onClose: () => setCreatePetitionOpen(false),
                  onPetitionCreated: async () => {
                    try {
                      // @ts-ignore
                      const { getAllPetitions } = await import("@/lib/api").then((mod) => mod.petitionsAPI);
                      const data = await getAllPetitions();
                      setPetitions(Array.isArray(data) ? data : data.petitions || []);
                    } catch (err) {
                      toast.error("Failed to reload petitions");
                    }
                  }
                }
              )}
            </React.Suspense>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Petition Dialog */}
      <Dialog open={assignPetitionDialogOpen} onOpenChange={(open) => {
        setAssignPetitionDialogOpen(open);
        if (!open) { setSelectedPetitionToAssign(null); setSelectedPetitionVolunteer(''); }
      }}>
        <DialogContent className="bg-white dark:bg-gray-800 max-w-md p-0">
          <div className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green p-6 rounded-t-lg">
            <h2 className="text-lg font-bold text-white mb-1">Assign Petition</h2>
            {selectedPetitionToAssign && (
              <p className="text-white/80 text-sm truncate">{selectedPetitionToAssign.title}</p>
            )}
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-2">Select Volunteer</p>
              <Select value={selectedPetitionVolunteer} onValueChange={setSelectedPetitionVolunteer}>
                <SelectTrigger className="border-civix-warm-beige dark:border-gray-600">
                  <SelectValue placeholder="Choose a volunteer..." />
                </SelectTrigger>
                <SelectContent>
                  {volunteers.map((vol) => (
                    <SelectItem key={vol.id} value={vol.id}>{vol.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => { setAssignPetitionDialogOpen(false); setSelectedPetitionToAssign(null); setSelectedPetitionVolunteer(''); }}
                className="border-civix-warm-beige dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignPetition}
                disabled={!selectedPetitionVolunteer || assigningPetition}
                className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white"
              >
                {assigningPetition ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" />Assign Petition</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Poll Dialog */}
      <Dialog open={assignPollDialogOpen} onOpenChange={(open) => {
        setAssignPollDialogOpen(open);
        if (!open) { setSelectedPollToAssign(null); setSelectedPollVolunteer(''); }
      }}>
        <DialogContent className="bg-white dark:bg-gray-800 max-w-md p-0">
          <div className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green p-6 rounded-t-lg">
            <h2 className="text-lg font-bold text-white mb-1">Assign Poll</h2>
            {selectedPollToAssign && (
              <p className="text-white/80 text-sm truncate">{selectedPollToAssign.title}</p>
            )}
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-civix-dark-brown/60 dark:text-civix-sandal/60 uppercase tracking-wider mb-2">Select Volunteer</p>
              <Select value={selectedPollVolunteer} onValueChange={setSelectedPollVolunteer}>
                <SelectTrigger className="border-civix-warm-beige dark:border-gray-600">
                  <SelectValue placeholder="Choose a volunteer..." />
                </SelectTrigger>
                <SelectContent>
                  {volunteers.map((vol) => (
                    <SelectItem key={vol.id} value={vol.id}>{vol.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => { setAssignPollDialogOpen(false); setSelectedPollToAssign(null); setSelectedPollVolunteer(''); }}
                className="border-civix-warm-beige dark:border-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignPoll}
                disabled={!selectedPollVolunteer || assigningPoll}
                className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white"
              >
                {assigningPoll ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" />Assign Poll</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>

  );
};

export default AdminDashboard;
