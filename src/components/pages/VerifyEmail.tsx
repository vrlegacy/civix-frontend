import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("Verification token is missing. Please check your link.");
        return;
      }

      try {
        const response = await authAPI.verifyEmail(token);
        if (response.success) {
          setStatus("success");
          toast.success("Verification successful!");
          // Automatically redirect to login after 5 seconds
          const timer = setTimeout(() => {
            navigate("/login");
          }, 5000);
          return () => clearTimeout(timer);
        } else {
          setStatus("error");
          setErrorMessage(response.message || "Failed to verify email.");
        }
      } catch (error: any) {
        setStatus("error");
        setErrorMessage(
          error.response?.data?.message ||
          error.message ||
          "An error occurred during verification."
        );
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center items-center px-6 py-12">
      {/* Background with gradient overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1604420022249-87e637722439?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXZpYyUyMGVuZ2FnZW1lbnQlMjBoYW5kcyUyMHJhaXNlZCUyMHZvdGluZyUyMGRlbW9jcmFjeXxlbnwxfHx8fDE3NTg3MTgzMTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`
        }}
      />
      <div 
        className="absolute inset-0 opacity-95"
        style={{
          background: 'linear-gradient(180deg, #F5DEB3, #E6CBA8)'
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-civix-dark-brown to-civix-civic-green bg-clip-text text-transparent mb-4">
              Civix
            </h1>
            <CardTitle className="text-2xl text-civix-dark-brown font-bold">
              Account Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6 text-center">
            {status === "loading" && (
              <div className="space-y-4">
                <Loader2 className="w-16 h-16 animate-spin text-civix-civic-green mx-auto" />
                <CardDescription className="text-base text-civix-dark-brown/80">
                  Verifying your email authenticity. Please wait...
                </CardDescription>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-6">
                <CheckCircle className="w-16 h-16 text-civix-civic-green mx-auto" />
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-civix-dark-brown">
                    Email Verified!
                  </p>
                  <CardDescription className="text-sm text-civix-dark-brown/80 px-2">
                    Your account has been fully created and verified. You will be redirected to the login page shortly, or click below.
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => navigate("/login")}
                  className="bg-gradient-to-r from-civix-dark-brown to-civix-civic-green text-white w-full py-5 font-semibold"
                >
                  Proceed to Login
                </Button>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-6">
                <AlertCircle className="w-16 h-16 text-red-600 mx-auto" />
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-red-600">
                    Verification Failed
                  </p>
                  <CardDescription className="text-sm text-civix-dark-brown/80 px-4">
                    {errorMessage}
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => navigate("/signup")}
                  className="bg-civix-dark-brown text-white w-full py-5 font-semibold"
                >
                  Back to Sign Up
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
