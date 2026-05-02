import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Settings from "./pages/Settings.tsx";
import AccountPage from "./pages/settings/Account.tsx";
import GeneralPage from "./pages/settings/General.tsx";
import VoicePage from "./pages/settings/Voice.tsx";
import { AIPage, NotificationsPage, AboutPage, SupportPage } from "./pages/settings/Stub.tsx";
import Notes from "./pages/Notes.tsx";
import PastPapers from "./pages/PastPapers.tsx";
import Quiz from "./pages/Quiz.tsx";
import GroupChat from "./pages/GroupChat.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/account" element={<AccountPage />} />
          <Route path="/settings/general" element={<GeneralPage />} />
          <Route path="/settings/voice" element={<VoicePage />} />
          <Route path="/settings/ai" element={<AIPage />} />
          <Route path="/settings/notifications" element={<NotificationsPage />} />
          <Route path="/settings/about" element={<AboutPage />} />
          <Route path="/settings/support" element={<SupportPage />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/past-papers" element={<PastPapers />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/group-chat" element={<GroupChat />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
