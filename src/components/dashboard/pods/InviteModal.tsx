import React from "react";
import { supabase } from "../../../lib/supabase";
import { useDataContext } from "../../../contexts/DataContext";
import CryptoJS from "crypto-js";

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

const InviteModal: React.FC<{
  users?: User[];
  onInvite: (userId: string) => void;
  onClose: () => void;
}> = ({ onClose }) => {
  const [fetchedUsers, setFetchedUsers] = React.useState<User[] | null>(null);
  const [invitedUsers, setInvitedUsers] = React.useState<string[]>([]);
  const { profile } = useDataContext();

  //fetch users with matching email domain
  React.useEffect(() => {
    const fetchUsersByDomain = async () => {
      if (profile?.email) {
        const loggedInUserDomain = profile.email.split("@")[1];
        const { data, error } = await supabase
          .from("user_profiles_view")
          .select("*")
          .ilike("email", `%@${loggedInUserDomain}`);
        if (error) {
          console.error("Error fetching users:", error);
          setFetchedUsers([]);
          return;
        }

        const filteredUsers = data.filter(
          (user: User) => user.email !== profile.email
        );
        setFetchedUsers(filteredUsers);
      }
    };
    fetchUsersByDomain();
  }, [profile?.email]);

  // escape button to close modal
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const SECRET_KEY = "sourav";
  function encryptEmail(email: string): string {
    try {
      const ciphertext = CryptoJS.AES.encrypt(email, SECRET_KEY).toString();
      return encodeURIComponent(ciphertext); // To make it URL-safe
    } catch (error) {
      console.error("Error encrypting email:", error);
      return "";
    }
  }

  // Use Supabase or your email provider to send this link

  const handleInvite = async (user: User) => {
    const userName = user?.full_name || "there";
    const company = user.email.split("@")[1].split(".")[0];
    const encryptedEmail = encryptEmail(user.email);
    const inviteLink = `https://produckai.io/change-password?token=${encryptedEmail}`;

    try {
      const res = await fetch("/template/invite.html");
      const htmlTemplate = await res.text();
      const formattedHtml = htmlTemplate
        .replace(/\${userName}/g, userName)
        .replace(/\${company}/g, company)
        .replace(/\${resetLink}/g, inviteLink)
        .replace(/\${currentYear}/g, new Date().getFullYear().toString());
      console.log(formattedHtml);
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "send-mail",
        {
          body: {
            to: user.email,
            subject: "You're Invited to Join!",
            html: formattedHtml,
          },
        }
      );

      if (fnError) {
        console.error(
          "Failed to send invite email:",
          fnError.message || fnError
        );
      } else {
        setInvitedUsers((prev) => [...prev, user.id]);
        console.log("Email sent successfully:", fnData);
      }
    } catch (error) {
      console.error(
        "Unexpected error during email function call:",
        (error as Error).message || error
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">Invite Team</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {fetchedUsers === null ? (
            <p className="text-center text-sm text-gray-500">
              Loading users...
            </p>
          ) : fetchedUsers.length > 0 ? (
            <ul
              className={`space-y-4 ${
                fetchedUsers.length > 5 ? "max-h-72 overflow-y-auto pr-2" : ""
              }`}
            >
              {fetchedUsers.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-xl shadow-sm hover:bg-gray-100 transition"
                >
                  <div>
                    <p className="text-base font-medium text-gray-900">
                      {user.full_name || "No Name"}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(user)}
                    className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                      invitedUsers.includes(user.id)
                        ? "bg-green-600 text-white cursor-default"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                    disabled={invitedUsers.includes(user.id)}
                  >
                    {invitedUsers.includes(user.id) ? "Invited" : "Invite"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-gray-500">
              No users available to invite.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
