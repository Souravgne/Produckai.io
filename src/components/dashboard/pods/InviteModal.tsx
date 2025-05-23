import React from "react";
import { supabase } from "../../../lib/supabase";
import CryptoJS from "crypto-js";

const InviteModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const [email, setEmail] = React.useState<string>("");
  const [isInvited, setIsInvited] = React.useState<boolean>(false);

  // escape button to close modal
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const SECRET_KEY = "product-ai-secret";
  function encryptEmail(email: string): string {
    try {
      const ciphertext = CryptoJS.AES.encrypt(email, SECRET_KEY).toString();
      return encodeURIComponent(ciphertext); // To make it URL-safe
    } catch (error) {
      console.error("Error encrypting email:", error);
      return "";
    }
  }

  const handleInvite = async () => {
    if (!email) {
      alert("Please enter a valid email address.");
      return;
    }

    const encryptedEmail = encryptEmail(email);
    const inviteLink = `https://produckai.io/change-password?token=${encryptedEmail}`;
    console.log(inviteLink);
    try {
      const res = await fetch("/template/invite.html");
      const htmlTemplate = await res.text();
      const formattedHtml = htmlTemplate
        .replace(/\${userName}/g, "there")
        .replace(/\${company}/g, email.split("@")[1].split(".")[0])
        .replace(/\${resetLink}/g, inviteLink)
        .replace(/\${currentYear}/g, new Date().getFullYear().toString());
      console.log(formattedHtml);
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "send-mail",
        {
          body: {
            to: email,
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
        setIsInvited(true);
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
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleInvite}
              className={`w-full px-4 py-2 text-sm rounded-lg transition font-medium ${
                isInvited
                  ? "bg-green-600 text-white cursor-default"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              disabled={isInvited}
            >
              {isInvited ? "Invited" : "Send Invite"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
