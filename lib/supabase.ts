// Supabase client for The Intend. Uses AsyncStorage so the login session
// persists between app launches. These are public client keys, safe to ship.
//
// The custom `lock` is important on React Native: Supabase's default lock relies
// on navigator.locks (a browser API) which does not exist on a phone and makes
// session calls hang forever. This passthrough lock avoids that.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xpjtyjjbgvemwwpnxtad.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwanR5ampiZ3ZlbXd3cG54dGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MTY0MzIsImV4cCI6MjA5ODI5MjQzMn0.tw6B1MeRp6JbI-FHxp4sbNuR5_Ob9NxSTGD_UcOLCRY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
