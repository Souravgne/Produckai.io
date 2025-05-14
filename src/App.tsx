import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart2,
  MessageSquare,
  GitPullRequest,
  Calendar,
  Users,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import LoginPage from './components/LoginPage';
import OnboardingLayout from './components/onboarding/OnboardingLayout';
import WelcomeStep from './components/onboarding/WelcomeStep';
import RoleStep from './components/onboarding/RoleStep';
import IntegrationSetup from './components/onboarding/IntegrationSetup';
import PodSetup from './components/onboarding/PodSetup';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './components/dashboard/DashboardHome';
import ProductAreas from './components/dashboard/ProductAreas';
import Themes from './components/dashboard/Themes';
import InsightsPage from './components/dashboard/insights/InsightsPage';
import PodsPage from './components/dashboard/pods/PodsPage';
import WorkspaceDetail from './components/dashboard/pods/WorkspaceDetail';
import DataSourcesPage from './components/dashboard/data-sources/DataSourcesPage';
import ManualUploadPage from './components/dashboard/data-sources/ManualUploadPage';
import IntegrationsPage from './components/dashboard/data-sources/IntegrationsPage';
import SettingsPage from './components/dashboard/settings/SettingsPage';
import TrendsPage from './components/dashboard/trends/TrendsPage';
import ProfileSetupStep from './components/onboarding/ProfileSetupStep';
import ProductDetailsStep from './components/onboarding/ProductDetailsStep';
import ProductThemesStep from './components/onboarding/ProductThemesStep';
import DataSourcesStep from './components/onboarding/DataSourcesStep';
import SignupModal from './components/SignupModal';
import { supabase } from './lib/supabase';
import Logo from './components/Logo';

