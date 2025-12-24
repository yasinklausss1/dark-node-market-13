import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ForumCategory } from '@/hooks/useForum';
import { 
  MessageSquare, 
  Star, 
  HelpCircle, 
  Megaphone, 
  ShoppingBag,
  PlusCircle,
  TrendingUp,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Star,
  HelpCircle,
  Megaphone,
  ShoppingBag,
};

interface ForumSidebarProps {
  categories: ForumCategory[];
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  onCreatePost: () => void;
  isLoggedIn: boolean;
}

export const ForumSidebar: React.FC<ForumSidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onCreatePost,
  isLoggedIn
}) => {
  return (
    <div className="space-y-4">
      {/* Create Post Button */}
      {isLoggedIn && (
        <Button 
          className="w-full" 
          size="lg"
          onClick={onCreatePost}
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Post erstellen
        </Button>
      )}

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Kategorien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <button
            onClick={() => onSelectCategory(null)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
              selectedCategory === null 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-muted"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Alle Posts
          </button>
          {categories.map(category => {
            const IconComponent = ICON_MAP[category.icon] || MessageSquare;
            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  selectedCategory === category.id 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
              >
                <IconComponent 
                  className="h-4 w-4" 
                  style={{ color: selectedCategory === category.id ? undefined : category.color }}
                />
                {category.name}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Community Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Community
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Willkommen im Oracle Forum! Diskutiere mit anderen Nutzern, 
            teile Erfahrungen und hilf der Community.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Badge variant="secondary">Respektvoller Umgang</Badge>
            <Badge variant="secondary">Keine Spam-Posts</Badge>
            <Badge variant="secondary">Konstruktive Kritik</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Forum-Regeln</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>1. Sei respektvoll gegenüber anderen Nutzern</p>
          <p>2. Kein Spam oder irrelevante Werbung</p>
          <p>3. Keine illegalen Inhalte teilen</p>
          <p>4. Nutze aussagekräftige Titel</p>
          <p>5. Konstruktive Diskussionen führen</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForumSidebar;
