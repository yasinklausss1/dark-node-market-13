import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface NewsItem {
  content: string;
  created_at: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const NewsPanel: React.FC = () => {
  const [news, setNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from('news')
        .select('content, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error) setNews(data);
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

  if (!news) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Neuigkeiten</CardTitle>
          <CardDescription className="text-xs">{formatDate(news.created_at)}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
          <ReactMarkdown>{news.content}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsPanel;