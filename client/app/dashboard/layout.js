import Sidebar from './Sidebar';

export const metadata = {
  title: 'Schedulr Dashboard',
  description: 'Manage your events and availability',
};

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#f8f8f8] overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
