import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  MapPin, 
  FileText, 
  CheckCircle, 
  Clock,
  Plus,
  Loader2,
  Calendar,
  Search,
  Share2,
  Eye,
  TrendingUp,
  Target,
  Vote,
  X,
  PieChart
} from "lucide-react";
import { toast } from "sonner";
import { pollsAPI } from "@/lib/api";
import { Page } from "@/types";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface PollsModuleProps {
  onNavigate: (page: Page, itemId?: string) => void;
  selectedItemId?: string | null;
  userName: string;
}

interface PollWithResults {
  _id: string;
  title: string;
  description: string;
  category: string;
  options: string[];
  duration: number;
  target_location: string;
  targetAuthority: string;
  createdAt: string;
  created_by?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  } | string;
  results?: {
    counts: Record<string, number>;
    percentages: Record<string, number>;
    total: number;
    userVote?: string;
  } | null;
}

const isPollExpired = (poll: PollWithResults): boolean => {
  if (!poll.createdAt || !poll.duration) return false;
  const createdAt = new Date(poll.createdAt);
  const expiresAt = new Date(createdAt.getTime() + (poll.duration * 60 * 60 * 1000));
  return new Date() > expiresAt;
};

const getTimeRemaining = (poll: PollWithResults): string => {
  if (!poll.createdAt || !poll.duration) return 'Unknown duration';
  const createdAt = new Date(poll.createdAt);
  const expiresAt = new Date(createdAt.getTime() + (poll.duration * 60 * 60 * 1000));
  const now = new Date();
  
  if (now > expiresAt) return 'Expired';
  
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHrs > 24) {
    const days = Math.floor(diffHrs / 24);
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  }
  if (diffHrs > 0) {
    return `${diffHrs}h ${diffMins}m remaining`;
  }
  return `${diffMins} minutes remaining`;
};

