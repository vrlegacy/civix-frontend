import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { authAPI } from "@/lib/api";

type NominatimReverseResponse = {
  address: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    county?: string;
    state?: string;
    [key: string]: any;
  };
  [key: string]: any;
};

// Base URL handled by Axios config in api.ts

interface SignUpPageProps {
  onNavigate: (page: 'landing' | 'login' | 'dashboard') => void;
  onSignUp: (userData: { fullName: string; email: string; location?: string }) => void;
}

export default function SignUpPage({ onNavigate, onSignUp }: SignUpPageProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    location: '',
    password: '',
    confirmPassword: '',
    role: 'citizen'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState<{ city?: string; lat?: number; lon?: number }>({});
  const [showMap, setShowMap] = useState(false);
  const [mapPosition, setMapPosition] = useState<[number, number] | null>(null);
  // Custom marker icon for Leaflet (fixes missing marker icon issue)
  const markerIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41],
  });

  function LocationSelector() {
    useMapEvents({
      click(e: L.LeafletMouseEvent) {
        setMapPosition([e.latlng.lat, e.latlng.lng]);
        // Reverse geocode to get city/location name
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=en`)
          .then((res: Response) => res.json())
          .then((data: NominatimReverseResponse) => {
        const locationName =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.suburb ||
          data.address.county ||
          data.address.state ||
          "Unknown Location";
        setFormData((prev: typeof formData) => ({ ...prev, location: locationName }));
        setDetectedInfo({ city: locationName, lat: e.latlng.lat, lon: e.latlng.lng });
        setShowMap(false);
          });
      },
    });
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value
    }));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setDetecting(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`
          );
          
          if (!response.ok) throw new Error('Failed to fetch location data.');

          const data = await response.json();
          console.log("Full address data from API:", data.address);

          const locationName = 
            data.address.city || 
            data.address.town || 
            data.address.village || 
            data.address.suburb || 
            data.address.county || 
            data.address.state || 
            "Unknown Location";

          setFormData(prev => ({ ...prev, location: locationName }));
          setDetectedInfo({ city: locationName, lat: latitude, lon: longitude });

        } catch (error: any) {
          console.error("Error fetching location:", error);
          setError("Unable to auto-detect your location. Please enter it manually.");
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error.message);
        setError("Location access was denied. Please allow access or enter it manually.");
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await authAPI.register({
        name: formData.fullName,
        email: formData.email,
        location: formData.location,
        password: formData.password,
        role: formData.role,
        latitude: detectedInfo.lat,
        longitude: detectedInfo.lon,
      });

      console.log('Signup successful:', data);
      setIsSubmitted(true);

    } catch (err: any) {
      console.error('Signup failed:', err);
      let friendlyMessage = 'Signup failed. Please try again.';
      if (err.response) {
        friendlyMessage = err.response.data?.error || err.response.data?.message || friendlyMessage;
      } else if (err.request || err.message === 'Network Error' || err.name === 'TypeError') {
        friendlyMessage = 'Unable to connect to the server. Please check your internet connection or verify if the backend is running.';
      } else {
        friendlyMessage = err.message || friendlyMessage;
      }
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background and UI */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1727702872022-927491562edb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGNpdmljJTIwcGF0dGVybiUyMHZvdGluZyUyMGRlbW9jcmFjeXxlbnwxfHx8fDE3NTg3MTgzMTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')` }} />
      <div className="absolute inset-0 opacity-95" style={{ background: 'linear-gradient(160deg, #F5DEB3, #EAD8C0)' }} />
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="w-full px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('landing')} className="text-civix-dark-brown hover:bg-civix-dark-brown/10 mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-civix-dark-brown to-civix-civic-green bg-clip-text text-transparent" style={{ fontWeight: '700' }}>Civix</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-4">
          <div className="w-full max-w-2xl">
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
              <CardHeader className="text-center space-y-1 pb-3 p-4 sm:p-6">
                <CardTitle className="text-2xl text-civix-dark-brown" style={{ fontWeight: '700' }}>Create Your Account</CardTitle>
                <CardDescription className="text-sm text-civix-dark-brown/70" style={{ fontWeight: '400' }}>Join Civix and start making change today.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pb-4">
                {!isSubmitted ? (
                  <>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        {/* Row 1: Full Name & Email */}
                        <div className="space-y-1">
                          <Label htmlFor="fullName" className="text-civix-dark-brown text-sm">Full Name</Label>
                          <Input id="fullName" name="fullName" type="text" placeholder="Enter your full name" value={formData.fullName} onChange={handleInputChange} className="border-civix-warm-beige focus:border-civix-civic-green focus:ring-civix-civic-green h-9" required />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="email" className="text-civix-dark-brown text-sm">Email Address</Label>
                          <Input id="email" name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleInputChange} className="border-civix-warm-beige focus:border-civix-civic-green focus:ring-civix-civic-green h-9" required />
                        </div>

                        {/* Row 2: Password & Confirm Password */}
                        <div className="space-y-1">
                          <Label htmlFor="password" className="text-civix-dark-brown text-sm">Password</Label>
                          <Input id="password" name="password" type="password" placeholder="Create a password" value={formData.password} onChange={handleInputChange} className="border-civix-warm-beige focus:border-civix-civic-green focus:ring-civix-civic-green h-9" required />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="confirmPassword" className="text-civix-dark-brown text-sm">Confirm Password</Label>
                          <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleInputChange} className="border-civix-warm-beige focus:border-civix-civic-green focus:ring-civix-civic-green h-9" required />
                        </div>

                        {/* Row 3: Role & Location */}
                        <div className="space-y-1 relative z-20">
                          <Label htmlFor="role" className="text-civix-dark-brown text-sm">Role</Label>
                          <Select value={formData.role} onValueChange={handleRoleChange}>
                            <SelectTrigger className="border-civix-warm-beige focus:border-civix-civic-green focus:ring-civix-civic-green bg-white h-9">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="citizen">Citizen</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="volunteer">Volunteer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 relative">
                          <Label htmlFor="location" className="text-civix-dark-brown text-sm">Location</Label>
                          <div className="flex gap-2">
                            <Input id="location" name="location" type="text" placeholder="City or locate" value={formData.location} onChange={handleInputChange} className="border-civix-warm-beige focus:border-civix-civic-green focus:ring-civix-civic-green flex-1 h-9 text-sm" required readOnly={showMap} />
                            <Button type="button" onClick={handleDetectLocation} disabled={detecting} className="bg-civix-civic-green text-white px-2.5 text-xs h-9">
                              {detecting ? "..." : "Detect"}
                            </Button>
                            <Button type="button" onClick={() => setShowMap(v => !v)} className="bg-civix-dark-brown text-white px-2.5 text-xs h-9">
                              Map
                            </Button>
                          </div>
                          {showMap && (
                            <div className="z-50 mt-1 rounded-lg overflow-hidden border border-civix-warm-beige bg-white p-2 shadow-xl w-full relative md:absolute md:right-0 md:top-full md:w-[320px]">
                              <MapContainer
                                center={mapPosition || [20.5937, 78.9629]} // Center on India by default
                                zoom={5}
                                style={{ height: 180, width: '100%', borderRadius: 4 }}
                                scrollWheelZoom={true}
                              >
                                <TileLayer
                                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <LocationSelector />
                                {mapPosition && <Marker position={mapPosition} icon={markerIcon} />}
                              </MapContainer>
                              <div className="flex justify-end mt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setShowMap(false)} className="text-civix-dark-brown text-xs">Close</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {error && <p className="text-sm text-red-600 text-center mt-2">{error}</p>}
                      
                      <div className="pt-2">
                        <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white py-5 text-base hover:opacity-90 transition-opacity disabled:opacity-50" style={{ fontWeight: '600' }}>
                          {isLoading ? 'Signing Up...' : 'Sign Up'}
                        </Button>
                      </div>
                    </form>
                    <div className="mt-4 text-center space-y-1">
                      <p className="text-civix-dark-brown/70 text-sm">
                        Already have an account?{' '}
                        <button onClick={() => onNavigate('login')} className="text-civix-civic-green hover:underline font-semibold">Login here</button>
                      </p>
                      <p className="text-xs text-civix-dark-brown/60 px-4">By signing up, you agree to Civix's Terms & Privacy Policy.</p>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center space-y-6">
                    <div className="bg-civix-civic-green/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-civix-civic-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-civix-dark-brown">Verify Your Email</h3>
                      <p className="text-sm text-civix-dark-brown/80 px-4">
                        A verification link has been sent to <span className="font-semibold text-civix-dark-brown">{formData.email}</span>. Please check your inbox and verify your email to activate your account.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button 
                        onClick={() => onNavigate('login')}
                        className="w-full bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white py-5 text-base hover:opacity-90 font-semibold"
                      >
                        Proceed to Login
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}