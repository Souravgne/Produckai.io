import { serve } from "https://deno.land/std/http/server.ts";
import { readFileStr } from "https://deno.land/std/fs/mod.ts";

serve(async (req) => {
  const { name, email, company, inviteLink } = await req.json();

  const template = await readFileStr("./template  /invite.html");

  const htmlContent = template
    .replace("{{name}}", name)
    .replace("{{company}}", company)
    .replace("{{inviteLink}}", inviteLink);

  const response = await fetch("https://smtp-nrw5.vercel.app/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: email,
      subject: "You're Invited!",
      htmlContent,
    }),
  });

  return new Response("Email sent!", { status: 200 });
});
