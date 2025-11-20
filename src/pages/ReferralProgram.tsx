import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Gift, Users, TrendingUp, Share2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Header } from '@/components/Header';

interface ReferralStats {
  total_referrals: number;
  total_credits_earned: number;
  recent_referrals: Array<{
    username: string;
    created_at: string;
    credits_awarded: number;
  }>;
}

const ReferralProgram = () => {
  const { user, profile } = useAuth();
  const [referralLink, setReferralLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    total_credits_earned: 0,
    recent_referrals: [],
  });

  useEffect(() => {
    if (user && profile) {
      loadReferralData();
    }
  }, [user, profile]);

  const loadReferralData = async () => {
    try {
      setLoading(true);

      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Generate or get referral code with proper auth header
      const { data, error } = await supabase.functions.invoke('generate-referral-code', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (!data || !data.link) {
        throw new Error('Invalid response from server');
      }

      setReferralLink(data.link);

      // Load stats
      const { data: rewards, error: rewardsError } = await supabase
        .from('referral_rewards')
        .select(`
          credits_awarded,
          created_at,
          referred_id
        `)
        .eq('referrer_id', user!.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (rewardsError) {
        console.error('Rewards error:', rewardsError);
        throw rewardsError;
      }

      const total_referrals = rewards?.length || 0;
      const total_credits_earned = rewards?.reduce((sum, r) => sum + r.credits_awarded, 0) || 0;

      // Get usernames for recent referrals
      const recentWithUsernames = await Promise.all(
        (rewards || []).slice(0, 5).map(async (reward) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', reward.referred_id)
            .maybeSingle();

          return {
            username: profile?.username || 'Unknown',
            created_at: reward.created_at,
            credits_awarded: reward.credits_awarded,
          };
        })
      );

      setStats({
        total_referrals,
        total_credits_earned,
        recent_referrals: recentWithUsernames,
      });
    } catch (error: any) {
      console.error('Error loading referral data:', error);
      toast.error(error.message || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const message = `Join me on Oracle Market! 🎁 Sign up using my link and we both get 3 free credits: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaTelegram = () => {
    const message = `Join me on Oracle Market! 🎁 Sign up using my link and we both get 3 free credits: ${referralLink}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = 'Join me on Oracle Market!';
    const body = `Hey!\n\nI'm inviting you to join Oracle Market. Use my referral link to sign up and we'll both get 3 free credits!\n\n${referralLink}\n\nSee you there!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Referral Program</h1>
          <p className="text-muted-foreground">
            Invite friends and earn credits together! Both you and your friend get 3 credits when they sign up.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_referrals}</div>
              <p className="text-xs text-muted-foreground">Successfully invited users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_credits_earned}</div>
              <p className="text-xs text-muted-foreground">From referral rewards</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reward Per Invite</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3 Credits</div>
              <p className="text-xs text-muted-foreground">For you and your friend</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>Share this link with friends to invite them</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 px-3 py-2 bg-muted rounded-md text-sm"
                />
                <Button onClick={copyToClipboard} size="icon">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Share via:</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={shareViaWhatsApp} className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" onClick={shareViaTelegram} className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Telegram
                  </Button>
                  <Button variant="outline" size="sm" onClick={shareViaEmail} className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
              <CardDescription>Let others scan this to get your link</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={referralLink} size={200} />
              </div>
            </CardContent>
          </Card>
        </div>

        {stats.recent_referrals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Referrals</CardTitle>
              <CardDescription>Your latest successful invitations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recent_referrals.map((referral, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{referral.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">
                        +{referral.credits_awarded} credits
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReferralProgram;
