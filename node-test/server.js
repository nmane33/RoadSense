// server.js - Create admin user
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Debug: Check what's loaded
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_SERVICE_KEY:", process.env.SUPABASE_SERVICE_KEY ? "Loaded" : "Missing");

// Use SERVICE KEY — not anon key
const supabase = createClient(
  process.env.SUPABASE_URL || "https://sigekuvayyrtapqrkbcs.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpZ2VrdXZheXlydGFwcXJrYmNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjEwNjUzMSwiZXhwIjoyMDg3NjgyNTMxfQ.rof5NnL8xPT0SmRSyCsK1Ne5bkisz_uCCUv1HNaYIck"
);

async function createAdmin() {
  // Step 1 — Create the auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: "admin2@roadsense.com",
    password: "123123",
    email_confirm: true   // auto confirm, no email needed
  });

  if (authError) {
    console.log("❌ Auth error:", authError.message);
    return;
  }

  console.log("✅ Auth user created:", authData.user.id);

  // Step 2 — Set role to admin in profiles table
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", authData.user.id);

  if (profileError) {
    console.log("❌ Profile error:", profileError.message);
    return;
  }

  console.log("✅ Role set to admin!");
  console.log("✅ Admin ready!");
  console.log("   Email:    admin@roadsense.com");
  console.log("   Password: Admin@1234");
}

createAdmin();