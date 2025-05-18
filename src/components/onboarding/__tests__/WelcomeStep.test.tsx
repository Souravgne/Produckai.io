import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WelcomeStep from '../WelcomeStep';
import { OnboardingProvider } from '../../../contexts/OnboardingContext';

const mockNavigate = vi.fn();
const mockCompleteStep = vi.fn();
const mockSkipOnboarding = vi.fn();

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
    skipOnboarding: mockSkipOnboarding,
  }),
}));

describe('WelcomeStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message and buttons', () => {
    render(
      <BrowserRouter>
        <OnboardingProvider>
          <WelcomeStep />
        </OnboardingProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Welcome to AI Product Copilot/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Setup/i)).toBeInTheDocument();
    expect(screen.getByText(/Skip Onboarding/i)).toBeInTheDocument();
  });

  it('calls completeStep and navigates when clicking Start Setup', async () => {
    render(
      <BrowserRouter>
        <OnboardingProvider>
          <WelcomeStep />
        </OnboardingProvider>
      </BrowserRouter>
    );

    const startButton = screen.getByText(/Start Setup/i);
    await fireEvent.click(startButton);

    expect(mockCompleteStep).toHaveBeenCalledWith('welcome');
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding/role');
  });

  it('calls skipOnboarding when clicking Skip Onboarding', async () => {
    render(
      <BrowserRouter>
        <OnboardingProvider>
          <WelcomeStep />
        </OnboardingProvider>
      </BrowserRouter>
    );

    const skipButton = screen.getByText(/Skip Onboarding/i);
    await fireEvent.click(skipButton);

    expect(mockSkipOnboarding).toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCompleteStep.mockRejectedValueOnce(new Error('Test error'));

    render(
      <BrowserRouter>
        <OnboardingProvider>
          <WelcomeStep />
        </OnboardingProvider>
      </BrowserRouter>
    );

    const startButton = screen.getByText(/Start Setup/i);
    await fireEvent.click(startButton);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error starting setup:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});