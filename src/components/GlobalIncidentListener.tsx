import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function GlobalIncidentListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const handleVote = async (incidentId: string, voteType: 'up' | 'down') => {
      try {
        // @ts-ignore
        const { error } = await supabase.rpc('vote_incident', {
          p_incident_id: incidentId,
          p_user_id: user.id,
          p_vote_type: voteType,
        });
        if (error) throw error;
        toast.success(voteType === 'up' ? 'VOTE RECORDED: TRUE' : 'VOTE RECORDED: FALSE');
      } catch (err: any) {
        toast.error(err.message?.toUpperCase() || 'FAILED TO RECORD VOTE');
      }
    };

    const sub = supabase.channel('global-incidents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        const inc = payload.new;
        if (inc.reported_by === user.id) return; // Don't show to the person who reported it

        toast.custom((t) => (
          <div className="bg-white border-2 border-primary shadow-xl p-4 w-80 space-y-3 uppercase tracking-widest text-primary font-black rounded-lg font-sans">
            <div className="flex items-center gap-2 border-b-2 border-primary/10 pb-2">
              <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
              <div className="text-[10px]">COMMUNITY VALIDATION REQUIRED</div>
            </div>
            <div className="text-xs leading-tight">
              <span className="text-red-500">{inc.type}</span> REPORTED NEAR <span className="text-blue-600">{inc.location_name || 'THIS SECTOR'}</span>
            </div>
            <div className="text-[9px] text-primary/60 italic">IS THIS INCIDENT REAL? 3 VOTES VALIDATES OR REMOVES IT.</div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => { handleVote(inc.id, 'up'); toast.dismiss(t); }}
                className="flex-1 bg-green-50 hover:bg-green-100 border-2 border-green-500 text-green-700 py-2 flex items-center justify-center gap-2 active:scale-95 transition-all text-[10px]"
              >
                <ThumbsUp className="h-3 w-3" /> TRUE
              </button>
              <button 
                onClick={() => { handleVote(inc.id, 'down'); toast.dismiss(t); }}
                className="flex-1 bg-red-50 hover:bg-red-100 border-2 border-red-500 text-red-700 py-2 flex items-center justify-center gap-2 active:scale-95 transition-all text-[10px]"
              >
                <ThumbsDown className="h-3 w-3" /> FALSE
              </button>
            </div>
            <button onClick={() => toast.dismiss(t)} className="w-full text-center text-[8px] text-primary/30 hover:text-primary transition-colors mt-1">DISMISS ALERT</button>
          </div>
        ), { duration: 30000, id: `incident-${inc.id}` });
      })
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, [user]);

  return null;
}
