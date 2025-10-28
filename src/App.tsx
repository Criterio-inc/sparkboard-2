import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthWrapper } from "@/components/AuthWrapper";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WorkshopDashboard from "./pages/WorkshopDashboard";
import CreateWorkshop from "./pages/CreateWorkshop";
import JoinWorkshop from "./pages/JoinWorkshop";
import BoardView from "./pages/BoardView";
import FacilitatorControl from "./pages/FacilitatorControl";
import FacilitatorSettings from "./pages/FacilitatorSettings";
import Upgrade from "./pages/Upgrade";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancelled from "./pages/PaymentCancelled";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/join" element={<JoinWorkshop />} />
            <Route path="/board/:workshopId/:boardId" element={<BoardView />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<AuthWrapper><WorkshopDashboard /></AuthWrapper>} />
            <Route path="/create-workshop" element={<AuthWrapper><CreateWorkshop /></AuthWrapper>} />
            <Route path="/create-workshop/:id" element={<AuthWrapper><CreateWorkshop /></AuthWrapper>} />
            <Route path="/facilitator/:workshopId" element={<AuthWrapper><FacilitatorControl /></AuthWrapper>} />
            <Route path="/settings" element={<AuthWrapper><FacilitatorSettings /></AuthWrapper>} />
            <Route path="/upgrade" element={<AuthWrapper><Upgrade /></AuthWrapper>} />
            <Route path="/payment-success" element={<AuthWrapper><PaymentSuccess /></AuthWrapper>} />
            <Route path="/payment-cancelled" element={<AuthWrapper><PaymentCancelled /></AuthWrapper>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
