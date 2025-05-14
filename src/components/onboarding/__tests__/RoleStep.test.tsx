import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RoleStep from '../RoleStep';
import { OnboardingProvider } from '../../../contexts/OnboardingContext';
import { supabase } from '../../../lib/supabase';

const mockNavigate = vi.fn();
const mockCompleteStep = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    completeStep: mockCompleteStep,
  }),
}));

describe('RoleStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
  });

  it('renders role selection options', () => {
    render(
      <BrowserRouter>
        <OnboardingProvider>
          <RoleStep />
        </OnboardingProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/What's your role\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Product Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/Product Marketer/i)).toBeInTheDocument();
  });

  it('enables continue button only when role is selected', () => {
    render(
      <BrowserRouter>
        <OnboardingProvider>
          <RoleStep />
        </OnboardingProvider>
      </BrowserRouter>
    );

    const continueButton = screen.getByText(/Continue/i);
    expect(continueButton).toBeDisabled();

    fireEvent.click(screen.getByText(/Product Manager/i));
    expect(continueButton).toBeEnabled();
  });

  it('shows other role input when "Other" is selected', () => {
    render(
      <BrowserRouter>
        <OnboardingProvider>
          <RoleStep />
        </OnboardingProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText(/Other/i));
    expect(screen.getByPlaceholderText(/Enter your role/i)).toBeInTheDocument();
  });

  it('handles role update and navigation', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    } as any);

    render(
      <BrowserRouter>
        <OnboardingProvider>
          <RoleStep />
        </OnboardingProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText(/Product Manager/i));
    fireEvent.click(screen.getByText(/Continue/i));

    await waitFor(() => {
      expect(mockCompleteStep).toHaveBeenCalledWith('role');
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding/integrations');
    });
  });

  it('handles errors during role update', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(supabase.from).mockReturnValue({
      upsert: vi.fn().mockRejectedValue(new Error('Test error')),
    } as any);

    render(
      <BrowserRouter>
        <OnboardingProvider>
          <RoleStep />
        </OnboardingProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText(/Product Manager/i));
    fireEvent.click(screen.getByText(/Continue/i));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating role:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });
});