import React from "react";
import { supabase } from "../../../lib/supabase";

interface User {
  id: string;
  full_name: string | null;
  email: string;
}

const InviteModal: React.FC<{
  users?: User[];
  onInvite: (userId: string) => void;
  onClose: () => void;
}> = ({ users = [], onInvite, onClose }) => {
  const [fetchedUsers, setFetchedUsers] = React.useState<User[] | null>(null);

  React.useEffect(() => {
    const fetchAllUsers = async () => {
      const { data, error } = await supabase
        .from("user_profiles_view")
        .select("*");

      if (error) {
        console.error("Error fetching users:", error);
        setFetchedUsers([]);
        return;
      }

      if (data) {
        setFetchedUsers(data);
      }
    };

    fetchAllUsers();
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
                    onClick={() => onInvite(user.id)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Invite
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
