import React from "react";
import { supabase } from "../../../lib/supabase";
import { useDataContext } from "../../../contexts/DataContext";

const baseUrl = import.meta.env.BASE_URL;

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

  console.log(profile?.email);
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
      console.log("first", data);
      if (data && profile?.email) {
        console.log("two", data);
        const loggedInUserDomain = profile.email.split("@")[1];
        const filteredUsers = data.filter((user: User) => {
          const userDomain = user.email?.split("@")[1];
          return (
            userDomain === loggedInUserDomain && user.email != profile.email
          );
        });
        setFetchedUsers(filteredUsers);
      }
    };

    fetchAllUsers();
  }, [profile?.email]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  // const SECRET_KEY = "your-very-secret-key"; // Keep it safe, e.g. in env

  // const createInviteToken = (userId: string, company: string) => {
  //   const payload = {
  //     userId,
  //     company,
  //     issuedAt: Date.now(),
  //   };
  //   return jwt.sign(payload, SECRET_KEY, { expiresIn: "7d" }); // Valid for 7 days
  // };
  // const token = createInviteToken(profile?.id, "hello") || "hello";
  const token = "hello sourav";
  const inviteLink = `${baseUrl}/accept-invite?token=${token}`;

  const handleInvite = async (user: User) => {
    const company = "Your Company";
    const currentYear = new Date().getFullYear();
    const userName = profile?.full_name || "there";

    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>You're Invited!</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f9fafb;
              padding: 20px;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            }
            .btn {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              font-size: 12px;
              color: #888;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You're Invited 🎉</h1>
            <p>Hi <strong>${userName}</strong>,</p>
            <p>
              You've been invited to join <strong>${company}</strong> on our
              platform. Click the button below to accept the invitation and get
              started.
            </p>
            <a class="btn" href="${inviteLink}" target="_blank">Accept Invitation</a>
            <p>If you have any questions, feel free to reply to this email.</p>
            <div class="footer">
              &copy; ${currentYear} ${company}. All rights reserved.
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const response = await fetch(
        "https://smtp-nrw5.vercel.app/api/send-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: user.email,
            subject: "You're Invited to Join!",
            htmlContent: htmlTemplate,
          }),
        }
      );

      if (response.ok) {
        setInvitedUsers((prev) => [...prev, user.id]);
        console.log("email sent successfully", response);
      } else {
        console.error("Failed to send invite email");
      }
    } catch (error) {
      console.error("Error sending invite email:", error);
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
