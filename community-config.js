/*
  Community settings.

  While `url` and `anonKey` are empty the community feature is switched OFF: the Community tab and
  the Sign in button stay hidden and the site looks exactly as it did before.

  To switch it on, create a free Supabase project and paste its two values here
  (Supabase dashboard > Project Settings > API). Full steps are in COMMUNITY_SETUP.md.

  Both values are meant to be public: the "anon" key only allows what the database rules in
  supabase/schema.sql allow. NEVER paste the "service_role" key anywhere in this repository.
*/
window.CWWHY_COMMUNITY = {
  url: "https://dofhjwnsazmbbkdxmhhl.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZmhqd25zYXptYmJrZHhtaGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0Mzk0MjUsImV4cCI6MjEwODAxNTQyNX0.idd_MQ_aRGJJfyHku8LObOnOgpn3VV1T0reggmc8j1Q",
  /* Set to true only after you have switched on Google sign-in in Supabase (see COMMUNITY_SETUP.md).
     While false, people sign in with an emailed code and the Google button is hidden. */
  google: false
};
