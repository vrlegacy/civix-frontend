// ComplaintsModule.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Upload, 
  MapPin, 
  FileText, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Image as ImageIcon,
  X,
  Trash2,
  Loader2,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { complaintsAPI } from "@/lib/api";
import { Complaint, CreateComplaintData } from "@/types";

interface ComplaintsModuleProps {
  onNavigate: (page: 'landing' | 'petitions' | 'polls' | 'complaints' | 'admin' | 'volunteer' | 'dashboard') => void;
  userName: string;
}

export default function ComplaintsModule({ onNavigate, userName }: ComplaintsModuleProps) {
  const [view, setView] = useState<'list' | 'new'>('list');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userComplaints, setUserComplaints] = useState<Complaint[]>([]);

  // Load complaints on component mount
  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const complaints = await complaintsAPI.getMyComplaints();
      setUserComplaints(complaints);
    } catch (error: any) {
      console.error('Error loading complaints:', error);
      toast.error('Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Infrastructure',
    'Roads',
    'Environment',
    'Vandalism',
    'Public Safety',
    'Sanitation',
    'Parks & Recreation',
    'Other'
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
    // Reset the file input value so same file can be re-selected
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setLocation('');
    setLatitude('');
    setLongitude('');
    setUploadedFile(null);
    setPreviewUrl(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !category || !location) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const complaintData: CreateComplaintData = {
        title,
        description,
        category,
        location,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
      };

      await complaintsAPI.createComplaint(complaintData, uploadedFile || undefined);

      // Refresh complaints
      const refreshed = await complaintsAPI.getMyComplaints();
      setUserComplaints(refreshed);
      
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setLocation('');
      setLatitude('');
      setLongitude('');
      setUploadedFile(null);
      setPreviewUrl(null);
      
      toast.success('Complaint submitted successfully!');
      setView('list');
    } catch (error: any) {
      console.error('Error submitting complaint:', error);
      const msg = error.response?.data?.errors && Array.isArray(error.response.data.errors)
        ? error.response.data.errors.map((e: any) => e.msg || e.message).join(', ')
        : error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to submit complaint. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: Complaint['status']) => {
    switch (status) {
      case 'received':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400"><Clock className="w-3.5 h-3.5 mr-1" />Received</Badge>;
      case 'in_review':
        return <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400"><FileText className="w-3.5 h-3.5 mr-1" />In Review</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="border-civix-civic-green text-civix-civic-green"><CheckCircle className="w-3.5 h-3.5 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="outline" className="border-gray-500 text-gray-600 dark:text-gray-400"><Clock className="w-3.5 h-3.5 mr-1" />Unknown</Badge>;
    }
  };

  return (
    <div className="w-full py-2">
      <div className="space-y-6">
        {/* Title / Back navigation header within content */}
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => {
              if (view === 'new') resetForm();
              onNavigate('dashboard');
            }}
            className="text-civix-dark-brown dark:text-civix-sandal hover:bg-civix-warm-beige dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-3xl font-bold text-civix-dark-brown dark:text-white" style={{ fontWeight: '700' }}>
            My Complaints
          </h1>
        </div>

        {/* View Toggle tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg shadow-md">
          <div className="flex space-x-2">
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              onClick={() => {
                resetForm();
                setView('list');
              }}
              className={view === 'list' 
                ? 'bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white' 
                : 'border-civix-warm-beige dark:border-gray-600 text-civix-dark-brown dark:text-civix-sandal'}
            >
              <FileText className="w-4 h-4 mr-2" />
              My Complaints
            </Button>
            <Button
              variant={view === 'new' ? 'default' : 'outline'}
              onClick={() => setView('new')}
              className={view === 'new' 
                ? 'bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white' 
                : 'border-civix-warm-beige dark:border-gray-600 text-civix-dark-brown dark:text-civix-sandal'}
            >
              <Upload className="w-4 h-4 mr-2" />
              Submit New
            </Button>
          </div>
        </div>

        {view === 'list' ? (
          /* List View */
          <div className="space-y-6">
            {loading ? (
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-16 h-16 mx-auto mb-4 text-civix-dark-brown/30 dark:text-civix-sandal/30 animate-spin" />
                  <h3 className="text-xl text-civix-dark-brown dark:text-civix-sandal mb-2" style={{ fontWeight: '600' }}>Loading Complaints...</h3>
                </CardContent>
              </Card>
            ) : userComplaints.length === 0 ? (
              <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-civix-dark-brown/30 dark:text-civix-sandal/30" />
                  <h3 className="text-xl text-civix-dark-brown dark:text-civix-sandal mb-2" style={{ fontWeight: '600' }}>No Complaints Yet</h3>
                  <p className="text-civix-dark-brown/70 dark:text-civix-sandal/70 mb-6">
                    You haven't submitted any complaints yet. Click "Submit New" to get started.
                  </p>
                  <Button
                    onClick={() => setView('new')}
                    className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white"
                  >
                    Submit Your First Complaint
                  </Button>
                </CardContent>
              </Card>
            ) : (
              userComplaints.map((complaint) => (
                <Card key={complaint._id} className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Photo */}
                      {complaint.photo_url && (
                        <div className="md:w-48 h-48 rounded-lg overflow-hidden bg-civix-warm-beige dark:bg-gray-700 flex-shrink-0">
                          <img
                            src={complaint.photo_url}
                            alt={complaint.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-xl text-civix-dark-brown dark:text-civix-sandal mb-2" style={{ fontWeight: '600' }}>
                              {complaint.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <Badge variant="outline" className="border-civix-dark-brown text-civix-dark-brown dark:border-civix-sandal dark:text-civix-sandal">
                                {complaint.category}
                              </Badge>
                              {getStatusBadge(complaint.status)}
                            </div>
                          </div>
                        </div>

                        <p className="text-civix-dark-brown/80 dark:text-civix-sandal/80 mb-4">
                          {complaint.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-civix-dark-brown/70 dark:text-civix-sandal/70">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1 text-red-500" />
                            {complaint.location}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            Submitted: {new Date(complaint.createdAt).toLocaleDateString()}
                          </div>
                          {complaint.assigned_to && (
                            <div className="flex items-center">
                              <span className="mr-2">Assigned to:</span>
                              <Badge className="bg-civix-civic-green text-white">
                                {typeof complaint.assigned_to === 'string'
                                  ? complaint.assigned_to
                                  : complaint.assigned_to.name || 'Volunteer'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* New Complaint Form */
          <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-civix-dark-brown dark:text-civix-sandal">Submit New Complaint</CardTitle>
              <CardDescription className="text-civix-dark-brown/70 dark:text-civix-sandal/70">
                Report an issue in your community. All fields marked with * are required.
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
                    placeholder="Brief description of the issue"
                    className="border-civix-warm-beige dark:border-gray-600"
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
                    placeholder="Provide detailed information about the issue..."
                    className="border-civix-warm-beige dark:border-gray-600 min-h-32"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-civix-dark-brown dark:text-civix-sandal">
                    Category *
                  </Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger className="border-civix-warm-beige dark:border-gray-600">
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
                    placeholder="Street address or landmark"
                    className="border-civix-warm-beige dark:border-gray-600"
                    required
                  />
                </div>

                {/* Map Coordinates (Optional) */}
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
                      placeholder="e.g., 40.7128"
                      className="border-civix-warm-beige dark:border-gray-600"
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
                      placeholder="e.g., -74.0060"
                      className="border-civix-warm-beige dark:border-gray-600"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label className="text-civix-dark-brown dark:text-civix-sandal">
                    Upload Photo (Optional)
                  </Label>
                  
                  {!previewUrl ? (
                    <div className="border-2 border-dashed border-civix-warm-beige dark:border-gray-600 rounded-lg p-4 sm:p-8 text-center hover:border-civix-civic-green dark:hover:border-civix-civic-green transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        id="file-upload"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer block w-full h-full">
                        <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-civix-dark-brown/40 dark:text-civix-sandal/40" />
                        <p className="text-sm sm:text-base text-civix-dark-brown dark:text-civix-sandal mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs sm:text-sm text-civix-dark-brown/60 dark:text-civix-sandal/60">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border-2 border-civix-civic-green bg-black/5 flex items-center justify-center p-2 min-h-[150px] max-w-full">
                        <img src={previewUrl} alt="Preview" className="max-w-full max-h-64 object-contain" />
                        <button
                          type="button"
                          onClick={removeFile}
                          title="Remove image"
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {uploadedFile && (
                        <p className="text-xs text-civix-dark-brown/60 dark:text-civix-sandal/60">
                          📎 {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeFile}
                        className="border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove Image
                      </Button>
                    </div>
                  )}
                </div>

                {/* Submit buttons */}
                <div className="flex items-center space-x-4 pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Complaint
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setView('list');
                    }}
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
      </div>
    </div>
  );
}