export default function PollsModule({ onNavigate, selectedItemId, userName }: PollsModuleProps) {
  const [view, setView] = useState<'my' | 'all' | 'new'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedPoll, setSelectedPoll] = useState<PollWithResults | null>(null);
  const [polls, setPolls] = useState<PollWithResults[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form states for new poll
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [duration, setDuration] = useState("72"); // Default 3 days (72 hours)
  const [targetLocation, setTargetLocation] = useState("");
  const [targetAuthority, setTargetAuthority] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  const currentUserId = (() => {
    try {
      const s = localStorage.getItem('user');
      if (!s) return null;
      const parsed = JSON.parse(s);
      return parsed?._id || parsed?.id || null;
    } catch (e) {
      return null;
    }
  })();

  const categories = [
    'Community Development',
    'Infrastructure',
    'Environment',
    'Education',
    'Public Safety',
    'Local Events',
    'Other'
  ];

  useEffect(() => {
    reloadPolls();
  }, []);

  const reloadPolls = async () => {
    try {
      setLoading(true);
      const data = await pollsAPI.getPolls();
      if (Array.isArray(data)) {
        const pollsWithResults = await Promise.all(
          data.map(async (p: any) => {
            try {
              const results = await pollsAPI.getPollResults(p._id);
              return { ...p, results };
            } catch (err) {
              return { ...p, results: null };
            }
          })
        );
        setPolls(pollsWithResults);
      }
    } catch (err) {
      console.error('Error loading polls:', err);
      toast.error('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPoll = (poll: PollWithResults) => {
    setSelectedPoll(poll);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPoll(null);
  };

  const handleVote = async (pollId: string, selectedOption: string) => {
    try {
      await pollsAPI.vote(pollId, selectedOption);
      toast.success('Vote recorded successfully');
      
      // Refresh logic
      const data = await pollsAPI.getPolls();
      if (Array.isArray(data)) {
        const pollsWithResults = await Promise.all(
          data.map(async (p: any) => {
            try {
              const results = await pollsAPI.getPollResults(p._id);
              return { ...p, results };
            } catch (err) {
              return { ...p, results: null };
            }
          })
        );
        setPolls(pollsWithResults);
        
        // Update selected poll detail if open
        const updatedSelected = pollsWithResults.find(p => p._id === pollId);
        if (updatedSelected) {
          setSelectedPoll(updatedSelected);
        }
      }
    } catch (error: any) {
      console.error('Error voting:', error);
      if (error?.response?.status === 409) {
        toast.error(error.response.data?.message || 'You have already voted');
      } else if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to record vote');
      }
    }
  };

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions(prev => [...prev, ""]);
    } else {
      toast.warning("Maximum of 5 options allowed");
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    setOptions(prev => prev.map((opt, i) => i === index ? val : opt));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !category || !targetLocation.trim() || !targetAuthority.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const durationHrs = parseInt(duration);
    if (isNaN(durationHrs) || durationHrs < 1) {
      toast.error('Duration must be at least 1 hour');
      return;
    }

    const validOptions = options.filter(opt => opt.trim() !== "");
    if (validOptions.length < 2) {
      toast.error('At least two options are required');
      return;
    }

    try {
      setSubmitting(true);
      
      const payload: any = {
        title,
        description,
        category,
        duration: durationHrs,
        target_location: targetLocation.trim(),
        targetAuthority: targetAuthority.trim(),
        options: validOptions
      };

      if (latitude && longitude) {
        payload.latitude = parseFloat(latitude);
        payload.longitude = parseFloat(longitude);
      }

      await pollsAPI.createPoll(payload);
      toast.success('Poll created successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setDuration('72');
      setTargetLocation('');
      setTargetAuthority('');
      setLatitude('');
      setLongitude('');
      setOptions(["", ""]);
      
      await reloadPolls();
      setView('all');
    } catch (err: any) {
      console.error('Error creating poll:', err);
      const msg = err.response?.data?.errors && Array.isArray(err.response.data.errors)
        ? err.response.data.errors.map((e: any) => e.msg || e.message).join(', ')
        : err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create poll. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPolls = polls.filter(p => {
    if (!p) return false;
    
    // Tab view filter
    if (view === 'my') {
      const creatorId = typeof p.created_by === 'object' ? p.created_by?._id : p.created_by;
      if (creatorId !== currentUserId) return false;
    }

    // Search query filter
    const matchesSearch = (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Category filter
    if (filterCategory !== 'all') {
      if ((p.category || "").toLowerCase() !== filterCategory.toLowerCase()) return false;
    }

    // Status filter
    if (filterStatus !== 'all') {
      const expired = isPollExpired(p);
      if (filterStatus === 'active' && expired) return false;
      if (filterStatus === 'closed' && !expired) return false;
      if (filterStatus === 'voted' && p.results?.userVote === undefined) return false;
    }

    return true;
  });

  // --- DETAIL VIEW ---
  const PollDetail = ({ poll }: { poll: PollWithResults }) => {
    const hasVoted = poll.results?.userVote !== undefined;
    const expired = isPollExpired(poll);
    const totalVotes = poll.results?.total ?? 0;
    
    const chartData = poll.options.map(option => ({
      name: option,
      value: poll.results?.counts?.[option] ?? 0
    }));

    const COLORS = ['#4CAF50', '#5A3825', '#F5DEB3', '#EAD8C0', '#8c9c8a'];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={handleBackToList}
            className="text-civix-dark-brown dark:text-civix-sandal hover:bg-civix-warm-beige dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Polls List
          </Button>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={async () => {
                try {
                  const url = `${window.location.origin}/polls/${poll._id}`;
                  await navigator.clipboard.writeText(url);
                  toast.success('Poll link copied to clipboard');
                } catch (err) {
                  toast.error('Failed to copy link');
                }
              }}
              className="border-civix-warm-beige dark:border-gray-600 text-civix-dark-brown dark:text-civix-sandal"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-8">
            <div className="space-y-8">
              <div>
                <div className="flex items-center space-x-3 mb-4 flex-wrap gap-2">
                  <h2 className="text-3xl font-bold text-civix-dark-brown dark:text-white">
                    {poll.title}
                  </h2>
                  {expired ? (
                    <Badge variant="outline" className="border-red-500 text-red-500">Expired</Badge>
                  ) : (
                    <Badge className="bg-civix-civic-green text-white"><Clock className="w-3.5 h-3.5 mr-1" />{getTimeRemaining(poll)}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-6">
                  <Badge variant="outline" className="border-civix-dark-brown text-civix-dark-brown dark:border-civix-sandal dark:text-civix-sandal">{poll.category}</Badge>
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-red-500" />{poll.target_location}</span>
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" />Created: {new Date(poll.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center"><Target className="w-4 h-4 mr-1" />Authority: {poll.targetAuthority}</span>
                </div>
              </div>
              
              <Separator />

              <div>
                <h3 className="text-xl font-semibold text-civix-dark-brown dark:text-civix-sandal mb-3">Description</h3>
                <p className="text-civix-dark-brown/80 dark:text-civix-sandal/80 leading-relaxed whitespace-pre-wrap">{poll.description}</p>
              </div>

              <Separator />

              {/* Voting Options */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-civix-dark-brown dark:text-civix-sandal">
                  {hasVoted || expired ? "Poll Results" : "Cast Your Vote"}
                </h3>

                {!(hasVoted || expired) ? (
                  <div className="space-y-3 max-w-xl">
                    {poll.options.map((option, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="w-full justify-start p-4 h-auto text-left border-civix-warm-beige dark:border-gray-600 hover:bg-civix-warm-beige/35 dark:hover:bg-gray-700 text-civix-dark-brown dark:text-civix-sandal font-medium"
                        onClick={() => handleVote(poll._id, option)}
                      >
                        <Vote className="w-4 h-4 mr-3 text-civix-civic-green" />
                        {option}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      {poll.options.map((option, index) => {
                        const count = poll.results?.counts?.[option] ?? 0;
                        const pct = poll.results?.percentages?.[option] ?? 0;
                        const isUserVote = poll.results?.userVote === option;

                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-civix-dark-brown dark:text-white flex items-center">
                                {option}
                                {isUserVote && (
                                  <Badge className="ml-2 bg-civix-civic-green text-white text-[10px] py-0 px-1">Your Vote</Badge>
                                )}
                              </span>
                              <span className="text-civix-dark-brown/70 dark:text-civix-sandal/70">{pct.toFixed(1)}% ({count} votes)</span>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        );
                      })}
                      <p className="text-xs text-civix-dark-brown/60 dark:text-civix-sandal/60 pt-2">
                        Total votes cast: {totalVotes.toLocaleString()}
                      </p>
                    </div>

                    <div className="h-56 flex items-center justify-center bg-civix-warm-beige/10 dark:bg-gray-700/10 rounded-lg p-4">
                      {totalVotes > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={chartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-sm text-civix-dark-brown/50 dark:text-civix-sandal/50 text-center">
                          <PieChart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          No votes recorded to display visual chart.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="w-full py-2">
      <div className="space-y-6">
        {/* Title Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => onNavigate('dashboard')}
            className="text-civix-dark-brown dark:text-civix-sandal hover:bg-civix-warm-beige dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-3xl font-bold text-civix-dark-brown dark:text-white" style={{ fontWeight: '700' }}>
            Community Polls
          </h1>
        </div>

        {viewMode === 'list' && (
          <>
            {/* View Toggle tabs bar with buttons */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-md mb-8">
              <div className="flex space-x-2">
                <Button
                  variant={view === 'my' ? 'default' : 'outline'}
                  onClick={() => {
                    setView('my');
                    setSearchQuery('');
                  }}
                  className={view === 'my' 
                    ? 'bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white font-semibold' 
                    : 'border-civix-warm-beige dark:border-gray-600 text-civix-dark-brown dark:text-civix-sandal'}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  My Polls
                </Button>
                <Button
                  variant={view === 'all' ? 'default' : 'outline'}
                  onClick={() => {
                    setView('all');
                    setSearchQuery('');
                  }}
                  className={view === 'all' 
                    ? 'bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white font-semibold' 
                    : 'border-civix-warm-beige dark:border-gray-600 text-civix-dark-brown dark:text-civix-sandal'}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  All Polls
                </Button>
                <Button
                  variant={view === 'new' ? 'default' : 'outline'}
                  onClick={() => setView('new')}
                  className={view === 'new' 
                    ? 'bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white font-semibold' 
                    : 'border-civix-warm-beige dark:border-gray-600 text-civix-dark-brown dark:text-civix-sandal'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Poll
                </Button>
              </div>
            </div>

            {view !== 'new' ? (
              /* Lists of Polls (My or All) */
              <div className="space-y-6">
                {/* Search & Filter Controls */}
                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input 
                          placeholder="Search polls..." 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                          className="pl-10 border-civix-warm-beige dark:border-gray-600 bg-civix-light-gray dark:bg-gray-900" 
                        />
                      </div>
                      <div className="flex gap-4">
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="w-full md:w-[180px] border-civix-warm-beige dark:border-gray-600">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => (
                              <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger className="w-full md:w-[150px] border-civix-warm-beige dark:border-gray-600">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="voted">Voted</SelectItem>
                            <SelectItem value="closed">Closed / Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Polls Loop */}
                {loading ? (
                  <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-16 h-16 mx-auto mb-4 text-civix-dark-brown/30 dark:text-civix-sandal/30 animate-spin" />
                      <h3 className="text-xl text-civix-dark-brown dark:text-civix-sandal mb-2" style={{ fontWeight: '600' }}>Loading Polls...</h3>
                    </CardContent>
                  </Card>
                ) : filteredPolls.length === 0 ? (
                  <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-12 text-center">
                      <Vote className="w-16 h-16 mx-auto mb-4 text-civix-dark-brown/30 dark:text-civix-sandal/30" />
                      <h3 className="text-xl text-civix-dark-brown dark:text-civix-sandal mb-2" style={{ fontWeight: '600' }}>No Polls Found</h3>
                      <p className="text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-4">
                        No polls match the selected filters or active tab views.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {filteredPolls.map((poll) => {
                      const expired = isPollExpired(poll);
                      const hasVoted = poll.results?.userVote !== undefined;

                      return (
                        <Card 
                          key={poll._id} 
                          className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                          onClick={() => handleViewPoll(poll)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between flex-wrap gap-4 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                                  <h3 
                                    className="text-xl text-civix-dark-brown dark:text-civix-sandal hover:text-civix-civic-green transition-colors font-semibold"
                                  >
                                    {poll.title}
                                  </h3>
                                  {expired ? (
                                    <Badge variant="outline" className="border-red-500 text-red-500">Expired</Badge>
                                  ) : (
                                    <Badge className="bg-civix-civic-green text-white"><Clock className="w-3.5 h-3.5 mr-1" />{getTimeRemaining(poll)}</Badge>
                                  )}
                                  {hasVoted && (
                                    <Badge variant="outline" className="border-civix-civic-green text-civix-civic-green">Voted ✓</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-3">
                                  <Badge variant="outline" className="border-civix-dark-brown text-civix-dark-brown dark:border-civix-sandal dark:text-civix-sandal">
                                    {poll.category}
                                  </Badge>
                                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-red-500" />{poll.target_location}</span>
                                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" />Created: {new Date(poll.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-civix-dark-brown/80 dark:text-civix-sandal/80 mb-4 line-clamp-2">
                                  {poll.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                              <span className="text-xs text-civix-dark-brown/60 dark:text-civix-sandal/60">
                                {poll.results?.total ?? 0} votes cast
                              </span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPoll(poll);
                                }}
                                className="text-civix-dark-brown dark:text-civix-sandal hover:bg-civix-warm-beige dark:hover:bg-gray-700"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                {hasVoted || expired ? "View Results" : "Vote / Details"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Inline Create Poll Form */
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg animate-fade-in-slide">
                <CardHeader>
                  <CardTitle className="text-2xl text-civix-dark-brown dark:text-civix-sandal">Submit New Poll</CardTitle>
                  <CardDescription className="text-civix-dark-brown/70 dark:text-civix-sandal/70">
                    Create a poll to gather community feedback. All fields marked with * are required.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-civix-dark-brown dark:text-civix-sandal">
                        Title *
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter the main question or title of the poll"
                        className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-civix-dark-brown dark:text-civix-sandal">
                        Description *
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide details or context regarding this poll..."
                        className="border-civix-warm-beige dark:border-gray-600 min-h-32 bg-white/50 dark:bg-gray-900/50"
                        required
                      />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-civix-dark-brown dark:text-civix-sandal">
                        Category *
                      </Label>
                      <Select value={category} onValueChange={setCategory} required>
                        <SelectTrigger className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Duration in Hours */}
                    <div className="space-y-2">
                      <Label htmlFor="duration" className="text-civix-dark-brown dark:text-civix-sandal">
                        Duration (hours) *
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 72 (for 3 days)"
                        className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        required
                      />
                    </div>

                    {/* Target Location */}
                    <div className="space-y-2">
                      <Label htmlFor="targetLocation" className="text-civix-dark-brown dark:text-civix-sandal">
                        Target Location *
                      </Label>
                      <Input
                        id="targetLocation"
                        value={targetLocation}
                        onChange={(e) => setTargetLocation(e.target.value)}
                        placeholder="Target area (e.g. Sector 4, City-wide)"
                        className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        required
                      />
                    </div>

                    {/* Target Authority */}
                    <div className="space-y-2">
                      <Label htmlFor="targetAuthority" className="text-civix-dark-brown dark:text-civix-sandal">
                        Target Authority *
                      </Label>
                      <Input
                        id="targetAuthority"
                        value={targetAuthority}
                        onChange={(e) => setTargetAuthority(e.target.value)}
                        placeholder="e.g. Municipal Board"
                        className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        required
                      />
                    </div>

                    {/* Coordinates (Optional) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="latitude" className="text-civix-dark-brown dark:text-civix-sandal">
                          Latitude (Optional)
                        </Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="any"
                          value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                          placeholder="e.g. 28.6139"
                          className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longitude" className="text-civix-dark-brown dark:text-civix-sandal">
                          Longitude (Optional)
                        </Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="any"
                          value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                          placeholder="e.g. 77.2090"
                          className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        />
                      </div>
                    </div>

                    {/* Options list */}
                    <div className="space-y-3">
                      <Label className="text-civix-dark-brown dark:text-civix-sandal">
                        Options *
                      </Label>
                      {options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={option}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                            required
                          />
                          {options.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveOption(idx)}
                              className="text-red-500 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {options.length < 5 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAddOption}
                          className="border-civix-warm-beige dark:border-gray-600 w-full mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" /> Add Option
                        </Button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-4 pt-4">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Poll
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setView('all')}
                        disabled={submitting}
                        className="border-civix-warm-beige dark:border-gray-600"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {viewMode === 'detail' && selectedPoll && (
          <PollDetail poll={selectedPoll} />
        )}
      </div>
    </div>
  );
}
