import { createClient } from '@supabase/supabase-js'

// Prefer environment variables configured using Vite `VITE_` prefix
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://your-supabase-project-url.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Check if we have real credentials or need to use a mock
const isPlaceholder = (url, key) => !url || url.includes('your-supabase-project-url') || !key || key.includes('your-supabase-anon-key');

// Create a mock Supabase client if using placeholders
const createMockClient = () => {
  // In-memory storage for mock data
  const mockStorage = {
    users: [],
    notes: [],
    files: []
  };

  return {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        // For testing, always succeed with test@example.com
        if (email === 'test@example.com' && password === 'password123') {
          const user = { id: 'test-user-id', email };
          mockStorage.users.push(user);
          return { data: { session: { user } }, error: null };
        }
        return { data: null, error: { message: 'Invalid credentials' } };
      },
      signUp: async ({ email, password }) => {
        const user = { id: `user-${Date.now()}`, email };
        mockStorage.users.push(user);
        return { data: { user }, error: null };
      },
      signOut: async () => {
        return { error: null };
      },
      getSession: async () => {
        // Return mock session if we have a test user
        const testUser = mockStorage.users.find(u => u.email === 'test@example.com');
        return { 
          data: { 
            session: testUser ? { user: testUser } : null 
          } 
        };
      },
      onAuthStateChange: (callback) => {
        // Return mock subscription
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    from: (table) => ({
      select: (columns) => ({
        eq: (field, value) => {
          // Mock database queries
          if (table === 'notes') {
            return Promise.resolve({ data: mockStorage.notes.filter(n => n[field] === value), error: null });
          }
          if (table === 'files') {
            return Promise.resolve({ data: mockStorage.files.filter(f => f[field] === value), error: null });
          }
          return Promise.resolve({ data: [], error: null });
        },
        single: () => {
          if (table === 'notes') {
            const note = mockStorage.notes.find(n => n.room_id === value);
            return Promise.resolve({ data: note || null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }
      }),
      insert: (data) => {
        if (table === 'notes') {
          mockStorage.notes.push(data);
        }
        if (table === 'files') {
          mockStorage.files.push(data);
        }
        return Promise.resolve({ data, error: null });
      },
      upsert: (data) => {
        if (table === 'notes') {
          const index = mockStorage.notes.findIndex(n => n.room_id === data.room_id);
          if (index >= 0) {
            mockStorage.notes[index] = { ...mockStorage.notes[index], ...data };
          } else {
            mockStorage.notes.push(data);
          }
        }
        return Promise.resolve({ data, error: null });
      }
    }),
    storage: {
      from: (bucket) => ({
        upload: (path, file) => {
          return Promise.resolve({ data: { path }, error: null });
        },
        download: (path) => {
          // Return a mock blob
          return Promise.resolve({ 
            data: new Blob(['mock file content'], { type: 'text/plain' }), 
            error: null 
          });
        }
      })
    }
  };
};

// Export real client or mock based on credentials
export const supabase = isPlaceholder(supabaseUrl, supabaseAnonKey) 
  ? createMockClient() 
  : createClient(supabaseUrl, supabaseAnonKey);

// Export helper flag so app logic can detect whether cloud sync will work or not
export const supabaseIsMock = isPlaceholder(supabaseUrl, supabaseAnonKey);