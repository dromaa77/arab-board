import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { TextSettingsProvider } from "@/hooks/useTextSettings";
import { useOfflineData } from "@/hooks/useOfflineData";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Quiz from "./pages/Quiz";
import Bookmarks from "./pages/Bookmarks";
import Statistics from "./pages/Statistics";
import Results from "./pages/Results";
import Review from "./pages/Review";
import ReviewQuiz from "./pages/ReviewQuiz";
import ImportData from "./pages/ImportData";
import NotFound from "./pages/NotFound";
import { Loader2, WifiOff } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

// Offline indicator component
function OfflineIndicator() {
  const { isOnline } = useOfflineData();
  
  if (isOnline) return null;
  
  return (
    <div className="fixed bottom-4 left-4 z-50 bg-warning text-warning-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium animate-fade-in">
      <WifiOff className="h-4 w-4" />
      Offline Mode
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TextSettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <OfflineIndicator />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Home />} />
                <Route path="/quiz/:chapterId" element={<Quiz />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/results/:chapterId" element={<Results />} />
                <Route path="/review" element={<Review />} />
                <Route path="/review-quiz" element={<ReviewQuiz />} />
                <Route path="/import" element={<ImportData />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </TextSettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
