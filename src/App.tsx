import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import UploadPage from "./pages/UploadPage";
import AlbumsPage from "./pages/AlbumsPage";
import FavoritesPage from "./pages/FavoritesPage";
import AIStudioPage from "./pages/AIStudioPage";
import ImageEditorPage from "./pages/ImageEditorPage";
import TrashPage from "./pages/TrashPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import SharedItemPage from "./pages/SharedItemPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/ai-studio" element={<AIStudioPage />} />
            <Route path="/image-editor" element={<ImageEditorPage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/share/:type/:token" element={<SharedItemPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
