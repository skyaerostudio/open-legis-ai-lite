import { createClient as createSupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Enhanced Supabase client configured for real-time subscriptions
export function createRealtimeClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  });
}

// Helper function to create a processing status subscription
export function subscribeToProcessingStatus(
  versionId: string,
  onStatusChange: (status: any) => void
): RealtimeChannel {
  const supabase = createRealtimeClient();
  
  const channel = supabase
    .channel('processing-status')
    .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'document_versions',
          filter: `id=eq.${versionId}`
        },
        (payload) => {
          console.log('Processing status change:', payload);
          onStatusChange(payload.new);
        })
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });
    
  return channel;
}

// Helper function to subscribe to multiple version statuses
export function subscribeToMultipleVersions(
  versionIds: string[],
  onStatusChange: (versionId: string, status: any) => void
): RealtimeChannel {
  const supabase = createRealtimeClient();
  
  // Create filter for multiple version IDs
  const filterCondition = versionIds.map(id => `id=eq.${id}`).join(',');
  
  const channel = supabase
    .channel('multiple-processing-status')
    .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'document_versions',
          filter: `id=in.(${versionIds.join(',')})`
        },
        (payload) => {
          console.log('Multiple versions status change:', payload);
          onStatusChange(payload.new.id, payload.new);
        })
    .subscribe((status) => {
      console.log('Multiple versions subscription status:', status);
    });
    
  return channel;
}

// Helper function to safely unsubscribe from channels
export async function unsubscribeChannel(channel: RealtimeChannel): Promise<void> {
  try {
    await channel.unsubscribe();
    console.log('Channel unsubscribed successfully');
  } catch (error) {
    console.error('Error unsubscribing from channel:', error);
  }
}

// Helper function to check connection status
export function getRealtimeStatus() {
  const supabase = createRealtimeClient();
  return supabase.realtime.channels.map(channel => ({
    topic: channel.topic,
    state: channel.state
  }));
}