import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { 
  FileText, 
  Vote, 
  BarChart3, 
  MapPin,
  Calendar,
  ThumbsUp,
  Share2,
  Eye,
  AlertTriangle,
  Shield,
  UserCheck,
  PartyPopper,
  Wrench,
  Megaphone,
  Siren,
  GraduationCap,
  Heart,
  Briefcase
} from "lucide-react";
import { useState, useEffect } from "react";
import { petitionsAPI, pollsAPI, userAPI, complaintsAPI } from '@/lib/api';

import ThemeToggle from "./ThemeToggle";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardProps {
  onNavigate: (page: 'landing' | 'petitions' | 'polls'  | 'complaints' | 'admin' | 'volunteer') => void;
  userName: string;
}

export default function Dashboard({ onNavigate, userName }: DashboardProps) {
  const { user } = useAuth();
  const userRole = user?.role || 'citizen';
  const [activeSection, setActiveSection] = useState('dashboard');
  
  // Volunteer registration state
  const [volunteerSheetOpen, setVolunteerSheetOpen] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [emailNotifications, setEmailNotifications] = useState(true);

    // State for real petitions, polls, and complaints
  const [petitions, setPetitions] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [volunteerCount, setVolunteerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching dashboard data...');
      
      // Fetch each data source separately to identify which one might fail
      try {
        const petitionsData = await petitionsAPI.getAllPetitions(); // Note: Changed to getAllPetitions
        console.log('Petitions data:', petitionsData);
        setPetitions(Array.isArray(petitionsData) ? petitionsData : (petitionsData?.petitions || []));
      } catch (error) {
        console.error('Failed to fetch petitions:', error);
      }

      try {
        const pollsData = await pollsAPI.getAllPolls(); // Note: Changed to getAllPolls
        console.log('Polls data:', pollsData);
        setPolls(Array.isArray(pollsData) ? pollsData : (pollsData?.polls || []));
      } catch (error) {
        console.error('Failed to fetch polls:', error);
      }

      try {
        const volunteerStatsData = await userAPI.getVolunteerStats();
        console.log('Volunteer stats:', volunteerStatsData);
        setVolunteerCount(volunteerStatsData?.totalVolunteers || 0);
      } catch (error) {
        console.error('Failed to fetch volunteer stats:', error);
      }

      try {
        const complaintsData = await complaintsAPI.getAllComplaints();
        console.log('Complaints data:', complaintsData);
        setComplaints(Array.isArray(complaintsData) ? complaintsData : []);
      } catch (error) {
        console.error('Failed to fetch complaints:', error);
      }

    } catch (err) {
      console.error('Overall fetch error:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const volunteerCategories = [
    { id: 'event-help', name: 'Event Help', icon: PartyPopper, description: 'Assist with community events and gatherings' },
    { id: 'technical-support', name: 'Technical Support', icon: Wrench, description: 'Help with tech-related issues and infrastructure' },
    { id: 'community-outreach', name: 'Community Outreach', icon: Megaphone, description: 'Engage with community members and spread awareness' },
    { id: 'emergency-response', name: 'Emergency Response', icon: Siren, description: 'Respond to urgent community needs' },
    { id: 'education', name: 'Education & Tutoring', icon: GraduationCap, description: 'Support educational programs and mentoring' },
    { id: 'health-wellness', name: 'Health & Wellness', icon: Heart, description: 'Promote health initiatives and wellness programs' },
    { id: 'administrative', name: 'Administrative Support', icon: Briefcase, description: 'Help with paperwork and organizational tasks' }
  ];

  // Mock official updates (used in Official Updates section)
  const mockOfficialUpdates = [
    {
      id: 'update-1',
      official: 'City Council',
      title: 'New Parking Regulations',
      content: 'The City Council approved new parking regulations for downtown beginning next month. Please review the changes and provide feedback.',
      avatar: '/api/placeholder/40/40',
      timestamp: '2 days ago'
    },
    {
      id: 'update-2',
      official: 'Public Works',
      title: 'Roadworks on Main St.',
      content: 'Road maintenance will begin on Main St. Expect traffic diversions between 9am and 4pm for the next two weeks.',
      avatar: '/api/placeholder/40/40',
      timestamp: '1 week ago'
    },
    {
      id: 'update-3',
      official: 'Mayor Office',
      title: 'Community Townhall',
      content: "Join the Mayor for a community townhall to discuss neighborhood safety and development plans.",
      avatar: '/api/placeholder/40/40',
      timestamp: '3 weeks ago'
    }
  ];

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleVolunteerRegistration = () => {
    if (selectedCategories.length === 0) {
      return;
    }

    // Simulate API call
    
    // Reset and close
    setVolunteerSheetOpen(false);
    setTimeout(() => {
      setRegistrationStep(1);
      setSelectedCategories([]);
      setEmailNotifications(true);
    }, 300);
  };

  return (
    <div className="max-w-7xl w-full mx-auto py-2 flex-1 flex flex-col">
      {/* Hero Section */}
      <div className="grid lg:grid-cols-4 gap-8 lg:min-h-[calc(100vh-140px)] items-stretch mb-12 relative z-10">
        {/* Left Sidebar containing only Stats */}
        <div className="lg:col-span-1 flex flex-col min-h-full">
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg flex-1 flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-civix-dark-brown dark:text-civix-sandal flex items-center justify-between">
                <span>This Month ({new Date().toLocaleString('default', { month: 'long' })})</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-civix-dark-brown/70 dark:text-civix-sandal/70 hover:text-civix-civic-green"
                  onClick={() => {
                    setLoading(true);
                    fetchData();
                  }}
                >
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-around py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-col lg:space-y-4 gap-4 lg:gap-0 lg:justify-around">
                {/* Petitions Section */}
                <div>
                  <div className="text-center mb-2">
                    <div className="text-2xl text-civix-civic-green" style={{ fontWeight: '700' }}>
                      {loading ? (
                        <div className="h-8 w-16 mx-auto bg-civix-civic-green/20 animate-pulse rounded" />
                      ) : (
                        petitions.filter(p => {
                          const createdDate = new Date(p.createdAt);
                          const now = new Date();
                          return createdDate.getMonth() === now.getMonth() && 
                                 createdDate.getFullYear() === now.getFullYear();
                        }).length
                      )}
                    </div>
                    <div className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">New Petitions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg text-civix-civic-green" style={{ fontWeight: '600' }}>
                      {loading ? (
                        <div className="h-6 w-12 mx-auto bg-civix-civic-green/20 animate-pulse rounded" />
                      ) : (
                        (() => {
                          const thisMonthPetitions = petitions.filter(p => {
                            const date = new Date(p.createdAt);
                            const now = new Date();
                            return date.getMonth() === now.getMonth() && 
                                   date.getFullYear() === now.getFullYear();
                          });
                          const signedPetitions = thisMonthPetitions.filter(p => 
                            (p.signatures?.length || 0) > 0
                          );
                          return `${thisMonthPetitions.length > 0 
                            ? Math.round((signedPetitions.length / thisMonthPetitions.length) * 100)
                            : 0}%`;
                        })()
                      )}
                    </div>
                    <div className="text-xs text-civix-dark-brown/70 dark:text-civix-sandal/70">Petition Participation</div>
                  </div>
                </div>

                <Separator className="hidden lg:block" />

                {/* Complaints Section */}
                <div className="text-center">
                  <div className="text-2xl text-orange-500" style={{ fontWeight: '700' }}>
                    {loading ? (
                      <div className="h-8 w-16 mx-auto bg-orange-500/20 animate-pulse rounded" />
                    ) : (
                      complaints?.filter(c => {
                        const date = new Date(c.createdAt);
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && 
                               date.getFullYear() === now.getFullYear();
                      })?.length || 0
                    )}
                  </div>
                  <div className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-2">New Complaints</div>
                  <div className="text-lg text-orange-500" style={{ fontWeight: '600' }}>
                    {loading ? (
                      <div className="h-6 w-12 mx-auto bg-orange-500/20 animate-pulse rounded" />
                    ) : (
                      complaints?.filter(c => {
                        const date = new Date(c.updatedAt);
                        const now = new Date();
                        return c.status === 'resolved' && 
                               date.getMonth() === now.getMonth() && 
                               date.getFullYear() === now.getFullYear();
                      })?.length || 0
                    )}
                  </div>
                  <div className="text-xs text-civix-dark-brown/70 dark:text-civix-sandal/70">Resolved This Month</div>
                </div>

                <Separator className="hidden lg:block" />

                {/* Polls Section */}
                <div>
                  <div className="text-center mb-2">
                    <div className="text-2xl text-civix-dark-brown dark:text-civix-sandal" style={{ fontWeight: '700' }}>
                      {loading ? (
                        <div className="h-8 w-16 mx-auto bg-civix-dark-brown/20 dark:bg-civix-sandal/20 animate-pulse rounded" />
                      ) : (
                        polls.filter(p => {
                          const date = new Date(p.createdAt);
                          const now = new Date();
                          return date.getMonth() === now.getMonth() && 
                                 date.getFullYear() === now.getFullYear();
                        }).length
                      )}
                    </div>
                    <div className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">New Polls</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg text-civix-dark-brown dark:text-civix-sandal" style={{ fontWeight: '600' }}>
                      {loading ? (
                        <div className="h-6 w-12 mx-auto bg-civix-dark-brown/20 dark:bg-civix-sandal/20 animate-pulse rounded" />
                      ) : (
                        (() => {
                          const thisMonthPolls = polls.filter(p => {
                            const date = new Date(p.createdAt);
                            const now = new Date();
                            return date.getMonth() === now.getMonth() && 
                                   date.getFullYear() === now.getFullYear();
                          });
                          const pollsWithVotes = thisMonthPolls.filter(p => p.totalVotes > 0);
                          return `${thisMonthPolls.length > 0 
                            ? Math.round((pollsWithVotes.length / thisMonthPolls.length) * 100)
                            : 0}%`;
                        })()
                      )}
                    </div>
                    <div className="text-xs text-civix-dark-brown/70 dark:text-civix-sandal/70">Poll Participation</div>
                  </div>
                </div>

                <Separator className="hidden lg:block" />

                {/* Response Rate */}
                <div className="text-center">
                  <div className="text-2xl text-civix-civic-green" style={{ fontWeight: '700' }}>
                    {loading ? (
                      <div className="h-8 w-16 mx-auto bg-civix-civic-green/20 animate-pulse rounded" />
                    ) : (
                      (() => {
                        const thisMonthItems = [...petitions, ...(complaints || [])].filter(item => {
                          const date = new Date(item.createdAt);
                          const now = new Date();
                          return date.getMonth() === now.getMonth() && 
                                 date.getFullYear() === now.getFullYear();
                        });
                        
                        const respondedItems = thisMonthItems.filter(item => 
                          item.status === 'resolved' || item.official_response
                        );
                        
                        return `${thisMonthItems.length > 0 
                          ? Math.round((respondedItems.length / thisMonthItems.length) * 100)
                          : 0}%`;
                      })()
                    )}
                  </div>
                  <div className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">Official Response Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Welcome & Actions */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-6 min-h-full">
          {/* Welcome Banner */}
          <Card className="bg-gradient-to-r from-civix-civic-green/20 to-civix-civic-green/10 dark:from-civix-civic-green/35 dark:to-civix-civic-green/20 border border-civix-civic-green/30 shadow-lg flex-1 flex flex-col justify-center min-h-[160px]">
            <CardContent className="p-6 flex flex-col justify-center h-full">
              <h2 className="text-2xl mb-1 text-civix-dark-brown dark:text-white" style={{ fontWeight: '700' }}>Welcome back, {userName}!</h2>
              <p className="text-civix-dark-brown/80 dark:text-gray-300 text-sm mb-3">Ready to make a difference in your community today?</p>
              <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg p-3 text-xs text-civix-dark-brown dark:text-civix-sandal border border-civix-civic-green/20">
                <span className="font-bold block mb-1.5 text-sm text-civix-dark-brown dark:text-white">Our Motto: Empowering Communities, Amplifying Voices</span>
                <p className="leading-relaxed mb-2.5 text-civix-dark-brown/90 dark:text-civix-sandal/90">
                  Civix bridges the gap between citizens and local governance, driving civic engagement at the grassroots level.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs opacity-95">
                  <div className="flex items-center gap-1.5 text-civix-dark-brown/95 dark:text-civix-sandal/95">
                    <span className="text-civix-civic-green font-bold">•</span> Propose & Sign Public Petitions
                  </div>
                  <div className="flex items-center gap-1.5 text-civix-dark-brown/95 dark:text-civix-sandal/95">
                    <span className="text-civix-civic-green font-bold">•</span> Voice Concerns via Complaints
                  </div>
                  <div className="flex items-center gap-1.5 text-civix-dark-brown/95 dark:text-civix-sandal/95">
                    <span className="text-civix-civic-green font-bold">•</span> Vote on Community Sentiment Polls
                  </div>
                  <div className="flex items-center gap-1.5 text-civix-dark-brown/95 dark:text-civix-sandal/95">
                    <span className="text-civix-civic-green font-bold">•</span> Engage via Volunteer Actions
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Combined Overview & Quick Actions Container */}
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg flex-1 flex flex-col justify-between">
            <CardHeader className="py-4">
              <CardTitle className="text-2xl text-civix-dark-brown dark:text-civix-sandal">Overview & Quick Actions</CardTitle>
              <CardDescription className="text-civix-dark-brown/70 dark:text-civix-sandal/70">
                Your activity summary and quick access to common actions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Petitions */}
                <div
                  onClick={() => onNavigate('petitions')}
                  className="p-6 rounded-lg border border-civix-civic-green/20 bg-gradient-to-br from-civix-civic-green/10 to-civix-civic-green/5 dark:from-civix-civic-green/20 dark:to-civix-civic-green/10 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-civix-dark-brown/70 dark:text-civix-sandal/70">Total Petitions</p>
                      <div className="text-2xl text-civix-civic-green" style={{ fontWeight: 700 }}>{petitions ? petitions.length : 0}</div>
                      <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">Active & tracked petitions</p>
                    </div>
                    <div className="bg-civix-civic-green/20 p-2 rounded-lg shrink-0">
                      <FileText className="w-6 h-6 text-civix-civic-green" />
                    </div>
                  </div>
                </div>

                {/* Polls & Voting */}
                <div
                  onClick={() => onNavigate('polls')}
                  className="p-6 rounded-lg border border-civix-dark-brown/20 dark:border-civix-sandal/20 bg-gradient-to-br from-civix-dark-brown/10 to-civix-dark-brown/5 dark:from-civix-sandal/20 dark:to-civix-sandal/10 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-civix-dark-brown/70 dark:text-civix-sandal/70">Public Polls</p>
                      <div className="text-2xl text-civix-dark-brown" style={{ fontWeight: 700 }}>{polls ? polls.length : 0}</div>
                      <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">Ongoing public sentiment polls</p>
                    </div>
                    <div className="bg-civix-dark-brown/20 dark:bg-civix-sandal/20 p-2 rounded-lg shrink-0">
                      <Vote className="w-6 h-6 text-civix-dark-brown dark:text-civix-sandal" />
                    </div>
                  </div>
                </div>

                {/* My Complaints */}
                <div
                  onClick={() => onNavigate('complaints')}
                  className="p-6 rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-civix-dark-brown/70 dark:text-civix-sandal/70">My Complaints</p>
                      <div className="text-2xl text-civix-dark-brown" style={{ fontWeight: 700 }}>0</div>
                      <p className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">Submitted by you</p>
                    </div>
                    <div className="bg-orange-500/20 p-2 rounded-lg shrink-0">
                      <AlertTriangle className="w-6 h-6 text-orange-500" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin & Volunteer Access Card */}
          {userRole !== 'citizen' && (
            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="py-3">
                <CardTitle className="text-xl text-civix-dark-brown dark:text-civix-sandal">
                  {userRole === 'admin' ? 'Admin Access' : 'Volunteer Access'}
                </CardTitle>
                <CardDescription className="text-civix-dark-brown/70 dark:text-civix-sandal/70">
                  Access specialized dashboards for {userRole === 'admin' ? 'administrative' : 'volunteer'} functions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 gap-4">
                  {userRole === 'admin' && (
                    <div 
                      onClick={() => onNavigate('admin')}
                      className="group bg-gradient-to-r from-civix-dark-brown to-civix-civic-green rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="bg-white/20 p-3 rounded-lg shrink-0 transition-all duration-300 group-hover:scale-110">
                            <Shield className="w-8 h-8 text-white transition-all duration-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xl text-white mb-1 transition-all duration-300 group-hover:text-2xl" style={{ fontWeight: '600' }}>
                              Admin Dashboard
                            </h4>
                            <p className="text-sm text-white/90 transition-all duration-300 group-hover:text-white">
                              Manage all issues & assign volunteers
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {userRole === 'volunteer' && (
                    <div 
                      onClick={() => onNavigate('volunteer')}
                      className="group bg-gradient-to-r from-civix-civic-green to-civix-dark-brown rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="bg-white/20 p-3 rounded-lg shrink-0 transition-all duration-300 group-hover:scale-110">
                            <UserCheck className="w-8 h-8 text-white transition-all duration-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xl text-white mb-1 transition-all duration-300 group-hover:text-2xl" style={{ fontWeight: '600' }}>
                              Volunteer Dashboard
                            </h4>
                            <p className="text-sm text-white/90 transition-all duration-300 group-hover:text-white">
                              View & update assigned issues
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Active content (Below Hero) */}
      <div className="space-y-12">
        {/* Active Petitions */}
        <div>
          <h3 className="text-2xl text-civix-dark-brown dark:text-civix-sandal mb-6" style={{ fontWeight: '700' }}>Active Petitions</h3>
          <div className="space-y-6">
            {petitions.map((petition) => (
              <Card key={petition._id} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl text-civix-dark-brown dark:text-civix-sandal mb-2" style={{ fontWeight: '600' }}>{petition.title}</h4>
                      <div className="flex items-center flex-wrap gap-2 text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-2">
                        <span className="bg-civix-warm-beige dark:bg-gray-700 px-2 py-1 rounded flex items-center shrink-0">
                          <MapPin className="w-3 h-3 mr-1 shrink-0" />
                          {petition.location}
                        </span>
                      </div>
                      <p className="text-civix-dark-brown/80 dark:text-civix-sandal/80 mb-4">{petition.summary || petition.description}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center flex-wrap gap-3 pt-2">
                      <Button 
                        size="sm" 
                        className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white shrink-0"
                        onClick={() => onNavigate('petitions')}
                      >
                        <Eye className="w-3 h-3 mr-1 shrink-0" />
                        View
                      </Button>

                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-civix-civic-green text-civix-civic-green hover:bg-civix-civic-green hover:text-white shrink-0"
                        onClick={() => onNavigate('petitions')}
                      >
                        <ThumbsUp className="w-3 h-3 mr-1 shrink-0" />
                        Sign
                      </Button>

                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-civix-dark-brown text-civix-dark-brown dark:border-civix-sandal dark:text-civix-sandal hover:bg-civix-dark-brown hover:text-white dark:hover:bg-civix-sandal dark:hover:text-civix-dark-brown shrink-0"
                        onClick={() => onNavigate('petitions')}
                      >
                        <Share2 className="w-3 h-3 mr-1 shrink-0" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Public Sentiment Polls */}
        <div>
          <h3 className="text-2xl text-civix-dark-brown dark:text-civix-sandal mb-6" style={{ fontWeight: '700' }}>Public Sentiment Polls</h3>
          <div className="space-y-6">
            {polls.length === 0 && !loading && (
              <div className="text-civix-dark-brown/70 dark:text-civix-sandal/70 text-center py-8">No polls available.</div>
            )}
            {polls.map((poll) => (
              <Card key={poll._id} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <h4 className="text-lg text-civix-dark-brown dark:text-civix-sandal flex-1 min-w-0" style={{ fontWeight: '600' }}>{poll.question || poll.title}</h4>
                    {poll.endsAt && (
                      <Badge variant="outline" className="border-civix-civic-green text-civix-civic-green shrink-0 whitespace-nowrap">
                        <Calendar className="w-3 h-3 mr-1 shrink-0" />
                        Ends {new Date(poll.endsAt).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-3 mb-4">
                    {Array.isArray(poll.options) && (() => {
                      type PollOption = { text?: string; option?: string; votes?: number };
                      const options = poll.options as PollOption[];
                      return options.map((option: PollOption, index: number) => {
                        let percentage: number = 0;
                        if (typeof option.votes === 'number' && poll.totalVotes > 0) {
                          percentage = Math.round((option.votes / poll.totalVotes) * 100);
                        }
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm gap-4">
                              <span className="text-civix-dark-brown dark:text-civix-sandal min-w-0 flex-1">
                                {option.text || option.option || `Option ${index + 1}`}
                              </span>
                              <span className="text-civix-dark-brown/70 dark:text-civix-sandal/70 shrink-0">{percentage}%</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                    <span className="text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">{poll.totalVotes ? poll.totalVotes.toLocaleString() : 0} total votes</span>
                    <Button 
                      size="sm" 
                      className="bg-civix-civic-green hover:bg-civix-civic-green/90 text-white shrink-0"
                      onClick={() => onNavigate('polls')}
                    >
                      <Vote className="w-3 h-3 mr-1 shrink-0" />
                      Vote Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}