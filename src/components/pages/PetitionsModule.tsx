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
  ThumbsUp,
  Share2,
  Eye,
  TrendingUp,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { petitionsAPI } from "@/lib/api";
import { Page } from "@/types";

interface PetitionsModuleProps {
  onNavigate: (page: Page, itemId?: string) => void;
  selectedItemId?: string | null;
  userName: string;
  refreshCounter?: number;
}

export default function PetitionsModule({ onNavigate, selectedItemId, userName, refreshCounter }: PetitionsModuleProps) {
  const [view, setView] = useState<'my' | 'all' | 'new'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedPetition, setSelectedPetition] = useState<any | null>(null);
  const [petitions, setPetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form states for new petition (redesigned inline form)
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [targetAuthority, setTargetAuthority] = useState("");
  const [signatureGoal, setSignatureGoal] = useState("100");

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
    'Environment',
    'Education',
    'Healthcare',
    'Infrastructure',
    'Social',
    'Other'
  ];

  useEffect(() => {
    reloadPetitions();
  }, []);

  useEffect(() => {
    if (typeof refreshCounter !== 'undefined') {
      reloadPetitions();
    }
  }, [refreshCounter]);

  const reloadPetitions = async () => {
    try {
      setLoading(true);
      const data = await petitionsAPI.getAllPetitions();
      const raw = Array.isArray(data) ? data : (data.petitions || []);
      const normalized = raw.map((p: any) => ({
        ...p,
        isSignedByCurrentUser: isSignedByCurrentUser(p),
      }));
      setPetitions(normalized);
    } catch (err) {
      console.error('Error loading petitions:', err);
      toast.error('Failed to load petitions');
    } finally {
      setLoading(false);
    }
  };

  const getSignaturesCount = (p: any) => {
    if (!p) return 0;
    if (Array.isArray(p.signatures)) return p.signatures.length;
    if (typeof p.signatures === 'number') return p.signatures;
    return p.signaturesCount || 0;
  };

  const isSignedByCurrentUser = (p: any) => {
    if (!p) return false;
    if (p.isSignedByUser || p.isSignedByCurrentUser) return true;
    try {
      if (Array.isArray(p.signatures) && currentUserId) {
        return p.signatures.includes(currentUserId);
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  const handleViewPetition = (petition: any) => {
    setSelectedPetition(petition);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPetition(null);
  };

  const handleSign = async (petition: any) => {
    try {
      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      const userId = userObj?._id || userObj?.id || null;

      // Optimistic update
      setPetitions(prev => prev.map(p => {
        if ((p._id || p.id) === (petition._id || petition.id)) {
          const updated = { ...p };
          if (Array.isArray(updated.signatures)) {
            updated.signatures = userId ? [...updated.signatures, userId] : [...updated.signatures, 'local-sign'];
          } else {
            updated.signatures = (typeof updated.signatures === 'number') ? updated.signatures + 1 : 1;
          }
          updated.isSignedByCurrentUser = true;
          return updated;
        }
        return p;
      }));

      if (selectedPetition && (selectedPetition._id === petition._id)) {
        const updatedDetail = { ...selectedPetition };
        if (Array.isArray(updatedDetail.signatures)) {
          updatedDetail.signatures = userId ? [...updatedDetail.signatures, userId] : [...updatedDetail.signatures, 'local-sign'];
        } else {
          updatedDetail.signatures = (typeof updatedDetail.signatures === 'number') ? updatedDetail.signatures + 1 : 1;
        }
        updatedDetail.isSignedByCurrentUser = true;
        setSelectedPetition(updatedDetail);
      }

      await petitionsAPI.signPetition(petition._id || petition.id);
      toast.success('Thanks — your signature was recorded');
      await reloadPetitions();
    } catch (err) {
      toast.error('You have already signed this petition.');
      await reloadPetitions();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !category || !location.trim() || !targetAuthority.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const goal = parseInt(signatureGoal);
    if (isNaN(goal) || goal < 1) {
      toast.error('Signature goal must be at least 1');
      return;
    }

    try {
      setSubmitting(true);
      await petitionsAPI.createPetition({
        title,
        summary,
        description,
        category,
        location: location.trim(),
        targetAuthority,
        signatureGoal: goal,
      });

      toast.success('Petition created successfully!');
      
      // Reset form
      setTitle('');
      setSummary('');
      setDescription('');
      setCategory('');
      setLocation('');
      setLatitude('');
      setLongitude('');
      setTargetAuthority('');
      setSignatureGoal('100');
      
      // Reload & switch to view all list
      await reloadPetitions();
      setView('all');
    } catch (err: any) {
      console.error('Error creating petition:', err);
      const msg = err.response?.data?.errors && Array.isArray(err.response.data.errors)
        ? err.response.data.errors.map((e: any) => e.msg || e.message).join(', ')
        : err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create petition. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter petitions list based on the active tab and search filters
  const filteredPetitions = petitions.filter(p => {
    if (!p) return false;
    
    // Tab view filter
    if (view === 'my') {
      const isCreator = p.creator === currentUserId || p.creator?._id === currentUserId;
      if (!isCreator) return false;
    }

    // Search query filter
    const matchesSearch = (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.summary || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Category filter
    if (filterCategory !== 'all') {
      if ((p.category || "").toLowerCase() !== filterCategory.toLowerCase()) return false;
    }

    // Status filter
    if (filterStatus !== 'all') {
      if (p.status !== filterStatus) return false;
    }

    return true;
  });

  // --- DETAIL VIEW ---
  const PetitionDetail = ({ petition }: { petition: any }) => {
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState<any[]>(petition.comments || []);
    const [postingComment, setPostingComment] = useState(false);

    const handleComment = async () => {
      if (!commentText.trim()) return;
      try {
        setPostingComment(true);
        const res = await petitionsAPI.commentPetition(petition._id || petition.id, commentText);
        setComments(res.comments || []);
        setCommentText("");
        toast.success("Comment added");
      } catch (err) {
        toast.error("Failed to add comment");
      } finally {
        setPostingComment(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button 
            variant="ghost" 
            onClick={handleBackToList}
            className="text-civix-dark-brown dark:text-civix-sandal hover:bg-civix-warm-beige dark:hover:bg-gray-700 w-full sm:w-auto justify-start"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Petitions List
          </Button>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Button
              size="sm"
              className={`flex-1 sm:flex-none ${petition.isSignedByCurrentUser ? "bg-gray-300 text-gray-700 cursor-not-allowed" : "bg-civix-civic-green text-white hover:bg-civix-civic-green/90"}`}
              disabled={petition.isSignedByCurrentUser}
              onClick={() => handleSign(petition)}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              {petition.isSignedByCurrentUser ? 'Signed' : 'Sign Petition'}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={async () => {
                try {
                  const url = `${window.location.origin}/petitions/${petition._id || petition.id}`;
                  await navigator.clipboard.writeText(url);
                  toast.success('Petition link copied to clipboard');
                } catch (err) {
                  toast.error('Failed to copy link');
                }
              }}
              className="border-civix-warm-beige dark:border-gray-600 text-civix-dark-brown dark:text-civix-sandal flex-1 sm:flex-none"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4 sm:p-8">
            <div className="space-y-8">
              <div>
                <div className="flex items-center space-x-3 mb-4 flex-wrap gap-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-civix-dark-brown dark:text-white">
                    {petition.title}
                  </h2>
                  {petition.status === 'trending' && (
                    <Badge className="bg-civix-civic-green text-white"><TrendingUp className="w-3.5 h-3.5 mr-1" />Trending</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-6">
                  <Badge variant="outline" className="border-civix-dark-brown text-civix-dark-brown dark:border-civix-sandal dark:text-civix-sandal">{petition.category}</Badge>
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-red-500" />{petition.location}</span>
                  <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" />Created: {new Date(petition.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center"><Target className="w-4 h-4 mr-1" />Goal: {petition.signatureGoal?.toLocaleString?.() ?? ''}</span>
                </div>
                <div className="space-y-2 mb-6">
                  <Progress value={petition.signatureGoal && getSignaturesCount(petition) ? (getSignaturesCount(petition) / petition.signatureGoal) * 100 : 0} className="h-2" />
                  <div className="flex justify-between text-xs text-civix-dark-brown/70 dark:text-civix-sandal/70">
                    <span>{getSignaturesCount(petition).toLocaleString()} of {petition.signatureGoal?.toLocaleString() ?? 0} signatures</span>
                    <span>{petition.signatureGoal && getSignaturesCount(petition) ? Math.round((getSignaturesCount(petition) / petition.signatureGoal) * 100) : 0}% complete</span>
                  </div>
                </div>
              </div>
              
              <Separator />

              <div>
                <h3 className="text-xl font-semibold text-civix-dark-brown dark:text-civix-sandal mb-3">Description</h3>
                <p className="text-civix-dark-brown/80 dark:text-civix-sandal/80 leading-relaxed whitespace-pre-wrap">{petition.description}</p>
              </div>

              {petition.targetAuthority && (
                <div>
                  <h3 className="text-xl font-semibold text-civix-dark-brown dark:text-civix-sandal mb-1">Target Authority</h3>
                  <p className="text-civix-dark-brown/80 dark:text-civix-sandal/80">{petition.targetAuthority}</p>
                </div>
              )}

              <Separator />

              {/* Comments Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-civix-dark-brown dark:text-civix-sandal">Comments ({comments.length})</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {comments.length === 0 ? (
                    <p className="text-civix-dark-brown/60 dark:text-civix-sandal/60 text-sm">No comments yet. Be the first to share your thoughts.</p>
                  ) : (
                    comments.map((c, idx) => (
                      <div key={idx} className="bg-civix-warm-beige/10 dark:bg-gray-700/30 border border-civix-warm-beige/25 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm text-civix-dark-brown dark:text-white">{c.by?.name || c.by || 'User'}</span>
                          <span className="text-xs text-civix-dark-brown/60 dark:text-civix-sandal/60">{c.at ? new Date(c.at).toLocaleString() : ''}</span>
                        </div>
                        <p className="text-sm text-civix-dark-brown/80 dark:text-civix-sandal/85">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    disabled={postingComment}
                    className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                  />
                  <Button 
                    onClick={handleComment} 
                    disabled={postingComment || !commentText.trim()}
                    className="bg-civix-civic-green text-white hover:bg-civix-civic-green/90"
                  >
                    {postingComment ? 'Posting...' : 'Post'}
                  </Button>
                </div>
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => onNavigate('dashboard')}
            className="text-civix-dark-brown dark:text-civix-sandal hover:bg-civix-warm-beige dark:hover:bg-gray-700 h-9 px-3"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <h1 className="text-2xl sm:text-3xl font-bold text-civix-dark-brown dark:text-white" style={{ fontWeight: '700' }}>
            Public Petitions
          </h1>
        </div>

        {viewMode === 'list' && (
          <>
            {/* View Toggle tabs bar with buttons */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-md mb-8">
              <div className="flex flex-wrap gap-2">
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
                  My Petitions
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
                  All Petitions
                </Button>
                <Button
                  variant={view === 'new' ? 'default' : 'outline'}
                  onClick={() => setView('new')}
                  className={view === 'new' 
                    ? 'bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white font-semibold' 
                    : 'border-civix-warm-beige dark:border-gray-600 text-civix-dark-brown dark:text-civix-sandal'}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Petition
                </Button>
              </div>
            </div>

            {view !== 'new' ? (
              /* Lists of Petitions (My or All) */
              <div className="space-y-6">
                {/* Search & Filter Controls */}
                <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input 
                          placeholder="Search petitions..." 
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
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Petitions Loop */}
                {loading ? (
                  <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-16 h-16 mx-auto mb-4 text-civix-dark-brown/30 dark:text-civix-sandal/30 animate-spin" />
                      <h3 className="text-xl text-civix-dark-brown dark:text-civix-sandal mb-2" style={{ fontWeight: '600' }}>Loading Petitions...</h3>
                    </CardContent>
                  </Card>
                ) : filteredPetitions.length === 0 ? (
                  <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-12 text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-civix-dark-brown/30 dark:text-civix-sandal/30" />
                      <h3 className="text-xl text-civix-dark-brown dark:text-civix-sandal mb-2" style={{ fontWeight: '600' }}>No Petitions Found</h3>
                      <p className="text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-4">
                        No petitions match the selected filters or active tab views.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {filteredPetitions.map((petition) => (
                      <Card key={petition._id || petition.id} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between flex-wrap gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                                <h3 
                                  className="text-xl text-civix-dark-brown dark:text-civix-sandal cursor-pointer hover:text-civix-civic-green transition-colors" 
                                  onClick={() => handleViewPetition(petition)}
                                  style={{ fontWeight: '600' }}
                                >
                                  {petition.title}
                                </h3>
                                {petition.status === 'trending' && (
                                  <Badge className="bg-civix-civic-green text-white"><TrendingUp className="w-3.5 h-3.5 mr-1" />Trending</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-3">
                                <Badge variant="outline" className="border-civix-dark-brown text-civix-dark-brown dark:border-civix-sandal dark:text-civix-sandal">
                                  {petition.category}
                                </Badge>
                                <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-red-500" />{petition.location}</span>
                                <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" />Created: {new Date(petition.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-civix-dark-brown/80 dark:text-civix-sandal/80 mb-4 line-clamp-2">
                                {petition.summary || petition.description}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <Progress value={petition.signatureGoal && getSignaturesCount(petition) ? (getSignaturesCount(petition) / petition.signatureGoal) * 100 : 0} className="h-2" />
                            <div className="flex justify-between text-xs text-civix-dark-brown/70 dark:text-civix-sandal/70">
                              <span>{getSignaturesCount(petition).toLocaleString()} signatures</span>
                              <span>Goal: {petition.signatureGoal?.toLocaleString() ?? 0}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleViewPetition(petition)}
                              className="text-civix-dark-brown dark:text-civix-sandal hover:bg-civix-warm-beige dark:hover:bg-gray-700"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              className={petition.isSignedByCurrentUser ? "bg-gray-300 text-gray-700 cursor-not-allowed" : "bg-civix-civic-green text-white hover:bg-civix-civic-green/90"}
                              disabled={petition.isSignedByCurrentUser}
                              onClick={() => handleSign(petition)}
                            >
                              <ThumbsUp className="w-4 h-4 mr-2" />
                              {petition.isSignedByCurrentUser ? 'Signed ✓' : 'Sign'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={async () => {
                                try {
                                  const url = `${window.location.origin}/petitions/${petition._id || petition.id}`;
                                  await navigator.clipboard.writeText(url);
                                  toast.success('Petition link copied to clipboard');
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Inline Create Petition Form (Redesigned matching Complaints Form) */
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg animate-fade-in-slide">
                <CardHeader>
                  <CardTitle className="text-2xl text-civix-dark-brown dark:text-civix-sandal">Submit New Petition</CardTitle>
                  <CardDescription className="text-civix-dark-brown/70 dark:text-civix-sandal/70">
                    Advocate for neighborhood change. All fields marked with * are required.
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
                        placeholder="Brief title of the petition campaign"
                        className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        required
                      />
                    </div>

                    {/* Summary */}
                    <div className="space-y-2">
                      <Label htmlFor="summary" className="text-civix-dark-brown dark:text-civix-sandal">
                        Summary *
                      </Label>
                      <Input
                        id="summary"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="A short one-line description of your request"
                        className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-civix-dark-brown dark:text-civix-sandal">
                        Detailed Description *
                      </Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide deep background details, proposed resolutions, and community impact..."
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

                    {/* Location */}
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-civix-dark-brown dark:text-civix-sandal">
                        Location *
                      </Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Street, neighborhood, or city name"
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
                          placeholder="e.g., 28.6139"
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
                          placeholder="e.g., 77.2090"
                          className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        />
                      </div>
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
                        placeholder="Name of local body or official (e.g., Municipal Corporation)"
                        className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        required
                      />
                    </div>

                    {/* Signature Goal */}
                    <div className="space-y-2">
                      <Label htmlFor="signatureGoal" className="text-civix-dark-brown dark:text-civix-sandal">
                        Signature Goal *
                      </Label>
                      <Input
                        id="signatureGoal"
                        type="number"
                        min="1"
                        value={signatureGoal}
                        onChange={(e) => setSignatureGoal(e.target.value)}
                        placeholder="Required signature target"
                        className="border-civix-warm-beige dark:border-gray-600 bg-white/50 dark:bg-gray-900/50"
                        required
                      />
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
                            Create Petition
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

        {viewMode === 'detail' && (
          <PetitionDetail petition={selectedPetition} />
        )}
      </div>
    </div>
  );
}
