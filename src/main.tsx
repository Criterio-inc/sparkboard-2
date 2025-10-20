import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from '@clerk/clerk-react';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to .env');
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider 
    publishableKey={clerkPubKey}
    appearance={{
      variables: {
        colorPrimary: '#19305C',
        colorBackground: '#F3DADF',
        colorText: '#03122F',
      },
      elements: {
        formButtonPrimary: 'bg-gradient-to-r from-[#F1916D] to-[#AE7DAC]',
        card: 'shadow-2xl',
      }
    }}
  >
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </ClerkProvider>
);
