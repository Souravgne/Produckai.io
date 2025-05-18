import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Save, ArrowRight, AlertCircle } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../lib/supabase';

interface PodMember {
  email: string;
  role: 'member' | 'viewer';
}

export default function PodSetup() {
  const navigate = useNavigate();
  const { completeStep } = useOnboarding();
  const [podName, setPodName] = useState('');
  const [podDescription, setPodDescription] = useState('');
  const [members, setMembers] = useState<PodMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'member' | 'viewer'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMember = () => {
    if (!newMemberEmail.trim()) return;
    
    if (members.some(m => m.email === newMemberEmail.trim())) {
      setError('This email has already been added');
      return;
    }
    
    setMembers([...members, { email: newMemberEmail.trim(), role: newMemberRole }]);
    setNewMemberEmail('');
    setNewMemberRole('member');
    setError(null);
  };

  const removeMember = (email: string) => {
    setMembers(members.filter(m => m.email !== email));
  };

  const handleSave = async () => {
    if (!podName.trim()) {
      setError('Workspace name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching user session...');
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.session) throw new Error('No active session');

      console.log('Fetching user data...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('User not found');

      console.log('Creating workspace...', {
        name: podName.trim(),
        description: podDescription.trim(),
        created_by: user.id
      });

      // Create the pod
      const { data: pod, error: podError } = await supabase
        .from('pods')
        .insert({
          name: podName.trim(),
          description: podDescription.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (podError) {
        console.error('Workspace creation error:', podError);
        throw new Error(`Failed to create workspace: ${podError.message}`);
      }
      if (!pod) throw new Error('Workspace creation failed: No workspace returned');

      console.log('Workspace created successfully:', pod);

      // Add creator as owner
      console.log('Creating owner membership...');
      const { error: ownerError } = await supabase
        .from('pod_members')
        .insert({
          pod_id: pod.id,
          user_id: user.id,
          role: 'owner'
        });

      if (ownerError) {
        console.error('Owner membership error:', ownerError);
        throw new Error(`Failed to create owner membership: ${ownerError.message}`);
      }

      console.log('Owner membership created successfully');

      // For now, just log the members that would be invited
      if (members.length > 0) {
        console.log('Members to be invited:', members);
      }

      await completeStep('pod_setup');
      navigate('/dashboard');
    } catch (error) {
      console.error('Workspace setup error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <Users className="w-16 h-16 text-teal-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Create Your Workspace
        </h1>
        <p className="text-lg text-gray-600">
          Set up a collaborative space to share insights and make decisions with your team.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm mb-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              value={podName}
              onChange={(e) => setPodName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., Product Team, Mobile Squad"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={podDescription}
              onChange={(e) => setPodDescription(e.target.value)}
              placeholder="What does this team focus on?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Invite Team Members
            </label>
            
            <div className="flex gap-3 mb-4">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as 'member' | 'viewer')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={addMember}
                disabled={!newMemberEmail}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {members.length > 0 && (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="text-gray-900">{member.email}</span>
                      <span className="ml-2 text-sm text-gray-500 capitalize">
                        ({member.role})
                      </span>
                    </div>
                    <button
                      onClick={() => removeMember(member.email)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleSave}
          disabled={loading || !podName.trim()}
          className="w-full max-w-md px-8 py-4 bg-teal-500 text-white rounded-xl text-lg font-semibold hover:bg-teal-600 transition-all transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            'Creating Workspace...'
          ) : (
            <>
              <Save className="w-5 h-5" />
              Create Workspace
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}