import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, MessageSquare, Settings, LogOut, Menu, X, BarChart2, Layers, TrendingUp, FolderKanban, Database, Upload, Plug, GitPullRequest } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Logo from '../Logo';

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    description: 'Overview of your product insights'
  },
  { 
    name: 'Trends', 
    href: '/dashboard/trends', 
    icon: TrendingUp,
    description: 'Analyze feedback trends over time'
  },
  { 
    name: 'Themes', 
    href: '/dashboard/themes', 
    icon: FolderKanban,
    description: 'View and manage feedback themes'
  },
  { 
    name: 'Insights', 
    href: '/dashboard/insights', 
    icon: MessageSquare,
    description: 'Browse all customer feedback insights'
  },
  { 
    name: 'Workspaces', 
    href: '/dashboard/pods', 
    icon: Users,
    description: 'Collaborate with your team in shared spaces'
  },
  { 
    name: 'Roadmap', 
    href: '/dashboard/roadmap', 
    icon: GitPullRequest,
    description: 'View and manage product roadmap'
  }
];

const dataSourcesNavigation = [
  {
    name: 'Data Sources',
    href: '/dashboard/data-sources',
    icon: Database,
    description: 'Manage your feedback data sources'
  },
  {
    name: 'Manual Upload',
    href: '/dashboard/data-sources/manual',
    icon: Upload,
    description: 'Upload CSV files with customer feedback'
  },
  {
    name: 'Integrations',
    href: '/dashboard/data-sources/integrations',
    icon: Plug,
    description: 'Connect to business apps like Slack, HubSpot'
  },
];

const secondaryNavigation = [
  { 
    name: 'Settings', 
    href: '/dashboard/settings', 
    icon: Settings,
    description: 'Manage your preferences'
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Check if there's a redirect path from onboarding
    const redirectPath = localStorage.getItem('integration_redirect_path');
    if (redirectPath) {
      // Only redirect if we're coming from onboarding
      const fromOnboarding = sessionStorage.getItem('from_onboarding');
      if (fromOnboarding === 'true') {
        // Get the selected integration
        const selectedIntegration = localStorage.getItem('selected_integration');
        
        // Navigate to the integration page
        navigate(redirectPath);
        
        // Clear the redirect path and flag
        localStorage.removeItem('integration_redirect_path');
        sessionStorage.removeItem('from_onboarding');
        
        // If we have a selected integration, we can use it to pre-select or highlight
        // the integration on the destination page
        if (selectedIntegration) {
          // Store it in sessionStorage for the destination page to use
          sessionStorage.setItem('highlight_integration', selectedIntegration);
          
          // Clean up after a delay
          setTimeout(() => {
            sessionStorage.removeItem('highlight_integration');
          }, 5000);
        }
      }
    }
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 bg-gray-800/60 backdrop-blur-sm z-40 lg:hidden ${
          sidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar - Optimized width for laptops */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50 lg:z-0 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center h-14 px-4 border-b border-gray-200">
          <button
            onClick={() => handleNavigation('/dashboard')}
            className="flex items-center space-x-1"
          >
            <Logo size="sm" className="w-10 h-10" />
            <span className="text-lg font-bold text-gray-900">ProduckAI</span>
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 lg:hidden ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto">
          <nav className="flex-1 px-2 py-3">
            <div className="space-y-0.5">
              {navigation.map((item) => {
                const active = isActive(item.href);
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    className={`group flex w-full items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-[#00A0C1]/5 text-[#00A0C1]'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 mr-3 ${
                        active ? 'text-[#00A0C1]' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    <div className="text-left">
                      <span className="font-medium">{item.name}</span>
                      {active && (
                        <p className="text-xs text-[#00A0C1] mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Data Sources
              </h3>
              <div className="mt-1 space-y-0.5">
                {dataSourcesNavigation.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={`group flex w-full items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-[#00A0C1]/5 text-[#00A0C1]'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon
                        className={`w-5 h-5 mr-3 ${
                          active ? 'text-[#00A0C1]' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      <div className="text-left">
                        <span className="font-medium">{item.name}</span>
                        {active && (
                          <p className="text-xs text-[#00A0C1] mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Settings & Tools
              </h3>
              <div className="mt-1 space-y-0.5">
                {secondaryNavigation.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={`group flex w-full items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? 'bg-[#00A0C1]/5 text-[#00A0C1]'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon
                        className={`w-5 h-5 mr-3 ${
                          active ? 'text-[#00A0C1]' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      <div className="text-left">
                        <span className="font-medium">{item.name}</span>
                        {active && (
                          <p className="text-xs text-[#00A0C1] mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="p-3 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content - Optimized for laptops */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center h-14 bg-white border-b border-gray-200 px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="p-6">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}