function LandingPage() {
  const navigate = useNavigate();
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pod-spaces');

  const features = {
    'pod-spaces': {
      title: 'Workspaces',
      description: 'Create dedicated spaces for your product teams to collaborate on feature decisions.',
      image: 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      bulletPoints: [
        'Organize insights by product area',
        'Control access per team or stakeholder',
        'Track progress with visual boards'
      ]
    },
    'ai-clustering': {
      title: 'AI Clustering',
      description: 'Our AI automatically groups related feedback to reveal patterns and themes.',
      image: 'https://images.pexels.com/photos/7567434/pexels-photo-7567434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      bulletPoints: [
        'Semantic clustering of similar requests',
        'Volume tracking per theme',
        'Automatic tagging and categorization'
      ]
    },
    'insight-scoring': {
      title: 'Insight Scoring',
      description: 'Prioritize features based on impact, sentiment, and customer value.',
      image: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
      bulletPoints: [
        'Score by Annual Contract Value',
        'Sentiment analysis per feature',
        'Urgency and frequency tracking'
      ]
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="px-6 py-4 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Logo size="md" className="w-50 h-50" />
            <span className="text-2xl font-bold"><span style={{ color: "#00A4B8" }}>Produck</span><span className="text-purple-600">AI</span></span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-[#00A4B8] transition-colors">Features</a>
            <a href="#metrics" className="text-gray-600 hover:text-[#00A4B8] transition-colors">Metrics</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSignupModal(true)}
              className="px-4 py-2 bg-[#00A4B8] text-white rounded-lg hover:bg-[#008a9a] transition-colors"
            >
              Sign Up
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-[#00A4B8] text-white rounded-lg hover:bg-[#008a9a] transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-gray-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2 text-center md:text-left">
              <div className="inline-block mb-4 px-3 py-1 bg-purple-100 rounded-full">
                <span className="text-sm font-medium text-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 13L12 16L15 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Now in private beta
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Your <span className="text-purple-600">AI</span> product copilot for <span className="text-purple-600">insight-driven</span> roadmaps
              </h1>
              
              <p className="text-xl text-gray-600 mb-8">
                Surface themes, prioritize features, and align your team — all in one space.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 max-w-md mx-auto md:mx-0">
                <button 
                  onClick={() => setShowSignupModal(true)}
                  className="w-full sm:w-auto whitespace-nowrap px-6 py-3 bg-[#00A4B8] text-white rounded-lg font-medium hover:bg-[#008a9a] transition-colors flex items-center justify-center gap-2"
                >
                  Request Demo
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="md:w-1/2">
              <img 
                src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                alt="Product teams collaborating"
                className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stop Guessing Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Stop guessing what to build next
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Let <span className="text-purple-600">AI</span> help you make confident product decisions backed by data
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-[#00A4B8]/10 rounded-lg flex items-center justify-center text-[#00A4B8] mb-6 mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Unified Feedback</h3>
              <p className="text-gray-600">
                Automatically gather customer feedback from Slack, Zoom, CRM, emails, and support tickets into a single source of truth.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-6 mx-auto">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3"><span className="text-purple-600">AI</span>-Powered Analysis</h3>
              <p className="text-gray-600">
                Identify key themes, sentiment, and priorities across all customer feedback without manual tagging or sorting.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-[#00A4B8]/10 rounded-lg flex items-center justify-center text-[#00A4B8] mb-6 mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Collaborative Decisions</h3>
              <p className="text-gray-600">
                Share insights with cross-functional teams in workspaces to align on product priorities and roadmap decisions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <div id="metrics" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            Loved by product teams
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 bg-[#00A4B8]/10 rounded-full flex items-center justify-center text-[#00A4B8] mb-6 mx-auto">
                <BarChart2 className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Reduction</h3>
              <p className="text-gray-600">in Feedback Processing Time</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-6 mx-auto">
                <GitPullRequest className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Faster</h3>
              <p className="text-gray-600">Time to Product Decisions</p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 bg-[#00A4B8]/10 rounded-full flex items-center justify-center text-[#00A4B8] mb-6 mx-auto">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Increase</h3>
              <p className="text-gray-600">in Customer-Driven Features</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            How <span style={{ color: "#00A4B8" }}>Produck</span><span className="text-purple-600">AI</span> works
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            See how our platform transforms customer feedback into product decisions
          </p>
          
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="flex border-b border-gray-200">
              {Object.keys(features).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-6 py-4 text-sm font-medium ${
                    activeTab === key
                      ? 'text-[#00A4B8] border-b-2 border-[#00A4B8] -mb-px'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {features[key as keyof typeof features].title}
                </button>
              ))}
            </div>
            
            <div className="p-6 md:p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {features[activeTab as keyof typeof features].title}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {features[activeTab as keyof typeof features].description}
                  </p>
                  
                  <ul className="space-y-4">
                    {features[activeTab as keyof typeof features].bulletPoints.map((point, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#00A4B8]/10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-[#00A4B8]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src={features[activeTab as keyof typeof features].image} 
                    alt={features[activeTab as keyof typeof features].title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to transform your product feedback?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join the beta today and be among the first to experience the future of product management.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => setShowSignupModal(true)}
              className="px-8 py-3 bg-[#00A4B8] text-white rounded-lg font-semibold hover:bg-[#008a9a] transition-colors"
            >
              Request Demo
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Logo size="sm" className="text-white" />
                <span className="text-xl font-bold">ProduckAI</span>
              </div>
              <p className="text-gray-400 mb-4">
                AI-native assistant for product managers.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.318 35.318 0 011.823 6.475 8.4 8.4 0 01-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 01-3.655 5.715z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">PRODUCT</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Roadmap</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>© 2025 ProduckAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Signup Modal */}
      {showSignupModal && (
        <SignupModal onClose={() => setShowSignupModal(false)} />
      )}
    </div>
  );
}

// Wrapper component to access onboarding context
function AppRoutes() {
  const { user, loading } = useAuth();
  const { hasCompletedOnboarding } = useOnboarding();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A4B8]"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes - accessible to everyone */}
      <Route
        path="/"
        element={
          user ? <Navigate to="/dashboard" replace /> : <LandingPage />
        }
      />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes - require authentication */}
      <Route
        path="/onboarding/*"
        element={
          loading ? null : !user ? (
            <Navigate to="/login" replace />
          ) : hasCompletedOnboarding ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <OnboardingLayout>
              <Routes>
                <Route path="welcome" element={<WelcomeStep />} />
                <Route path="role" element={<RoleStep />} />
                <Route path="integrations" element={<IntegrationSetup />} />
                <Route path="pod-setup" element={<PodSetup />} />
                
                {/* New onboarding flow */}
                <Route path="profile-setup" element={<ProfileSetupStep />} />
                <Route path="product-details" element={<ProductDetailsStep />} />
                <Route path="product-themes" element={<ProductThemesStep />} />
                <Route path="data-sources" element={<DataSourcesStep />} />
                
                <Route path="*" element={<Navigate to="welcome" replace />} />
              </Routes>
            </OnboardingLayout>
          )
        }
      />
      <Route
        path="/dashboard/*"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : (
            <DashboardLayout>
              <Routes>
                <Route index element={<DashboardHome />} />
                <Route path="trends" element={<TrendsPage />} />
                <Route path="product-areas" element={<ProductAreas />} />
                <Route path="themes" element={<Themes />} />
                <Route path="insights" element={<InsightsPage />} />
                <Route path="pods" element={<PodsPage />} />
                <Route path="pods/:id" element={<WorkspaceDetail />} />
                <Route path="data-sources" element={<DataSourcesPage />} />
                <Route
                  path="data-sources/manual"
                  element={<ManualUploadPage />}
                />
                <Route
                  path="data-sources/integrations"
                  element={<IntegrationsPage />}
                />
                <Route path="settings" element={<SettingsPage />} />
              </Routes>
            </DashboardLayout>
          )
        }
      />
      {/* Catch all route - redirect to landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <OnboardingProvider>
      <AppRoutes />
    </OnboardingProvider>
  );
}

export default App;