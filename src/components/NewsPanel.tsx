import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface NewsItem {
  id: string;
  content: string;
  created_at: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const NewsPanel: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('id, content, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error && data) setNews(data);
    };
    fetchLatest();

    const channel = supabase
      .channel('news-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        fetchLatest();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!news || news.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>News</CardTitle>
        <CardDescription>Latest updates and announcements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {news.map((item) => (
            <div key={item.id} className="border-b last:border-b-0 pb-4 last:pb-0">
              <div className="text-xs text-muted-foreground mb-2">
                {formatDate(item.created_at)}
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{item.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsPanel;
