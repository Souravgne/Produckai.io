import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../lib/supabase';

export default function ProductDetailsStep() {
  const navigate = useNavigate();
  const { completeStep } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [productDetails, setProductDetails] = useState({
    name: '',
    description: '',
    segments: [] as string[]
  });

  const handleSegmentToggle = (segment: string) => {
    setProductDetails(prev => {
      const segments = prev.segments.includes(segment)
        ? prev.segments.filter(s => s !== segment)
        : [...prev.segments, segment];
      return { ...prev, segments };
    });
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create a product area
      if (productDetails.name) {
        const { error } = await supabase
          .from('product_areas')
          .insert({
            user_id: user.id,
            name: productDetails.name,
            description: productDetails.description
          });

        if (error) throw error;
      }

      // Store segments in user metadata if needed
      // This is just an example - you might want to store this elsewhere
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          customer_segments: productDetails.segments,
          onboarding_completed_product: true
        }
      });

      if (metadataError) throw metadataError;

      await completeStep('product_details');
      navigate('/onboarding/product-themes');
    } catch (error) {
      console.error('Error saving product details:', error);
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
            2
          </div>
          <span className="font-medium text-[#00A4B8]">Product</span>
        </div>
        <div className="h-1 w-16 bg-gray-200 rounded-full"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
            3
          </div>
          <span className="font-medium text-gray-400">Data Sources</span>
        </div>
      </div>

      <div className="text-center mb-10">
        <Layers className="w-16 h-16 text-[#00A4B8] mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tell us about your product
        </h1>
        <p className="text-lg text-gray-600">
          This helps us organize your feedback and insights more effectively.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm mb-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={productDetails.name}
              onChange={(e) => setProductDetails({ ...productDetails, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A4B8] focus:border-transparent"
              placeholder="e.g., Marketing Analytics Platform"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Description
            </label>
            <textarea
              value={productDetails.description}
              onChange={(e) => setProductDetails({ ...productDetails, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A4B8] focus:border-transparent"
              placeholder="e.g., AI-powered QA automation platform for businesses"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Segments (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['SMBs', 'Enterprises', 'Product Teams', 'Developers', 'Marketers', 'Sales Teams'].map((segment) => (
                <div 
                  key={segment}
                  onClick={() => handleSegmentToggle(segment)}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    productDetails.segments.includes(segment)
                      ? 'border-[#00A4B8] bg-[#00A4B8]/5'
                      : 'border-gray-200 hover:border-[#00A4B8]/50'
                  }`}
                >
                  <span className="font-medium">{segment}</span>
                  {productDetails.segments.includes(segment) && (
                    <CheckCircle className="w-5 h-5 text-[#00A4B8]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => navigate('/onboarding/profile-setup')}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!productDetails.name || loading}
          className="px-6 py-3 bg-[#00A4B8] text-white rounded-lg text-lg font-semibold hover:bg-[#008a9a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? 'Saving...' : 'Next'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}