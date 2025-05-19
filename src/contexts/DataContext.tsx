import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase"; // adjust based on your project

interface DataContextProps {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  loadUserProfile: () => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        ...profileData,
        email: user.email,
      });
    } catch (error) {
      console.error("Error loading user profile:", error);
      setError("Failed to load user profile. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile(); // Automatically load on mount
  }, []);

  return (
    <DataContext.Provider value={{ profile, loading, error, loadUserProfile }}>
      {children}
    </DataContext.Provider>
  );
};

// Hook for consuming context
export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};
