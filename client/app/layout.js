import { Geist } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Schedulr – Easy Scheduling Ahead",
  description: "A modern scheduling tool inspired by Calendly",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-white text-gray-900">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '8px',
              background: '#333',
              color: '#fff',
              fontSize: '14px',
              padding: '12px 20px',
            },
          }}
        />
      </body>
    </html>
  );
}
