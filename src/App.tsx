import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WorkshopDashboard from "./pages/WorkshopDashboard";
import CreateWorkshop from "./pages/CreateWorkshop";
import JoinWorkshop from "./pages/JoinWorkshop";
import BoardView from "./pages/BoardView";
import FacilitatorControl from "./pages/FacilitatorControl";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<WorkshopDashboard />} />
          <Route path="/create-workshop" element={<CreateWorkshop />} />
          <Route path="/create-workshop/:id" element={<CreateWorkshop />} />
          <Route path="/join" element={<JoinWorkshop />} />
          <Route path="/board/:boardId" element={<BoardView />} />
          <Route path="/facilitator/:workshopId" element={<FacilitatorControl />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
