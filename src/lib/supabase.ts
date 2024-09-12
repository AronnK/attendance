import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://yhswphbrkswdtltewpur.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloc3dwaGJya3N3ZHRsdGV3cHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUzNTM0MDAsImV4cCI6MjA0MDkyOTQwMH0.j3h7N962hZXHBr7xePWfYfgtVnDuYQTIa1FR40nHVCM";

export const supabase = createClient(supabaseUrl, supabaseKey);
