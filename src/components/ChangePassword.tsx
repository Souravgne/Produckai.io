import React, { useState } from "react";
import CryptoJS from "crypto-js";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase"; // your initialized client
import Logo from "../components/Logo"; // Assuming Logo is a component in your project

const SECRET_KEY = "product-ai-secret";

function decryptEmail(token: string): string {
  try {
    const decodedToken = decodeURIComponent(token);
    const bytes = CryptoJS.AES.decrypt(decodedToken, SECRET_KEY);
    const decryptedEmail = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedEmail) throw new Error("Decryption failed. Empty result.");

    return decryptedEmail;
  } catch (error) {
    console.error("Error decrypting email:", error);
    return "";
  }
}

function ChangePasswordPage() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("Invalid or expired link.");
        return;
      }
      const email = decryptEmail(token);
      if (!email) {
        setStatus("Invalid or expired link.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error("Error changing password:", error);
        setStatus("Failed to change password. Please try again.");
      } else {
        setStatus("Password changed successfully");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setStatus("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex items-center justify-center mb-8">
          <Logo size="lg" className="w-32 h-32" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">
          Change Password
        </h2>
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-4">
        <div className="bg-white py-6 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-700"
              >
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="new-password"
                  type="password"
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#00A0C1] focus:border-[#00A0C1] sm:text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00A0C1] hover:bg-[#008a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00A0C1]"
              >
                Change Password
              </button>
            </div>
          </form>
          {status && (
            <div className="mt-6 text-center">
              {status === "Password changed successfully" ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-700">
                  {status}{" "}
                  <a
                    href="/login"
                    className="text-[#00A0C1] hover:underline font-medium"
                  >
                    Log in
                  </a>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
                  {status}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChangePasswordPage;
