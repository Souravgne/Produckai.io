import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, ArrowLeft, CheckCircle, Plus, X, Tag } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../lib/supabase';

// Sample suggested themes based on common product areas
const suggestedThemesByCategory: Record<string, string[]> = {
  default: ['Onboarding', 'Performance', 'User Experience', 'Integrations', 'Reporting', 'API Stability'],
  ai: ['AI Accuracy', 'Model Training', 'Prompt Engineering', 'Response Time', 'Data Privacy', 'Integrations'],
  analytics: ['Data Visualization', 'Report Generation', 'Data Import', 'Dashboard Performance', 'Filtering', 'Exports'],
  crm: ['Contact Management', 'Pipeline View', 'Email Integration', 'Mobile Experience', 'Reporting', 'Automation'],
  marketing: ['Campaign Management', 'Analytics', 'Email Templates', 'Automation', 'Social Integration', 'Landing Pages'],
  developer: ['API Documentation', 'SDK Stability', 'Developer Experience', 'Authentication', 'Rate Limits', 'Webhooks']
};

export default function ProductThemesStep() {
  const navigate = useNavigate();
  const { completeStep } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [productDescription, setProductDescription] = useState('');
  const [suggestedThemes, setSuggestedThemes] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [customTheme, setCustomTheme] = useState('');
  const [productAreaId, setProductAreaId] = useState<string | null>(null);

  useEffect(() => {
    // Load product description from previous step
    const loadProductDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get the product area
        const { data: productAreas } = await supabase
          .from('product_areas')
          .select('id, name, description')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (productAreas && productAreas.length > 0) {
          setProductDescription(productAreas[0].description || productAreas[0].name || '');
          setProductAreaId(productAreas[0].id);
          
          // Generate suggested themes based on product description
          generateSuggestedThemes(productAreas[0].description || productAreas[0].name || '');
        }
      } catch (error) {
        console.error('Error loading product details:', error);
      }
    };

    loadProductDetails();
  }, []);

  const generateSuggestedThemes = (description: string) => {
    // Simple keyword matching to suggest relevant themes
    const lowerDescription = description.toLowerCase();
    
    if (lowerDescription.includes('ai') || lowerDescription.includes('machine learning') || lowerDescription.includes('ml')) {
      setSuggestedThemes(suggestedThemesByCategory.ai);
    } else if (lowerDescription.includes('analytics') || lowerDescription.includes('dashboard') || lowerDescription.includes('report')) {
      setSuggestedThemes(suggestedThemesByCategory.analytics);
    } else if (lowerDescription.includes('crm') || lowerDescription.includes('customer relationship')) {
      setSuggestedThemes(suggestedThemesByCategory.crm);
    } else if (lowerDescription.includes('marketing') || lowerDescription.includes('campaign')) {
      setSuggestedThemes(suggestedThemesByCategory.marketing);
    } else if (lowerDescription.includes('api') || lowerDescription.includes('developer') || lowerDescription.includes('sdk')) {
      setSuggestedThemes(suggestedThemesByCategory.developer);
    } else {
      setSuggestedThemes(suggestedThemesByCategory.default);
    }
  };

  const handleThemeToggle = (theme: string) => {
    setSelectedThemes(prev => 
      prev.includes(theme) 
        ? prev.filter(t => t !== theme) 
        : [...prev, theme]
    );
  };

  const handleAddCustomTheme = () => {
    if (!customTheme.trim()) return;
    
    // Add custom theme if it doesn't already exist
    if (!selectedThemes.includes(customTheme.trim())) {
      setSelectedThemes(prev => [...prev, customTheme.trim()]);
    }
    
    setCustomTheme('');
  };

  const handleUpdateProductDescription = () => {
    navigate('/onboarding/product-details');
  };

  const handleContinue = async () => {
    if (selectedThemes.length === 0) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create themes for the product area
      if (productAreaId) {
        // Create all themes in a batch
        const themesToCreate = selectedThemes.map(theme => ({
          name: theme,
          description: `Feedback related to ${theme.toLowerCase()}`,
          product_area_id: productAreaId,
          created_by: user.id,
          priority_score: 50, // Default medium priority
          status: 'active',
          is_auto_generated: false
        }));

        const { error } = await supabase
          .from('themes')
          .insert(themesToCreate);

        if (error) throw error;
      }

      await completeStep('product_themes');
      navigate('/onboarding/data-sources');
    } catch (error) {
      console.error('Error saving themes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00A4B8] text-white flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <span className="font-medium text-[#00A4B8]">Profile</span>
        </div>
        <div className="h-1 w-16 bg-[#00A4B8] rounded-full"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00A4B8] text-white flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
          <span className="font-medium text-[#00A4B8]">Product</span>
        </div>
        <div className="h-1 w-16 bg-[#00A4B8] rounded-full"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#00A4B8] text-white flex items-center justify-center">
            3
          </div>
          <span className="font-medium text-[#00A4B8]">Data Sources</span>
        </div>
      </div>

      <div className="text-center mb-10">
        <Layers className="w-16 h-16 text-[#00A4B8] mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Let's identify your product's focus areas
        </h1>
        <p className="text-lg text-gray-600">
          We've suggested themes based on your product description. These help ProduckAI organize insights and surface relevant feedback.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm mb-8">
        <div className="space-y-6">
          {/* Product description reminder */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">Your Product</h3>
                <p className="text-gray-600 mt-1">{productDescription || 'No product description provided'}</p>
              </div>
              <button
                onClick={handleUpdateProductDescription}
                className="text-[#00A4B8] hover:text-[#008a9a] text-sm"
              >
                Want to update your product description?
              </button>
            </div>
          </div>

          {/* Suggested Themes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suggested Themes
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {suggestedThemes.map((theme) => (
                <div
                  key={theme}
                  onClick={() => handleThemeToggle(theme)}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedThemes.includes(theme)
                      ? 'border-[#00A4B8] bg-[#00A4B8]/5'
                      : 'border-gray-200 hover:border-[#00A4B8]/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{theme}</span>
                  </div>
                  {selectedThemes.includes(theme) && (
                    <CheckCircle className="w-5 h-5 text-[#00A4B8]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Theme Entry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Custom Theme
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                  placeholder="e.g., AI Test Agent"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-[#00A4B8] focus:border-[#00A4B8]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customTheme.trim()) {
                      e.preventDefault();
                      handleAddCustomTheme();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleAddCustomTheme}
                disabled={!customTheme.trim()}
                className="px-4 py-2 bg-[#00A4B8] text-white rounded-lg hover:bg-[#008a9a] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add
              </button>
            </div>
          </div>

          {/* Selected Themes */}
          {selectedThemes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Themes ({selectedThemes.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedThemes.map((theme) => (
                  <div
                    key={`selected-${theme}`}
                    className="bg-[#00A4B8]/5 text-[#00A4B8] px-3 py-1.5 rounded-full flex items-center gap-1.5"
                  >
                    <Tag className="w-4 h-4" />
                    <span>{theme}</span>
                    <button
                      onClick={() => handleThemeToggle(theme)}
                      className="text-[#00A4B8] hover:text-[#008a9a] ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => navigate('/onboarding/product-details')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={selectedThemes.length === 0 || loading}
          className="px-6 py-3 bg-[#00A4B8] text-white rounded-lg text-lg font-semibold hover:bg-[#008a9a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? 'Saving...' : 'Next'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}